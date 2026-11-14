# Hayeng Frontend — Architecture Overview

## Purpose

This document is the entry point for the frontend architecture. It describes
the current structure of the Angular application and links to the Architecture
Decision Records (ADRs) that explain the non-obvious decisions.

The ADRs are numbered chronologically by the time the decision was made. Some
of them are retrospective: the decision was made before this documentation
existed, and the ADR was written later to record it. Retrospective ADRs are
marked as such in their status line.

## Table of Contents

1. [Stack](#stack)
2. [Directory structure](#directory-structure)
3. [Route map](#route-map)
4. [State management](#state-management)
5. [Backend integration](#backend-integration)
6. [Validation and error display](#validation-and-error-display)
7. [Password visibility toggle](#password-visibility-toggle)
8. [ADR index](#adr-index)

## Stack

- Angular 20, standalone components, no NgModules
- `ChangeDetectionStrategy.OnPush` on every component
- RxJS for HTTP and async work
- SCSS with CSS custom properties (`--color-*`, `--space-*`, `--radius-*`,
  `--font-*`) for theming
- Armenian (`hy`) is the primary UI language; all user-facing strings are
  hard-coded in the templates and components, no i18n library is used yet

## Directory structure
frontend/src/app/
├── app.config.ts # ApplicationConfig: router, http, csrf, app initializer
├── app.routes.ts # Top-level routes: splash, onboarding, dashboard
├── core/
│ ├── interceptors/
│ │ └── csrf.interceptor.ts
│ └── services/
│ └── auth.service.ts
├── shared/
│ └── app-footer/
├── pages/
│ └── splash/
└── features/
├── onboarding/
│ ├── pages/
│ │ ├── welcome/
│ │ └── goal/
│ │ ├── goal.ts / .html / .scss
│ │ ├── components/
│ │ │ ├── goal-questions/
│ │ │ ├── goal-profile/
│ │ │ ├── goal-welcome/
│ │ │ ├── goal-register/
│ │ │ └── goal-test/
│ │ ├── data/
│ │ │ └── placement-questions.ts
│ │ └── models/
│ │ ├── goal.models.ts
│ │ └── placement-test.models.ts
│ └── ...
└── dashboard/
└── pages/
└── dashboard/

text

## Route map

| Path | Component | Notes |
|---|---|---|
| `''` | redirect → `splash` | |
| `splash` | `Splash` | entry screen |
| `onboarding/welcome` | `Welcome` | pre-onboarding intro |
| `onboarding/goal` | `Goal` | the 4-step onboarding flow (see ADR 0001) |
| `dashboard` | `Dashboard` | post-registration landing |
| `**` | redirect → `splash` | |

All routes are lazy-loaded via `loadComponent`.

## State management

See ADR 0003. In short: local component state, `@Input`/`@Output` for
parent-child communication, no global store, no signals.

## Backend integration

See ADR 0004. In short: a single `AuthService` wraps all auth endpoints;
`withCredentials: true` on every call; a `csrfInterceptor` injects
`X-CSRFToken` on mutating methods; a `provideAppInitializer` fetches the CSRF
cookie before the app renders.

## Validation and error display

See ADR 0005. In short: every `get*Error()` returns `string | null` (never
`''`); templates use Boolean coercion (`!!error`); `touched` gates when
errors appear; server field errors are mapped to the corresponding field;
only the username gets a positive success state.

## Password visibility toggle

See ADR 0006. In short: per-field `showPassword` / `showPasswordConfirm`
booleans, `<button type="button">` with `aria-label` and `aria-pressed`,
input gets right padding to make room for the toggle.

## ADR index

| # | Title | Status |
|---|---|---|
| 0001 | Onboarding flow structure (4 steps + welcome + placement test) | Accepted (retrospective) |
| 0002 | Component split within the goal page | Accepted (retrospective) |
| 0003 | State management: local state, no store | Accepted (retrospective) |
| 0004 | Backend integration: AuthService, CSRF interceptor, app initializer | Accepted |
| 0005 | Validation and error display for the registration form | Accepted |
| 0006 | Password visibility toggle | Accepted |