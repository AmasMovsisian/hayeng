# ADR 0007: Password Reset

## Status
Accepted

## Context
Users need a way to regain access when they forget their password. The reset
flow must not leak whether an email address is registered, must resist token
brute-forcing and replay, and must apply the same password policy as
registration. Both web (session) and mobile (JWT) clients share the same
backend endpoints.

## Decision

### Endpoints
- `POST /api/auth/password-reset/` — accepts `{ "email": "..." }`.
- `POST /api/auth/password-reset-confirm/` — accepts
  `{ "uid", "token", "new_password", "new_password_confirm" }`.

Both endpoints are CSRF-protected and throttled under the `password-reset`
scope (`3/hour`).

### Token generation
`django.contrib.auth.tokens.default_token_generator` is used. The token is
derived from the user's password hash and `last_login`, so it is
automatically invalidated when the password changes or the user logs in.

### Anti-enumeration
The request endpoint always returns `200` with a generic message, regardless
of whether the address exists or is active. Inactive accounts and unknown
addresses follow the same code path and produce no email.

### Password policy
`validate_password(new_password, user=user)` is applied with the user
context so that `UserAttributeSimilarityValidator` can compare against the
user's own attributes. All validation errors are collected and returned in a
single response.

### Session invalidation
`user.set_password()` changes the password hash, which invalidates every
existing Django session for that user. JWT access tokens remain valid until
they expire (15 minutes) — this is accepted because access tokens are
short-lived and refresh tokens can be blacklisted server-side.

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

## Consequences
- The flow works uniformly for web and mobile clients.
- No new database tables are required.
- Password resets invalidate all active web sessions and all outstanding
  reset tokens for the account.