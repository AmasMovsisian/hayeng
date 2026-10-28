# 0005 - API documentation with drf-spectacular

**Status:** Accepted
**Date:** 2026-10-28
**Decider:** Amas Movsisyan

## Context

The API is growing (registration, login, token, verify, resend). Manually maintained API documentation becomes outdated within days. New developers (later employees, friends) need an up-to-date overview of all endpoints.

## Decision

**drf-spectacular** generates OpenAPI 3.0 automatically from the code.
- Swagger UI at `/api/docs/`
- Schema at `/api/schema/`
- No manual decorators required (optional `@extend_schema` for refinement)
- Validated with `python manage.py spectacular --validate`

## Why not manual?

The code is the single source of truth. When a serializer field is added, it appears automatically in the docs. When an endpoint is renamed, the old one disappears. No "I forgot to update the docs".

## Consequences

- `drf-spectacular` in `INSTALLED_APPS`
- `DEFAULT_SCHEMA_CLASS` in `REST_FRAMEWORK`
- `/api/docs/` and `/api/schema/` in `config/urls.py`
- New developers open `/api/docs/` and immediately see all endpoints with request/response examples
