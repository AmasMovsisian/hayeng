# ADR 0007: Password Reset

## Status
Accepted

## Context
Users need a way to regain access when they forget their password. The reset
flow must not leak whether an email address is registered, must resist token
brute-forcing and replay, and must apply the same password policy as
registration. Both web (session) and mobile (JWT) clients share the same
backend endpoints.

The flow is reached from two contexts:
1. A user who is **not logged in** and cannot sign in.
2. A user who **is logged in** on one device but wants to change the password
   (e.g. from another device, or because a session was compromised).

## Decision

### Endpoints
- `POST /api/auth/password-reset/` — accepts `{ "email": "..." }`.
- `POST /api/auth/password-reset-confirm/` — accepts
  `{ "uid", "token", "new_password", "new_password_confirm" }`.

Both endpoints are CSRF-protected and throttled under the `password-reset`
scope (`3/hour`).

### Reset is allowed regardless of authentication state
The reset request endpoint does **not** reject authenticated users. This is
an intentional decision:

- The reset link is delivered to the user's **email inbox**, which is the
  actual second factor in this flow. An attacker who controls the inbox can
  reset the password regardless of the current session state; an attacker
  who does not control the inbox gains nothing by calling the endpoint.
- Blocking the endpoint for authenticated users only inconveniences honest
  users (e.g. changing the password from a new device) and provides no real
  security benefit, because an attacker can simply log out or use a private
  browser window.
- This matches the behaviour of established services (Google, GitHub,
  Facebook, Django's own `PasswordResetView`).

The protection against a compromised inbox is therefore not "block the
reset endpoint" but rather:
1. Short-lived access tokens (JWT: 15 min).
2. Password change invalidates **all** existing sessions (Django
   `set_password()` rotates the session auth hash).
3. Optional email notification on successful reset (planned for a later
   phase, not part of this ADR).

### Token generation
`django.contrib.auth.tokens.default_token_generator` is used. The token is
derived from the user's password hash, `last_login`, `is_active` and a
timestamp, so it is automatically invalidated when:
- the password changes,
- the user logs in (which updates `last_login`),
- the token's timestamp exceeds `PASSWORD_RESET_TIMEOUT` (default 3 days).

No custom token model or database table is required.

### Anti-enumeration
The request endpoint always returns `200` with a generic message, regardless
of whether the address exists or is active. Inactive accounts and unknown
addresses follow the same code path and produce no email.

A malformed email address (`not-an-email`) is still rejected with `400` by
DRF's field validator. This is **not** considered an enumeration leak: the
attacker only learns that their input is not a valid email address, which is
public knowledge. Enumeration protection applies exclusively to
**well-formed** addresses.

### Password policy
`validate_password(new_password, user=user)` is applied with the user
context so that `UserAttributeSimilarityValidator` can compare against the
user's own attributes (email, username, display_name). All validation
errors are collected and returned in a single response.

Passwords are never logged. The confirmation field exists to catch typos;
it is validated server-side (not only in the client) so the API contract is
safe regardless of which client calls it.

### Session and token invalidation
`user.set_password()` changes the password hash, which invalidates every
existing Django session for that user. JWT access tokens remain valid until
they expire (15 minutes) — this is accepted because access tokens are
short-lived and refresh tokens can be blacklisted server-side via the
`token/blacklist/` endpoint.

After a successful reset, the reset token itself becomes invalid
automatically (it is bound to the old password hash), so the same link
cannot be replayed. This is verified by
`test_token_invalid_after_password_change`.

### Rate limiting
Both endpoints share the `password-reset` throttle scope (`3/hour`). The
confirm endpoint is throttled as well — not just the request endpoint —
to bound the number of token-guessing attempts per client.

### Responses and error messages
- Request endpoint: always `200` with a generic message.
- Confirm endpoint: `200` on success, `400` with a generic message on
  invalid/expired token, `400` with per-field errors on weak/mismatched
  passwords, `403` on CSRF failure, `429` on throttling.

Error messages never distinguish between "user does not exist", "token is
wrong" and "token is expired".

## Known limitations
- In the development environment the email backend is a console backend, so
  the timing of the request endpoint differs slightly between existing and
  non-existing addresses. In production the mail must be dispatched
  asynchronously (e.g. via Celery) to keep response times constant. This is
  tracked for the pre-launch checklist.
- The reset token has no explicit expiry beyond what
  `default_token_generator` provides (currently `PASSWORD_RESET_TIMEOUT`,
  default 3 days). If a shorter window is desired it can be configured via
  settings without changing the endpoints.
- Successful password resets are not yet announced to the user by a
  separate email. This is recommended as an additional detection signal for
  account compromise and is planned for a later phase.

## Consequences
- The flow works uniformly for web and mobile clients.
- No new database tables are required.
- Password resets invalidate all active web sessions and all outstanding
  reset tokens for the account.
- The design relies on the email inbox as the security boundary. This is
  explicit and intentional; any future change that weakens this assumption
  (e.g. allowing SMS resets) must be evaluated separately.