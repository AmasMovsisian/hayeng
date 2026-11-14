# ADR 0002: Component split within the goal page

## Status

Accepted (retrospective).

## Context

The onboarding flow (ADR 0001) contains five distinct screens, each with its
own layout, form fields, and validation. Keeping all of them in a single
component would produce a very large template and a very large class.

## Decision

The goal page is split into one orchestrator and five sub-components:

| Component | Responsibility |
|---|---|
| `Goal` | owns all state, decides which sub-component is visible, handles navigation between steps, performs registration, owns username availability check |
| `GoalQuestions` | renders steps 1 and 2 (goal selection, level selection, placement panel) |
| `GoalProfile` | renders step 3 (display name, date of birth, gender) |
| `GoalWelcome` | renders the welcome screen between step 2 and step 3 |
| `GoalRegister` | renders step 4 (username, email, password, password confirmation, Google button, register/back actions) |
| `GoalTest` | renders the placement test overlay |

All sub-components are standalone, use `ChangeDetectionStrategy.OnPush`, and
communicate with `Goal` exclusively via `@Input` and `@Output`. No sub-component
injects `Goal`, and no sub-component talks to another sub-component directly.

### Inputs and outputs

Each sub-component receives its data as inputs and emits user actions as
outputs. Examples:

- `GoalQuestions` receives `currentStep`, `selectedGoal`, `selectedLevel`,
  `levelSource`; emits `goalSelected`, `levelSelected`, `unknownLevelSelected`,
  `placementStart`, `placementSkip`, `next`, `back`.
- `GoalProfile` receives `displayName`, `dateOfBirth`, `gender`, the three
  `*Touched` flags, `displayNameValid`, `genderValid`, `displayNameError`,
  `dateOfBirthError`; emits `displayNameInput`, `displayNameBlur`,
  `dateOfBirthChange`, `dateOfBirthBlur`, `genderChange`, `genderBlur`, `next`,
  `back`.
- `GoalRegister` receives `username`, `usernameAvailable`, `usernameChecking`,
  `usernameTouched`, `email`, `password`, `passwordConfirm`, the three
  `*Touched` flags, `registrationValid`, the four `*Error` strings,
  `registrationSubmitting`, `registrationError`, `registrationFieldErrors`;
  emits `usernameChange`, `emailChange`, `passwordChange`,
  `passwordConfirmChange`, `googleRegister`, `register`, `back`.
- `GoalTest` emits `completed` (`PlacementTestResult`) and `cancelled` (void).
- `GoalWelcome` emits `next`.

### Partial state ownership in `GoalProfile`

`GoalProfile` does not fully delegate its validation to `Goal`. It owns two
pieces of local state:

- `nameFormatInvalid: boolean` — set when `onNext()` or `onDisplayNameBlur()`
  detects a name error. Used by `displayNameErrorVisible` to keep the error
  visible even if `displayNameTouched` is reset upstream.
- `nameErrorMessage: string` — the last computed name error, used as the
  fallback message when `nameFormatInvalid` is true.

`GoalProfile` also normalizes `displayName` on blur (trims, collapses
whitespace) and emits the normalized value back to `Goal` via
`displayNameInput`, so that `Goal` and the input field stay in sync without
`Goal` needing a reference to the input element.

The same name-validation rules (required, max length, leading/trailing space,
repeated spaces, invalid characters, invalid separator, too many parts,
format) are implemented twice: in `Goal.getDisplayNameError()` and in
`GoalProfile.getNameError()`. The two implementations are currently
identical.

### Scroll management

Scroll-to-top behaviour is not centralized. It is implemented in three
places:

- `Goal` has a private `scrollToTop()` that calls `window.scrollTo` inside a
  double `requestAnimationFrame`.
- `GoalQuestions` has a private `scrollToTop(smooth)` that calls
  `window.scrollTo` and `element.scrollIntoView` inside a `setTimeout(0)`,
  and calls it from `ngAfterViewInit` and from `ngOnChanges` when
  `currentStep` changes.
- `GoalTest` has a private `scrollToTop()` that walks up the DOM from its host
  element to find the nearest scrollable ancestor and scrolls that, then also
  scrolls `window`, `documentElement`, and `body` inside a `setTimeout(0)`.

## Consequences

- `Goal` is the single source of truth for onboarding data. Sub-components
  are stateless except for `GoalProfile` (see above) and `GoalTest` (which owns
  the full test state).
- Adding or removing a sub-component does not affect the others; only `Goal`
  and its template change.
- The sub-components can be tested in isolation by setting inputs and
  subscribing to outputs.
- Because `GoalProfile` owns local state and normalizes on blur, the flow of
  data is not strictly one-way: `Goal` passes `displayName` in, `GoalProfile`
  emits a normalized value out, `Goal` updates its copy. This is intentional
  (the input element needs to reflect the normalized value immediately) but
  means `Goal` cannot assume that `onDisplayNameInput` always receives the
  raw typed value.

## Known limitations

- **Duplicated validation logic.** The display-name rules exist in both
  `Goal.getDisplayNameError()` and `GoalProfile.getNameError()`. They are
  identical today; a change in one must be mirrored in the other.
- **Duplicated `MAX_NAME_LENGTH` constant.** Declared in both `Goal` and
  `GoalProfile`.
- **No shared base class or helper** for the "touched + error" pattern. Each
  sub-component implements it in its own template.
- **`GoalWelcome` receives a `dateOfBirth` and `gender` input but is not
  documented to use them in a specific way** — the template is not part of
  this ADR's source material.