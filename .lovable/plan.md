# Weekly views: columns, filters, drag scheduling, persistence

## What you get

1. **Table view you control** — pick which columns show (When, Item, Type, Status, Priority, Area, Energy, Duration, Project, Tags), drag to reorder them, and sort by any of them including time, priority, and area. Your column layout is remembered.
2. **Quick filter + search bar in every weekly view** (Schedule, Board, List, Table) — one shared control row with a search box and chips for area, priority, due date, and energy. Filters apply to whichever weekly view is open and persist between sessions.
3. **Drag-and-drop scheduling from Board, List, and Table** — drag a task onto a day/day-part (Board), a day header (List), or a day row (Table) and it schedules with the same snap step and conflict warning/resolution used by the Schedule view.
4. **Your weekly view is remembered** — Schedule / Board / Overview / List / Table sticks across reloads on both desktop and mobile (mobile currently resets to Board every load).
5. **Planned tasks on the Today planner page** — a "Planned today" strip beside the existing inbox rail showing tasks already scheduled for today, draggable onto the grid to move or re-time them.

## Current state confirmed

- `usePlannerWeekMode` already persists desktop week mode in localStorage; mobile uses plain `useState`, so it is lost on reload.
- `PlannerFeedItem` carries only kind/title/date/time/color/done — no priority, area, energy, or duration, so filters and the new columns need those fields threaded through.
- `PlannerKindFilter` filters by calendar kind only; there is no task-attribute filtering in weekly views.
- Snapping and conflict logic already exists in `src/lib/planner/time-snap.ts` and is used by the Schedule view and `ScheduleDropDialog`.

## Technical approach

- **Feed enrichment**: add optional `priority`, `area`, `energy`, `estMinutes`, `projectId`, `tags` to `PlannerFeedItem` in `src/lib/planner/feed.ts`, populated from the task record (undefined for events/meals/etc.).
- **New `src/lib/planner/week-filters.ts`**: persisted filter state (search, areas, priorities, dueRange, energy) plus a `filterFeedItems()` helper; reuses the shape of the existing `FilterState` in `task-grouping` where it lines up.
- **New `PlannerWeekFilterBar.tsx`**: search input + filter chips + active-count/clear, rendered above the weekly view content in `Planner.tsx` so all four views share it.
- **New `src/lib/planner/table-columns.ts`**: column definitions, visibility, order, and sort key persisted to localStorage; `PlannerWeekTable.tsx` renders from that config with a column picker popover and drag-to-reorder headers.
- **New `src/lib/planner/use-schedule-drop.ts`**: shared hook wrapping snap + `findConflict` + `nextFreeSlot` and the conflict prompt, so Board/List/Table drop handlers behave identically to the Schedule grid. Board drops target a day-part start, List/Table drops target the day (time picked via snap suggestion, conflict dialog when needed).
- **Persistence**: replace the mobile `useState` week mode with the same `usePlannerWeekMode` store (separate mobile key so desktop and mobile can differ but each is remembered).
- **Today page**: new `TodayPlannedRail.tsx` next to `TodayInboxRail` in `TodayPlanView.tsx`, using the existing drag payload format so grid drops reuse current handlers.

## Further planner recommendations (not built unless you say so)

- Multi-select on List/Table for bulk reschedule, complete, or move to a project.
- Keyboard scheduling: select a row, press a number key to drop it into that day.
- A saved "weekly view preset" combining view + filters + columns, like the saved filters on task pages.
- Week-over-week carryover prompt for unfinished tasks during the weekly review.
