# ADR 0008: Security Hardening of the Authentication Layer

## Status
Accepted

## Context
The authentication layer grew across several iterations: registration, session
login, JWT login, email verification, password reset, and the corresponding
security fixes. Several non-obvious decisions were made along the way that are
not visible from the code alone. This ADR records them so that future
maintainers understand *why* the code looks the way it does, and so that a
reviewer can verify that each decision is still justified.

The decisions below are grouped by area. Each entry states the decision, the
reasoning, and — where relevant — the alternative that was considered and
rejected.

## Decision

### JWT: `CHECK_REVOKE_TOKEN` and access token lifetime

`SIMPLE_JWT['CHECK_REVOKE_TOKEN'] = True` and
`REVOKE_TOKEN_CLAIM = 'password_hash'` are enabled.

SimpleJWT then embeds an MD5 hash of the user's password into every issued
token and compares it against the stored hash on each authenticated request.
After a password change the hashes diverge and the token is rejected with
`401`.

**Consequence:** A stolen access token becomes useless the moment the user
changes their password, not merely when it expires. This is stricter than
the "access tokens live until expiry" assumption that earlier drafts of
ADR 0007 carried, and ADR 0007 was corrected accordingly.

**Cost:** One extra hash comparison per authenticated request, which is
negligible.

**Rejected alternative:** Leave `CHECK_REVOKE_TOKEN = False` and rely solely
on the 15-minute access token lifetime. That would let a stolen access token
survive a password reset for up to 15 minutes. The current setting closes
that window.

### JWT: Refresh token revocation via blacklist, not hash comparison

`SafeTokenRefreshSerializer` does not compare the `password_hash` claim
itself. It loads the user from the `user_id` claim, verifies `is_active`,
and then calls `super().validate(attrs)`, which performs SimpleJWT's
built-in blacklist check.

**Reason:** SimpleJWT does not populate the `password_hash` claim reliably
on every issuance path (SimpleJWT issue #927 is still open at the time of
writing). A hand-rolled hash comparison produces false `401` responses for
legitimately issued tokens, which was observed during development. The
blacklist path is deterministic and is the approach recommended by the
SimpleJWT community.

**Mechanism:** On a successful password reset, `_blacklist_all_refresh_tokens()`
iterates over every `OutstandingToken` for the user and creates a matching
`BlacklistedToken`. The next attempt to use any of those refresh tokens is
rejected by the parent `validate()`.

**Rejected alternative:** Compare the `password_hash` claim manually in
`SafeTokenRefreshSerializer`. Rejected because of the reliability problem
above.

### Password reset: serialisation via `SELECT ... FOR UPDATE`

`PasswordResetConfirmView` runs its work inside `transaction.atomic()` and
acquires `User.objects.select_for_update()` on the target row. The token is
re-validated **inside** the lock, not before it.

**Reason:** `default_token_generator` binds a token to the user's password
hash. Two concurrent requests with the same token can both pass the hash
check before either has written a new password, and both would then set the
password. The `SELECT ... FOR UPDATE` serialises them: the second request
waits for the first to commit, then sees the new hash and fails the token
check with `400`.

**Verified by:** `test_only_one_concurrent_reset_succeeds` in
`test_password_reset_race.py`, which uses `TransactionTestCase` and a
`threading.Barrier` to force true concurrency.

**Rejected alternative:** Rely on `transaction.atomic()` alone. Atomicity
alone does not prevent two transactions from reading the same password hash
concurrently; only row locking does.

### Password reset: reset allowed regardless of authentication state

The reset request endpoint does not reject authenticated users. The
reasoning is recorded in ADR 0007 ("Reset is allowed regardless of
authentication state") and is repeated here only for completeness: the
email inbox is the security boundary, not the session state.

### Referrer-Policy: `no-referrer`

`SECURE_REFERRER_POLICY = 'no-referrer'`.

**Reason:** Password reset links carry `uid` and `token` in the query
string. A referrer header would leak those values to any same-origin
resource that the reset page loads (fonts, scripts, images). `no-referrer`
suppresses the header entirely and costs nothing.

**Rejected alternative:** `same-origin`. It is the Django default and
prevents cross-origin leaks, but it still exposes the full URL to
same-origin resources. Since the reset page should be treated as
sensitive, `no-referrer` is the safer choice.

### Session invalidation after password reset

`user.set_password()` rotates Django's session auth hash, which invalidates
every existing session for that user. Combined with `CHECK_REVOKE_TOKEN`,
all previously issued access tokens are also rejected, and
`_blacklist_all_refresh_tokens()` invalidates every outstanding refresh
token.

**Net effect:** A password reset invalidates every credential the user has:
sessions, access tokens, refresh tokens and reset tokens. This is verified
by `test_session_invalidation.py`, `test_access_token_lifetime.py` and
`test_password_reset.py::test_refresh_token_revoked_after_reset`.

### Anti-enumeration on reset and resend endpoints

Both `password-reset/` and `resend-verification/` always return `200` with
a generic message for well-formed email addresses, regardless of whether
the address is registered, inactive, or already verified. No mail is sent
for addresses that do not match an eligible account.

**Malformed addresses** (`not-an-email`) are rejected with `400` by DRF's
field validator. This is not considered an enumeration leak: the attacker
only learns that their input is not a valid email address, which is public
knowledge.

### Rate limiting on reset endpoints

Both `password-reset/` (request) and `password-reset-confirm/` (confirm)
share the `password-reset` throttle scope at `3/hour`.

**Reason:** Throttling only the request endpoint would leave the confirm
endpoint open to token-guessing. Both endpoints are therefore limited, so
the number of attempts per client per hour is bounded regardless of which
half of the flow is abused.

**Known limitation:** The default cache backend is `LocMemCache`, which is
per-process. In production with multiple workers the throttle counter would
not be shared, and rate limiting would be ineffective. Switching to Redis
is tracked in the pre-launch checklist (ADR 0006 and the project handoff).

### Token generation: `default_token_generator`

Both email verification and password reset use
`django.contrib.auth.tokens.default_token_generator`.

**Reason:** The token is derived from the user's password hash,
`last_login`, `is_active` and a timestamp. It is therefore automatically
invalidated when the password changes, when the user logs in (which updates
`last_login`), or when `PASSWORD_RESET_TIMEOUT` has elapsed. No custom
token model, no extra table, no hand-rolled cryptography.

**Trade-off:** Because `last_login` is part of the token signature, logging
in between issuing and consuming a verification token can invalidate that
token. `test_verify_email_token_behaviour_after_login` records the actual
behaviour of the current Django and SimpleJWT combination and asserts that
`email_verified` remains consistent with the response. If the behaviour
ever becomes user-hostile in practice (for example, users frequently log in
before clicking the verification link), a dedicated verification token
generator that does not depend on `last_login` can be introduced. This is
explicitly deferred until there is evidence that it is needed.

## Consequences

- A password reset invalidates every credential the user holds: sessions,
  access tokens, refresh tokens, and reset tokens.
- Access tokens are rejected on the first authenticated request after a
  password change, rather than after their nominal 15-minute lifetime.
- Concurrent reset confirmations cannot both succeed; the second receives
  `400`.
- The reset page does not leak the reset token via referrer headers.
- Rate limiting is effective within a single process; production requires
  Redis to make it effective across workers.

## Known limitations (deferred to production hardening)

The following items are deliberately not addressed in this ADR and are
tracked in the project handoff and in ADR 0006:

- Redis as a shared cache backend for throttling.
- Asynchronous email dispatch (Celery) to eliminate timing differences
  between existing and non-existing addresses.
- HTTPS enforcement, HSTS, secure proxy headers (`X-Forwarded-For`,
  `NUM_PROXIES`).
- `DEBUG = False` in production, `python manage.py check --deploy`.
- A dedicated notification email after a successful password reset (an
  additional compromise-detection signal).
- A shorter `PASSWORD_RESET_TIMEOUT` than the Django default of three days,
  if the product decides that a shorter window is appropriate.
- Email verification token independent of `last_login`, if the observed
  behaviour turns out to be user-hostile.

None of these items affect the correctness of the decisions recorded above;
they are operational hardening steps for the production deployment.