# 0006 - Auth security hardening before password reset

**Status:** Accepted
**Date:** 2026-10-28
**Decider:** Amas Movsisyan

## Context

Before implementing password reset, a security review of the auth layer identified
six issues that could be exploited in production or would make password reset
unsafe to build on. The review was triggered by an external AI code audit that
found the following problems:

1. Login error messages leaked account status (active vs. inactive vs. unknown).
2. CSRF protection was not enforced on LoginView / RegisterView / LogoutView /
   VerifyEmailView / ResendVerificationView, because DRF sets `csrf_exempt = True`
   on every APIView by default. The `SessionAuthentication` class only enforces
   CSRF for already-authenticated users. For anonymous POSTs (login, register),
   CSRF was effectively off.
3. `validate_password` was called without a user context, so
   `UserAttributeSimilarityValidator` could not compare the password against
   email / username.
4. Display name validation used `\w`, which allows digits and underscores
   anywhere. It did not match the documented rules.
5. Two concurrent registrations with the same email could both pass serializer
   validation and hit a DB IntegrityError, returning a 500 instead of a 400.
6. No rate limiting on public auth endpoints, allowing unlimited brute-force,
   mass registration, and verification email spam.

## Decision

We fix all six issues before building password reset.

**1. Generic login error messages.**
Both session login and JWT login return exactly `"Invalid email or password."`
for every failure mode (unknown email, wrong password, inactive account).
SimpleJWT's default `"No active account found..."` is overridden via
`default_error_messages`.

**2. Explicit CSRF protection.**
All mutating auth endpoints use `@method_decorator(csrf_protect, name='dispatch')`:
RegisterView, LoginView, LogoutView, VerifyEmailView, ResendVerificationView.
JWT endpoints (`token/`, `token/refresh/`, `token/blacklist/`) remain
`csrf_exempt` because React Native clients have no cookie context.
A new `GET /api/auth/csrf/` endpoint sets the `csrftoken` cookie so Angular can
call it at app startup.
`CSRF_TRUSTED_ORIGINS` is set from the env variable `DJANGO_CSRF_TRUSTED_ORIGINS`
(default `http://localhost:4200` in dev).

**3. Password validation with user context.**
`validate_password(password, user=User(...))` is called inside
`RegisterSerializer.validate()` with a constructed user instance. All password
errors are collected and returned together with `password_confirm` errors, so
the user sees every problem in one response.

**4. Strict display name validation.**
Replaced `\w` with `[^\W\d_]+(?:[ \-_][^\W\d_]+)*`. Only Unicode letters
(including Armenian), single spaces, hyphens and underscores between letters.
No digits, no leading/trailing separators, no repeated separators, no 3+ parts.

**5. IntegrityError handling on registration.**
`RegisterView.create()` wraps `perform_create()` in `transaction.atomic()` and
catches `IntegrityError`. If the error string mentions `email` or `username`,
a specific 400 is returned. Unknown IntegrityErrors return a generic 400.
The client never sees a 500 from a race condition.

**6. Rate limiting via DRF ScopedRateThrottle.**
`DEFAULT_THROTTLE_CLASSES = ('rest_framework.throttling.ScopedRateThrottle',)`.
Rates:
- `login`: 10/min (shared between session login and JWT token obtain)
- `register`: 5/hour
- `resend-verification`: 3/hour
- `verify-email`: 20/hour

The cache backend is `LocMemCache` in dev. For production with multiple workers,
this must be replaced with a shared cache (Redis) - one line in `settings.py`.

## Additional guarantees verified by tests

Two guarantees are not fixes per se, but they were verified as part of the
hardening work and are now covered by explicit tests. They protect against
subtle regressions when new endpoints or authentication backends are added.

**G1. JWT endpoints do not accept session cookies.**
The JWT endpoints (`token/`, `token/refresh/`, `token/blacklist/`) only accept
`Authorization: Bearer ...`. A valid `sessionid` cookie alone does not produce
tokens. Verified by `accounts/tests/test_auth_hardening.py::JWTDoesNotAcceptSessionCookieTests`.
If a future change accidentally lets `SessionAuthentication` reach these
endpoints, a CSRF attacker could trigger JWT issuance in the victim's name.
The test guards against that.

**G2. Rate limit counters are per-client IP, not global.**
Two clients with different IPs do not share the throttle counter, and two
clients with the same IP do. Verified by
`accounts/tests/test_auth_hardening.py::ThrottleIsPerClientTests`.
Without this property, an attacker could lock out all users by burning the
global counter from a single IP.

## Test coverage

Before hardening: 25 tests.
After hardening: 88 tests across `accounts/tests/`.

Test modules:
- `test_register.py` — registration flow, required fields, verification email
- `test_login_session.py` — session login, logout, `/me`
- `test_login_jwt.py` — JWT obtain, refresh, blacklist, claims
- `test_verify_email.py` — token-based verification, tampered uid, idempotency
- `test_resend.py` — resend flow, anti-enumeration, already-verified path
- `test_security.py` — generic login errors + password validators
- `test_csrf.py` — CSRF enforcement on mutating endpoints (`enforce_csrf_checks=True`)
- `test_display_name.py` — 24 positive/negative display-name cases
- `test_race_condition.py` — IntegrityError handling via `unittest.mock.patch`
- `test_throttling.py` — per-scope rate limits, shared login counter
- `test_auth_hardening.py` — JWT vs. session cookie isolation, per-IP throttle

The tests prove what they cover; they do not prove the absence of other
vulnerabilities. Further audits remain necessary (see production checklist).

## Rejected Alternatives

- **Custom `SessionAuthentication` subclass that always enforces CSRF:**
  possible, but less obvious than `@csrf_protect`. Django's decorator is the
  documented way to force CSRF on DRF views.
- **`django-ratelimit` for rate limiting:** adds a dependency and a different
  configuration style. DRF's built-in throttle is sufficient for the current
  scale and easily swappable to Redis later.
- **`is_active=False` for unverified users:** already rejected in ADR 0002.
- **Storing a "banned" flag in addition to `is_active`:** not needed yet; the
  generic login error already hides the difference from clients.

## Consequences

- **All login failures are indistinguishable to the client.** Good for security,
  slightly less helpful for users who need to know if their account is locked
  (they must contact support).
- **All mutating auth endpoints require a valid CSRF token.** Angular must call
  `GET /api/auth/csrf/` at startup before any POST. React Native is unaffected.
- **Rate limits are per-IP and per-scope in the Django cache.** Behind a reverse
  proxy, `X-Forwarded-For` must be configured correctly, or all clients share
  the proxy's IP and get throttled together. This is a deployment-time concern.
- **Concurrent registrations return a 400 with a clear message**, not a 500.
- **The password reset feature will inherit all of these protections** (CSRF,
  rate limiting, generic errors, transactional writes).
- **JWT and session authentication are isolated.** Tests guard against future
  changes that accidentally let one leak into the other.

## Production checklist (not blocking local development)

These items must be resolved before public launch:

- Replace `LocMemCache` with a shared cache (Redis) so throttle counters are
  consistent across workers.
- Configure `X-Forwarded-For` handling (or `NUM_PROXIES`) behind the reverse
  proxy so rate limiting uses the real client IP.
- Enable HTTPS: `SECURE_SSL_REDIRECT = True`, `SECURE_HSTS_SECONDS > 0`,
  secure cookies.
- Run `python manage.py check --deploy`.
- Pin exact package versions in `requirements.txt` (currently ranges).
- Verify `SECRET_KEY` is set in production and never the dev fallback.
- Re-run the full test suite in a clean environment (no local state).

## References

- ADR 0002 (email_verified as separate field)
- ADR 0004 (email verification with default_token_generator)
- ADR 0005 (API documentation with drf-spectacular)
- OWASP Top 10: A01 Broken Access Control, A02 Cryptographic Failures,
  A03 Injection, A07 Identification and Authentication Failures