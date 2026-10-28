# 0001 - Web uses Session, Mobile uses JWT

**Status:** Accepted
**Date:** 2026-10-28
**Decider:** Amas Movsisyan

## Context

Hayeng has two clients: Web (Angular 20) and Mobile (React Native). Both need authentication, but their security models differ fundamentally. Browsers have cookies; React Native does not. A single mechanism is not possible.

## Decision

**Web:** Django Session + CSRF.
- Session ID in HttpOnly cookie (`SESSION_COOKIE_HTTPONLY=True`)
- CSRF token in separate cookie (`CSRF_COOKIE_HTTPONLY=False`) so Angular can read it and send it as `X-CSRFToken` header
- `SESSION_COOKIE_SECURE = not DEBUG`

**Mobile:** JWT via `djangorestframework-simplejwt`.
- Access token: 15 minutes
- Refresh token: 14 days
- `ROTATE_REFRESH_TOKENS=True` (refresh rotates on use)
- `BLACKLIST_AFTER_ROTATION=True` (old refresh becomes invalid)
- Token storage on device later via iOS Keychain / Android Keystore

## Rejected Alternatives

- **Unified JWT for Web + Mobile:** Web would have to store tokens in `localStorage` -> XSS vulnerability. Any JavaScript bug in the frontend could exfiltrate tokens.
- **Unified Session for Web + Mobile:** React Native has no cookie context. Session cookies do not work there.

## Consequences

- Two auth paths must be maintained in parallel
- New auth features (password reset, email verification) must work for both paths
- Login endpoints are separate: `/api/auth/login/` (Session) vs `/api/auth/token/` (JWT)
