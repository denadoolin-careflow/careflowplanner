# Grouped, checkable habits and routines on the planner

## What changes

The planner's rhythm lane (Day card, and the Week / 3 Day row) currently mixes habits and routines into one flat list, and routines are display-only. It becomes a grouped, interactive strip.

### Grouping
- Two clearly labelled groups: **Habits** and **Routines**, in that order, each with a small header and count (e.g. "Habits 2/3", "Routines 1/2").
- Routines sort by time of day, then by slot order (Morning, Afternoon, Evening, Night, Nap time, Anytime), and show the person's name and time.
- Groups with nothing due for the day are hidden instead of showing an empty placeholder.
- In the Week / 3 Day row, each day column keeps the same order with tighter, two-line chips so the grid height stays as it is today.

### Interactivity
- Habits keep one-tap check-off (unchanged behaviour, now inside the Habits group).
- Routines become checkable: each routine chip shows a progress ring/count of its steps (e.g. "3/5") and
  - tapping the circle marks the whole routine done or undone (all its steps),
  - tapping the chip body opens a small popover listing the routine's steps, each individually checkable.
- Every toggle gives the same haptic + checked styling already used for habits, and writes straight to the existing habit logs and routine step records — the habit garden and routine pages stay in sync, nothing is duplicated.
- Fully done habits/routines dim and strike through, matching current habit styling.

### Day limits
Routine steps only track completion for the current day, so on past or future days routine chips render read-only with a quiet "today only" label. Habits stay checkable on any date.

## Technical details
- Rework `src/components/planner/PlannerRhythmRow.tsx`: split `RhythmChips` into `HabitChip`, `RoutineChip`, and a grouped container shared by `PlannerRhythmRow` (week columns) and `PlannerRhythmCard` (day).
- Habits use `useStore().toggleHabit`; routines use `routines.toggleItem(person, slot, itemId)` from `src/lib/routines.ts`, plus a small helper that toggles all steps of a routine in one `routines.upsert` call for the whole-routine control.
- Routine step popover uses the existing `Popover` primitive and design tokens; no new tables, no schema change.
- `habitProgress` export (used by the Month view markers) stays unchanged; a matching `routineProgress` helper is added for the group counts.

## Verification
- Check off a habit and a routine step from the Day card and from the Week / 3 Day row; confirm state persists after reload and matches the habits and routines pages.
- Confirm group headers, counts, and ordering at desktop and phone widths, with grid scrolling unchanged.
- Confirm routine chips are read-only on non-today columns.
- Type check plus an authenticated pass over Day, 3 Day, and Week.
