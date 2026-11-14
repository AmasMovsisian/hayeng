# ADR 0003: State management

## Status

Accepted (retrospective).

## Context

The onboarding flow collects data across four steps plus a welcome screen and
a placement test. Some data is needed by more than one step: the goal and
level are shown again on the welcome screen and in the registration payload;
the display name is shown on the welcome screen; the username is used by the
password-similarity check.

## Decision

State is held in local component properties. There is no global store, no
service for onboarding state, and no signal-based state.

### Where state lives

| State | Owner | Lifetime |
|---|---|---|
| `currentStep`, `showWelcome`, `showPlacementTest` | `Goal` | until the flow completes or the route is left |
| `selectedGoal`, `selectedLevel`, `levelSource`, `placementTestResult` | `Goal` | same |
| `displayName`, `dateOfBirth`, `gender` | `Goal` (source of truth), mirrored locally in `GoalProfile` during editing | same |
| `username`, `email`, `password`, `passwordConfirm` | `Goal` | same |
| `usernameChecking`, `usernameAvailable` | `Goal` | same |
| `*Touched` flags (display name, date of birth, gender, username, email, password, password confirm) | `Goal` | same |
| `registrationSubmitting`, `registrationError`, `registrationFieldErrors` | `Goal` | same |
| Placement test state (`currentQuestionIndex`, `selectedAnswerId`, `userAnswers`, `result`, `phase`) | `GoalTest` | until the test completes or is cancelled |
| Date-of-birth input display value (`dateInputValue`), `nameFormatInvalid`, `nameErrorMessage` | `GoalProfile` | until the component is destroyed |

`Goal` is the single source of truth for everything except placement-test
state (which `GoalTest` owns entirely) and the two `GoalProfile`-local fields
(see ADR 0002).

### Communication

Sub-components receive data via `@Input` and emit user actions via `@Output`.
No sub-component injects `Goal`. No service is injected into sub-components
for onboarding state. The only service used by the flow is `AuthService`,
injected into `Goal` for registration and username availability.

### Change detection

Every component uses `ChangeDetectionStrategy.OnPush`. Because `Goal` mutates
its own properties from event handlers and from HTTP callbacks, it calls
`ChangeDetectorRef.markForCheck()` after mutations that happen outside the
template's event bindings:

- after the `isUsernameAvailable` HTTP response,
- after setting `usernameChecking = true` before the debounced request,
- at the end of `register()` before navigating away,
- in `register()`'s error handler after updating `registrationError` and
  `registrationFieldErrors`.

`GoalProfile` calls `markForCheck()` after every input update that happens
outside the template's event bindings (in `ngOnChanges`, after normalizing
the name, after syncing the date input value).

### Debouncing the username check

The username availability check is debounced by 400 ms using `setTimeout` and
a numeric token (`usernameCheckToken`) instead of RxJS `debounceTime` +
`switchMap`:

1. On every input, `onUsernameChange` increments `usernameCheckToken` and
   clears the pending timer.
2. If the username fails the local format check, it returns without starting
   a timer.
3. Otherwise it sets `usernameChecking = true`, captures the current token,
   and starts a 400 ms `setTimeout`.
4. When the timer fires, it calls `AuthService.isUsernameAvailable(...)` and
   subscribes. The `next` and `error` handlers first check
   `token === this.usernameCheckToken` and return early if the user has typed
   again in the meantime.

The token check is the equivalent of `switchMap`'s cancellation: a stale
response is ignored.

## Consequences

- No global state means no cross-route state. Leaving `/onboarding/goal` and
  returning starts the flow from step 1.
- Testing a sub-component requires only setting its inputs; no store or
  service needs to be mocked.
- `Goal` is a large component: it holds all onboarding state, all validation
  helpers, the registration call, and the username-check debounce. This is a
  direct consequence of the "single source of truth" decision.
- Because state is not observable, any component that needs to react to a
  change must rely on `@Input` change detection. `GoalQuestions` uses
  `ngOnChanges` for this; `GoalProfile` also uses `ngOnChanges`.
- `OnPush` + manual `markForCheck()` is error-prone: forgetting a
  `markForCheck()` after a mutation that happens outside a template event
  binding will silently fail to update the view. The current code is correct
  for the paths it exercises, but there is no guard against future additions
  missing it.

## Known limitations

- No persistence: reload loses all onboarding state.
- No undo/redo, no draft saving.
- The `usernameCheckToken` + `setTimeout` pattern is a hand-rolled equivalent
  of `debounceTime` + `switchMap`. It works, but it reimplements an operator
  that RxJS already provides and that would be less error-prone (no manual
  token, no manual timer cleanup). See ADR 0005 for the validation flow that
  this debounce feeds into.
- `Goal` is not decomposed into smaller state holders. If the flow grows
  (e.g. an email-verification step), the class will grow further unless it is
  split.

## Rationale not recorded

Why a global store (NgRx, SignalStore) was not chosen, and why the debounce
was implemented with `setTimeout` rather than RxJS operators, is not recorded
in the code. Both are plausible default choices for a flow of this size
(no cross-route state, no shared state with other features), but the decision
itself was not written down at the time.