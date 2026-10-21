# Link habits and daily rituals to life-area goals

## What you'll get
- **Habits:** the habit editor gets the same life-area goal picker used on tasks and projects (goals grouped by the 12 houses). You can link one or more goals and unlink them.
- **Daily rituals (Morning Reset, Evening Reflection):** each ritual gets a "Life-area goal" picker in its step editor.
- **On Today:** each habit and each ritual shows its linked goal as a small chip with the goal name and life area, the same chip tasks already show.
- The Life areas tab counts linked habits next to each goal's tasks and projects.

## Where goals show on Today
- The habits card and the routines and habits row: a chip under each habit name.
- The daily rituals card: a chip under the Morning Reset and Evening Reflection titles.

## Verification
- At phone and tablet widths: link a goal to a habit and to Morning Reset, check both chips on Today, reload and confirm they stay, then unlink and confirm they disappear. Remove any test data afterward.

## Technical details
- Habits already save their goal links in the habit's existing details (`linkedGoalIds` in `habits.meta`). Replace the plain toggle list in `HabitDetailSheet` with `ProjectGoalPicker`, and render `LinkedGoalLabels` in `TodayHabitsCard` and `RoutinesHabitsRow`. No database change.
- Ritual goal links go in the existing ritual settings store (`src/lib/ritual-steps.ts`) under a `goalIds` key for each ritual, edited in `RitualStepsEditor` and shown in `DailyRituals`. Like ritual steps, these links are saved on this device only. Syncing them across devices would need a new account-wide setting; I can add that if you want it.
- Add a test to `ritual-steps.test.ts` that saves and reads back a ritual's goal link.
- Update the AGENTS.md rule about goal pickers to cover habits and rituals.
