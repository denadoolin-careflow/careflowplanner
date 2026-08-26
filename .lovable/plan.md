# Streaks, side-panel multi-select, med reminders, Today grocery, query polish

Five feature batches: habit/routine streak visuals on Today, multi-select bulk actions in the planner side panel, a medication + symptom tracker for you and your care people, a full grocery card on Today, and formatting/UX polish for note query blocks.

## 1. Streak & trend visuals on Today (RoutinesHabitsRow)

- Habits: use the existing `computeHabitGrowth` forgiving-streak logic to show a flame + streak count on each habit, plus a week-over-week trend arrow (this 7 days vs previous 7) — green up, grey flat, amber down.
- Smarter sorting: habits due today but not yet logged rise to the top, grouped by their time-of-day (morning → anytime); completed habits sink. Routines keep the current due-now scoring, extended with a small "Due now" badge on the routine matching the current morning/afternoon/evening slot and a streak count of fully-completed days.
- Everything stays inside the existing Routines/Habits cards — no layout change.

## 2. Multi-select mode in the planner side panel

- A "Select" toggle in the `TaskSourcePanel` header switches task rows into selection mode: checkboxes appear on `PlannerTaskRow` (new optional `selectable` / `selected` / `onToggleSelect` props), drag and click-to-edit are paused while selecting.
- Selection state reuses the existing shared `usePlannerSelection` store (`src/lib/planner/selection.ts`), so selections carry across views.
- When items are selected, a sticky bulk bar appears at the bottom of the panel (mirroring `PlannerBulkBar` conventions): **Schedule to day** (date popover, defaults to the viewed day), **Done** (with the existing undo/redo toast), **Move to inbox**, and **Clear**.

## 3. Medication reminders + symptom/capacity tracking (Care)

New tables (all with RLS scoped to the signed-in user):

- `medications` — name, dose, notes, list of daily reminder times, active flag, and an optional link to a care recipient (no link = your own medication).
- `medication_logs` — one row per dose: scheduled date/time, taken / skipped / missed status, taken-at timestamp.
- `symptom_logs` — timestamp, free-text symptom, severity 1–5, optional energy/capacity 1–5, note, optional care-recipient link (again, no link = personal).

UI:

- A **Medications** section on the Care hub: list of meds for you and each care person, add/edit dialog, and a today checklist ("8:00 AM — Levothyroxine 50mcg — Taken / Skip"). Existing freeform meds on care profiles stay as reference notes; the new table is the scheduled, trackable version.
- Planner connection: each medication's reminder times render as small pill chips on the planner timeline at their times (like the meal lanes), clickable to mark taken without leaving the planner. Optional toggle to also surface med reminders as tasks.
- Reminders: wired into the existing `src/lib/reminders.ts` notification system so due doses fire in-app/browser notifications with snooze.
- A **Symptoms & capacity** logger (quick-add on the Care hub and on each person's dashboard): symptom, severity, capacity slider, note. A small trends view shows the last 14 days as a dot/line chart per person so patterns are visible — reusing the existing person trends card styling.

## 4. Grocery card on Today

- Upgrade the existing grocery widget into a proper Today dashboard card: inline editing (tap a name to edit it in place, qty, category chip), swipe/check to buy with the gentle completion animation, delete, and inline add (already present). Keeps the "Open →" link to the full grocery page.

## 5. Query block polish (notes)

- Resizing: keep the drag-height handle, add a double-click to auto-fit content height.
- Consistent formatting across list / board / table: board cards and table cells get the same typography, spacing, and empty-state styling as the list view; board columns get headers with counts.
- Editing & selecting: clicking a row opens the same editor everywhere; table/board support the editable field cells already built for list view.
- Reorganizing: drag to reorder board columns' grouping and persist column order per block.

## Technical details

- New migration creates `medications`, `medication_logs`, `symptom_logs` with GRANTs + RLS + updated_at triggers, following the project's standard pattern. Client libs: `src/lib/medications.ts`, `src/lib/symptom-logs.ts`.
- `PlannerTaskRow` gains selection props (backwards-compatible — omitted everywhere else).
- Streak math reuses `src/lib/habit-consistency.ts`; no new dependencies.
- No edge functions needed; reminders use the existing client-side reminder system.
