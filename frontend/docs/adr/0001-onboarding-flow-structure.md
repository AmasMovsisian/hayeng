# ADR 0001: Onboarding flow structure

## Status

Accepted (retrospective). The flow was built before this ADR was written;
this record describes the structure as it exists and the reasoning that can be
reconstructed from the code.

## Context

New users must complete a sequence of steps before they can register. The
sequence collects: a learning goal, an English level (either self-assessed or
estimated by a placement test), profile data (display name, date of birth,
gender), and finally registration credentials (username, email, password).

The flow is implemented as a single `Goal` component that owns all state and
renders one of several sub-components depending on `currentStep`,
`showWelcome`, and `showPlacementTest`.

## Decision

The onboarding flow has the following shape:

1. **Step 1 — Goal.** The user selects one of four goals
   (`career`, `travel`, `communication`, `self-development`).
2. **Step 2 — Level.** The user selects an English level
   (`a1`–`c1`), or signals that they do not know their level. If they do not
   know, they can either start a placement test or skip it.
3. **Welcome.** After step 2, a non-numbered welcome screen
   (`GoalWelcome`) summarises the selected goal and level and introduces the
   profile step.
4. **Step 3 — Profile.** The user enters display name, date of birth, and
   gender.
5. **Step 4 — Register.** The user enters username, email, password, and
   password confirmation, and submits the registration.

The placement test is not a numbered step. It is a modal-like overlay
controlled by `showPlacementTest`. While it is open, the step content is
hidden. When it completes, it returns a `PlacementTestResult` that sets
`selectedLevel` and `levelSource = 'test'`.

The welcome screen is likewise not a numbered step. It is controlled by
`showWelcome` and sits between step 2 and step 3. `previousStep()` from step 4
returns to the welcome screen; `nextStep()` from the welcome screen advances
to step 4.

### Level source

The `levelSource` field (`'self' | 'test' | 'unknown'`) records how the level
was determined. It is used by:
- `GoalWelcome` and `GoalRegister` for display,
- the registration payload (the backend receives only the level, not the
  source; the source is currently frontend-only),
- the placement panel logic in `GoalQuestions`, which shows the panel when
  `levelSource === 'unknown'`.

### Placement test

`GoalTest` is a self-contained client-side component. It reads its questions
from `PLACEMENT_QUESTIONS` (`features/onboarding/pages/goal/data/`) and never
contacts the backend. It computes a result locally:

- For each level (`c1`, `b2`, `b1`, `a2`, `a1`, in that order), if the user
  answered at least 2/3 of that level's questions correctly, that level is
  the estimated level.
- If no level reaches the 2/3 threshold, the result is `a1`.
- The result also includes `correctAnswers`, `totalQuestions`, `score`
  (percentage), and `userAnswers` for the review screen.

The test has three phases (`'questions' | 'result' | 'review'`) and a
`cancelled` output that lets the parent close it without a result.

## Consequences

- The flow is a single component (`Goal`) with a numeric `currentStep` plus
  two boolean overlay flags (`showWelcome`, `showPlacementTest`). Adding a new
  step means adding a new number; adding a new overlay means adding a new
  boolean.
- The placement test is decoupled from the backend. Changing the question set
  means editing `PLACEMENT_QUESTIONS`; no migration is required.
- The welcome screen is not a numbered step. Users who go back from step 4
  see the welcome screen again, not step 3.
- The `levelSource` value is currently not sent to the backend. Only
  `selectedLevel` is included in the registration payload (see ADR 0004).

## Known limitations

- `Goal` holds the `PlacementTestResult` (`placementTestResult`) but does not
  use it after setting `selectedLevel` and `levelSource`. The result is
  available for future use (e.g. sending the score to the backend) but is not
  currently consumed.
- There is no persistence of onboarding progress. A page reload returns the
  user to step 1.
- The flow is Armenian-only. There is no i18n layer; all strings are
  hard-coded.

## Rationale not recorded

The decision to use four numbered steps plus a non-numbered welcome screen
and a non-numbered placement test was made before this ADR existed. The code
shows the structure but not the reasoning. Possible reasons (UX pattern
similar to language-learning products, separation of "profile" from
"credentials", the welcome screen as a transition rather than a data-entry
step) are plausible but not confirmed.