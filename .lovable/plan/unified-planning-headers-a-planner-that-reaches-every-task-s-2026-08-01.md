# Unified planning headers + a planner that reaches every task source

## What you'll see when this is done

**One header everywhere.** Today, Week, and Month get the exact same top bar: prev / date-picker / next, a Today shortcut, the Today·Week·Month scope pills, a view toggle for that page, and a single preferences gear. Same order, same sizes, same behaviour on mobile and desktop.

**One task drawer everywhere.** The planner's task panel becomes the shared "sources" panel: Inbox, Today, Upcoming, Someday, Areas, and Projects — each a collapsible group you can search, filter, and drag straight onto the time grid. The same panel appears on Today (focus rail / mobile sheet), on the Planner page, and as the schedule pane on Inbox.

**Home and Meals live in the plan.** Breakfast / lunch / dinner already pin to the grid; they get a proper editor popover with the meal library picker, and home-reset chores plus due home-maintenance items show up as a "Home" source group you can drag onto a time slot like any other task.

## Current state (verified)

- `Today.tsx` uses `TodayHeader` (its own bar with date nav + `ScopeSegmented` + layout tabs + prefs popover).
- `Week.tsx` and `Month.tsx` use `PlanningHeader` + `ScopeHero`, which carry a *different* nav toggle (`ScopeNavToggle`), a greeting hero, and their own `CalendarViewToggle` / `QuickAddCalendarPopover`. So there are two scope toggles and two header systems in the app.
- `PlannerTaskPanel.tsx` already groups Inbox / Today / Upcoming / Someday / Areas — but has no Projects group and is only mounted inside `Planner.tsx`.
- `PlannerMealLane.tsx` renders breakfast/lunch/dinner chips on the grid with a plain text input; it does not use the meal library.

## Plan

### 1. Shared header component
- New `src/components/layout/PlanHeader.tsx`: sticky bar with date nav (prev / picker / next / "Today"), scope pills, a `views` slot, an `actions` slot, and a prefs popover slot.
- Retire `ScopeNavToggle` in favour of `ScopeSegmented` so there is one toggle component.
- `TodayHeader` becomes a thin wrapper over `PlanHeader` (Plan/Board tabs + existing prefs). Week and Month pass their `CalendarViewToggle` into the `views` slot and their page options into the prefs popover.
- `ScopeHero` keeps the greeting/atmosphere content but loses its nav row and quick-add (header owns those). `PlanningHeader` drops its duplicate centered toggle.

### 2. Shared task-source panel
- Rename/extend `PlannerTaskPanel` into `src/components/planner/TaskSourcePanel.tsx`:
  - add **Projects** groups (from `state.projects`) alongside the existing Areas groups
  - add a **Home** group (home-reset chores + due maintenance) and a **Meals** group (unplanned meals for the day)
  - keep search, sort, tag filter, inline NLP add, drag-to-grid
- Mount it in three places: Planner (left column, unchanged), Today (inside the focus rail on desktop, in the mobile plan sheet), Inbox (replacing the bespoke schedule pane so drag-to-schedule works identically).

### 3. Home + Meals on the grid
- Upgrade the meal chip popover in `PlannerMealLane` to use `MealPickerPopover` (library + favourites + free text) instead of a bare input.
- Home chores dragged from the Home group create timed blocks the same way tasks do.
- Add a Home/Meals visibility toggle to the planner preferences so the lanes can be hidden.

### 4. Consistency pass
- One quick-add entry point per page (the header's), removing `QuickAddCalendarPopover` duplication on Week/Month.
- Same card/rounding/spacing tokens across the three pages; verify keyboard focus order and ARIA on the new header and panel.

## Technical notes

- No schema changes; everything reads from the existing store (`tasks`, `meals`, `projects`, home-reset/maintenance libs) and existing prefs hooks (`today-view`, `planner-prefs`, `inbox-planner-prefs`).
- Header preferences stay per-page: shared shell, page-specific contents, so no pref migration.
- Files touched: `Today.tsx`, `Week.tsx`, `Month.tsx`, `Planner.tsx`, `Inbox.tsx`, `TodayHeader.tsx`, `ScopeHero.tsx`, `PlanningHeader.tsx`, `ScopeNavToggle.tsx` (removed), `PlannerTaskPanel.tsx`, `PlannerMealLane.tsx`, plus two new components.
