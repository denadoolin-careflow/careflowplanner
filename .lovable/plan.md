# Planner: per-view layouts, bulk scheduling, smarter conflicts, recurrence, Tana-inspired ideas

## What you get

1. **Column layout saved per view** — the Table view's chosen columns, their order, and the sort option are remembered separately for each range (day, week, month, year) instead of one shared setting. Same for the List view's sort.
2. **Multi-select + bulk actions in weekly views** — checkboxes (and shift-click ranges) in List and Table, plus a bulk bar to move the selected tasks to a different day, day-part (morning/afternoon/evening), or a specific time range, all snapped and conflict-checked.
3. **Conflict dialog that shows the clash** — the dialog lists the actual conflicting item(s) with their times, and offers one-tap **Swap times**, **Shift to nearest free slot**, or **Schedule anyway**.
4. **Recurring tasks in quick add and weekly views** — a repeat control (daily / weekly / monthly / custom interval, plus weekdays) in quick add and in the row quick-actions, so meds refills and weekly resets reappear automatically after completion.
5. **List and Table for day, month, and year too** — the same filter bar, columns, sorting, selection, and drag-scheduling behaviour available in the week views, wired into the day, month, and year ranges.
6. **Tana research write-up** — a recommendations section (below) you approve before anything from it is built.

## Current state confirmed

- `src/lib/planner/table-columns.ts` persists one global `careflow:planner:table-columns` key — no per-view scoping.
- `src/lib/task-selection.tsx` already provides selection with shift-range, select-mode, and `BulkActionBar` exists for task pages, but weekly planner views don't use either.
- `useScheduleDrop` finds a single conflict and `ScheduleConflictDialog` shows only its title/range with "pick later / use suggestion / schedule anyway" — no swap, no list of clashes.
- Tasks already support `recurrenceType` / `recurrenceInterval` / `recurrenceDays` end-to-end, and `store.tsx` rolls the due date forward on completion — so recurrence is a UI-surfacing job, not new backend work.
- `Planner.tsx` renders List/Table only for `view === "week"`; day/month/year have their own components.

## Technical approach

- **Per-view config**: change `table-columns.ts` to key by scope (`careflow:planner:table-columns:{day|week|month|year}`), with `useTableConfig(scope)`; existing single-key data migrates into the `week` scope on first read.
- **Bulk actions**: wrap the weekly List/Table in the existing `TaskSelectionProvider`, add a `PlannerBulkBar.tsx` (move to day, set day-part, set time range, clear) that loops selected ids through a new `scheduleMany()` on `use-schedule-drop.ts`, collecting conflicts into one prompt instead of one dialog per task.
- **Conflict upgrade**: return all overlapping blocks from `findConflict` (new `findConflicts`), extend `PendingConflict` with `clashes[]` and a `swapWith` candidate; `ScheduleConflictDialog` renders the clash list with per-item **Swap** and a **Shift to nearest free slot** action driven by `nextFreeSlot`.
- **Recurrence UI**: a small `RecurrencePicker.tsx` reused by `MobileQuickAdd`, the command-palette quick add, and `TaskQuickActions`, writing the existing recurrence fields; a repeat glyph shows on rows that recur.
- **List/Table everywhere**: extract the current week List/Table into range-agnostic components fed by the planner feed for an arbitrary date range, then add List/Table entries to the day, month, and year mode tabs, sharing `PlannerWeekFilterBar` (renamed `PlannerFilterBar`).

## Tana research — recommended features (not built unless you say so)

Tana's core ideas and how they'd land in CareFlow:

- **Supertags** — a tag that carries a schema. In CareFlow: tagging a task `#med-refill` auto-applies fields (dose, pharmacy, refill cadence) and a default recurrence. Best fit for your caregiving and reset routines.
- **Fields on items** — typed key/value pairs rather than free text. Would let the Table view show real columns per tag (e.g. `#appointment` rows expose Provider and Location).
- **Live search views** — a saved query that stays current, rendered as list/table/board/calendar. This is the natural evolution of the filter bar: save "high energy · Care area · this week" as a named view you can pin to Today.
- **One node, many views** — the same item shown in list, table, or board with no duplication. Your planner already has one feed, so switching layouts per range (item 5 above) is the first step toward this.
- **Zoom-in / outline nesting** — click any task to make it the root and work only its subtree. Would suit projects and multi-step care tasks.
- **Bidirectional references and backlinks** — `@task` / `@note` mentions in notes and journals that show a "linked from" list on the target. You already have `@today` date refs; extending to entities gives Tana-style knowledge linking.
- **Inline queries inside notes** — embed "open tasks in Care this week" into a daily note so the note stays live.
- **Tag-scoped templates** — applying a supertag inserts its checklist (e.g. `#weekly-reset` seeds its steps), replacing part of the current templates menu.

My suggested order if you want these: live saved views → tag fields/supertags → backlinks → inline queries → zoom-in.

## Note

Items 1–5 are ready to build once approved. Item 6 is research only; tell me which Tana ideas to schedule and I'll plan them separately.
