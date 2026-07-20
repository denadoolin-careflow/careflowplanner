
## 1. Contextual "Quick Add" on the Calendar list

Add a **Quick Add** button to the toolbar of `CalendarAllList` (the unified list under the calendar grid) that pre-fills a new item using the list's currently active **date range filter** and **category filter**.

**Behavior**
- Button lives next to the existing Date range / Categories / Group by / Sort controls.
- Kind pre-selection rules:
  - If exactly one editable kind is toggled on (task, appointment, or caregiving) → open that editor directly.
  - If multiple kinds are on (or all) → show a small popover with three buttons: **Task**, **Appointment**, **Caregiving note**, then open the matching editor.
  - Non-editable kinds (birthday, holiday, meal, celebration, cosmic) are ignored for pre-selection; a Birthday/Holiday shortcut is offered only when one of those is the *only* active kind.
- Date pre-fill from the current date range:
  - `today` / `tomorrow` → that exact day.
  - `thisWeek` / `nextWeek` / `thisMonth` → first day of that range that is ≥ today.
  - `custom` → the `from` date (fallback to today).
  - `all` → today.
- Category pre-fill:
  - **Task / Caregiving note**: opens `TaskEditor` in "new" mode with `area="Caregiving"` when the caregiving kind is chosen, otherwise leaves area empty. `dueDate` = resolved date.
  - **Appointment**: opens `AppointmentEditor` in new mode with `date` = resolved date.
- After save, the list refreshes automatically (store is already reactive).

**Files touched**
- `src/components/calendar/CalendarAllList.tsx` — add toolbar button + popover, wire to a new `openQuickAdd()` that mounts existing `TaskEditor` / `AppointmentEditor` in create mode. Expose current `dateRange` + `kindFilter` (already in local state) to compute defaults.
- Reuse existing `TaskEditor` and `AppointmentEditor` (both already support create mode via `open`/`onOpenChange` — verify signatures during build; if create mode isn't exposed, add a thin `NewTaskDialog` / `NewAppointmentDialog` wrapper that calls `addTask` / `addAppointment` from `useStore`).

## 2. Planner integrated into Calendar Day / Week / Month / Year

Bring the `/planner` experience into `/calendar` so users can plan without leaving the calendar page.

**Toolbar**
- In `CalendarPage.tsx`, add a **"Planner"** toggle button (icon: `ListChecks`) next to the existing view switcher (Day / Week / Month / Year). Persist in `calendar-prefs` as `plannerOpen: boolean`.
- When enabled, the calendar splits into a resizable two-pane layout using the same `ResizablePanelGroup` pattern already used in `Planner.tsx`:
  - **Left pane (default 320px, collapsible)**: `PlannerTaskPanel` — the unscheduled/backlog task list with inline NLP quick capture, filtering, and tag chips (reuse component as-is).
  - **Right pane**: the current calendar view (Day/Week/Month/Year grid), unchanged.

**Drag & drop parity across all four views**
- Day view: already drops onto `TimeGrid` — no change.
- Week view: extend existing week grid drop handlers to accept the same `application/x-careflow-task` MIME the planner uses, mapping drop y-position to hour (reuse `useLongPressDrag` helpers already imported).
- Month view: reuse the drop logic in `MonthGridView.tsx` (already accepts task MIME) — no change beyond ensuring the shared MIME constant.
- Year view: each mini-month cell accepts task drops → sets `dueDate` only (no time), same pattern as month view.

**Shared "Plan My Day" entry point**
- Add a `Plan my day` button in the calendar toolbar (visible only when Planner pane is open, and only in Day view) that opens the existing `PlanMyDayDialog` scoped to `cursor`.

**Mobile**
- On `useIsMobile()`, the Planner pane becomes a `Sheet` that slides in from the left, triggered by the same toolbar button. The calendar view stays full-width underneath.

**Files touched**
- `src/pages/CalendarPage.tsx` — toolbar button, `ResizablePanelGroup` wrapper around existing view render, mobile sheet fallback, plumb `cursor` to `PlanMyDayDialog`.
- `src/lib/calendar-prefs.ts` — add `plannerOpen` + `plannerPanelSize` (persisted).
- `src/components/calendar/WeekGrid` (or equivalent used inside `CalendarPage` week branch) — add drop handlers for task MIME.
- Year mini-month cells inside `CalendarPage.tsx` — add drop handlers.
- No new copies of PlannerTaskPanel / PlanMyDayDialog — import the existing components.

## Technical notes

- All new state persists to `localStorage` via existing prefs hooks; no schema/DB changes.
- Uses only frontend/presentation code + existing store actions (`addTask`, `addAppointment`, `updateTask`).
- Category color styling for the Quick Add popover buttons pulls from `useKindColors` so it matches the user's palette.
- No changes to auth, RLS, or edge functions.
