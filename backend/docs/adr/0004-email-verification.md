# 0004 - Email verification with Django default_token_generator

**Status:** Accepted
**Date:** 2026-10-28
**Decider:** Amas Movsisyan

## Context

After registration, the email address must be verified. The user should still be able to log in (no `is_active=False`).

## Decision

**Token:** Django's `default_token_generator`.
- Signed with `SECRET_KEY`
- Contains password hash and `last_login` in the hash -> token becomes invalid automatically after password change or new login
- No custom token model, no DB overhead

**URL:** `{FRONTEND_URL}/verify-email?uid={uidb64}&token={token}`.
- `uidb64` = base64-encoded user ID (not plaintext)
- `FRONTEND_URL` from `settings.py` (Dev: `http://localhost:4200`, Prod: `https://hayeng.com`)

**Endpoints:**
- `POST /api/auth/verify-email/` - takes `uid` + `token`, sets `email_verified=True`
- `POST /api/auth/resend-verification/` - takes `email`, sends new token
- `resend-verification` always returns 200 (anti-enumeration: attacker must not learn which emails are registered)

**Email delivery:** Console backend in Dev (`EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'`). Link lands in container log (`docker compose logs web`). In Prod: SMTP provider, only `EMAIL_BACKEND` changes.

## Mobile strategy

The link points to the **website** (`http://localhost:4200/verify-email`). This works for web and mobile users (browser opens). The app checks on the next `me` call or login whether `email_verified` is now `True`. Later, when the app exists: Deep Link (`hayeng://verify-email?uid=...`) as additional link in the email. Backend logic does not change.

## Consequences

- `email_verified` BooleanField in User model
- `send_verification_email()` helper in `accounts/emails.py`
- Two new endpoints
- `FRONTEND_URL` in `settings.py`
