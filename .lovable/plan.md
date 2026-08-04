# Planner focus, quick edit, and a movable tray

## 1. Focus timer beside the schedule (Planner page)
Add a compact focus/Pomodoro panel that sits next to the day schedule on the Planner instead of hiding behind the Focus popover.

- New `PlannerFocusPanel` card: current focus task, large countdown, start/pause/reset, session length presets, and a short "focus on…" list of today's / top-3 tasks.
- On desktop day view the planner content becomes a two-column row: focus panel (narrow column) next to the schedule/grid column.
- On mobile it collapses to the existing compact focus chip so the grid keeps full width.
- Timer state keeps using the shared pomodoro store, so the floating timer and this panel stay in sync.

## 2. Richer task quick-edit modal
Extend the quick-edit dialog (opened from tray, inbox and planner rows) with scheduling controls.

- Completion checkbox with the same pop/haptic animation used on planner blocks, plus the task's icon beside the title.
- Timeframe pills: Morning / Afternoon / Evening — picking one sets a sensible default start time in that window.
- Start and end time shown as a range, with a duration control (preset chips + minute stepper, reusing the existing duration editor logic).
- Editing duration moves the end time; editing end time updates duration. Saving writes start time and duration so the task stays placed on the grid.

## 3. Notepad → real notes
In the tray's Notepad tab, each note gets a "Save as note" action that creates a record in the Notes section (title = first line, body = the rest) and offers to open it. The tray note is cleared after a successful save so nothing is duplicated.

## 4. Tray inbox: checkbox + schedule
- Every tray row (parked and inbox) gets the animated completion checkbox; completing a task plays the same pop/haptic and removes it from the list.
- Each row shows its schedule info when present (day chip, time, or duration); unscheduled rows stay visually plain.

## 5. Movable tray with more tabs
- The tray panel becomes draggable by its header (pointer drag, clamped to the viewport) with the position remembered between sessions; a reset-position action returns it to the default corner. Mobile keeps the docked bottom-sheet behaviour.
- Tabs become: Notepad · Tray · Schedule · Habits · Routines.
  - Schedule: today's timed blocks in order, tap to complete, drag onto the grid.
  - Habits: today's habits with tick-off toggles.
  - Routines: today's routines and their items with tick-off toggles.

## Technical notes
- Files touched: `src/pages/Planner.tsx`, new `src/components/planner/PlannerFocusPanel.tsx`, `src/components/tasks/GlobalTaskQuickEdit.tsx` and `QuickTaskInlineEditor.tsx` (plus a new quick-schedule fields component), `src/components/tray/TrayDock.tsx`, `src/lib/tray-store.ts` (tab union + saved position), `src/lib/notes.ts` (`createNote`); habits and routines read from the existing store.
- Reuse `BlockCheckbox`, `DurationEditor`, `planner-metrics`, `haptics`, and `pomodoro-store` rather than duplicating logic.
- No schema changes; tray position and active tab persist in local storage alongside the current tray state.