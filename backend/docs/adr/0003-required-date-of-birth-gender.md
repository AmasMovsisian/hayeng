# 0003 - date_of_birth and gender are required fields

**Status:** Accepted
**Date:** 2026-10-28
**Decider:** Amas Movsisyan

## Context

The frontend already validates both fields client-side. The question was whether the backend should leave them optional or also treat them as required.

## Decision

**Both fields are required.** `date_of_birth` (DateField, null=False, blank=False), `gender` (CharField, choices male/female, blank=False).

## Rationale

- **Chat/Community filters:** Premium users should later be able to filter by gender and age ("show me female users, 25-35"). Impossible without these fields.
- **Age gating:** Chat/Community will later be 16+ or 18+. Must be checked server-side, not only client-side.
- **Minor protection:** `date_of_birth` is legally relevant for community safety.
- **Consistency:** Frontend already enforces both fields. Backend must have the same rule, otherwise API clients can bypass validation.

## Consequences

- Superuser and existing users must fill these fields afterwards (one-time shell command)
- `RegisterSerializer` has `date_of_birth` as `required=True` and `gender` as `ChoiceField(required=True)`
- `createsuperuser` asks these fields interactively (Django default does not support this automatically, hence shell fallback if needed)
