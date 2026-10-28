# 0002 - User model: email as login, username as public handle

**Status:** Accepted
**Date:** 2026-10-28
**Decider:** Amas Movsisyan

## Context

We need a user model that covers three distinct naming concepts:
1. Login identity (how does the user sign in?)
2. Public handle (how do others find the user?)
3. Display name (what name do others see?)

## Decision

**Login:** Email + password only. `USERNAME_FIELD = 'email'`. No login via username or display_name.

**username:** Public Instagram-style handle.
- Max 30 chars, stored lowercase
- UniqueConstraint(Lower('username'), name='unique_username_ci') for case-insensitive uniqueness
- Format: `[A-Za-z][A-Za-z0-9_]*`, 3-30 chars
- Not a login field, public identity only

**display_name:** Display name.
- Max 32 chars, no unique constraint (multiple "Arman" allowed)
- Unicode allowed (including Armenian via `\w`)
- Max 2 name parts (first name or first + last name)
- Validation: no leading/trailing spaces, no consecutive spaces, `-`/`_` not at edges or repeated

**email_verified:** Separate BooleanField, default `False`.
- Registration sets `email_verified=False`, `is_active` stays `True`
- User can log in but sees a "Please verify your email" banner
- Sensitive actions (chat, lessons) will later be protected by a dedicated permission

## Rejected Alternatives

- **Login via email OR username:** More complex (two fields to check, double case-insensitivity, timing attacks), more code, more tests. Large platforms take years to build this safely. For Hayeng (goal: millions of users, secure, scalable), "email only" is the right choice. Can be added later as a separate feature.
- **`is_active=False` for unverified users:** Blocks every login. User cannot even see the "Please verify" page. Mixes "banned" with "unverified". Badly separable.
- **display_name unique:** Prevents two users from having the same real name. Unrealistic.

## Consequences

- Login form has only two fields (email, password)
- Registration has six fields (email, password, username, display_name, date_of_birth, gender)
- `email_verified` permission must be built later for sensitive endpoints
