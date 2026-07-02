
## Goals

Turn the Today page into a fully editable, xTiles-style tile board where every card can be resized, removed, added, and rearranged, and every task-like row (Schedule, Today's Progress, Upcoming, In-Progress Projects, Current Project Focus next steps) uses the same inline NLP quick-add and hover actions as the Inbox.

## 1. Inline NLP quick-add on task-like cards

Reuse `NlpHighlightedInput` + `parseNlpTask` (already used in Inbox) so every card that lists tasks/events gets the same "+ Add task" affordance:

- **ScheduleColumn (Morning/Afternoon/Evening)** — add a hover-revealed `+ Add to morning/afternoon/evening` row at the bottom of each slot. Enter parses NLP (date/time/priority/#tag/@person), auto-fills `dueDate = today` and `dueTime` snapped into the slot's window (M 6–12, A 12–17, E 17–22), then `createTask`.
- **ProgressTasksColumn (Today's Progress by category)** — same inline composer per category, pre-tagging the new task with that category/area.
- **UpcomingColumn** — inline composer defaulting `dueDate = tomorrow`; NLP overrides parsed date.
- **InProgressProjectsCard rows** — clickable rows that open the project; hover reveals `+ Add task` that creates a task linked to that project.
- **CurrentProjectFocusCard "Next Steps"** — inline composer that creates a subtask/linked task under the focused project.

All rows get the same `TaskHoverActions` (when, priority, snooze, complete, delete) used in `InboxOverview`, plus consistent completion checkbox, wrapped title, and click-to-open editor via `openTaskEditor`.

## 2. Current Project Focus improvements

`CurrentProjectFocusCard`:
- Dropdown items show project icon/emoji only (no "Project:" label prefix); selected trigger shows icon + name.
- On change, refetch and rerender the Next Steps checklist for that project (top ~5 open tasks by due/priority).
- Add a one-line **"Why this matters today"** hint under the title: derived locally from project metadata — nearest milestone/due date, count of overdue tasks, or the project's stated outcome. If a lightweight AI hint is desired later, wire to `ai-project-overview`, but v1 stays local so it's instant and free.
- Rows are clickable (open task editor) and support hover actions.

`InProgressProjectsCard`:
- Each project row is individually clickable → navigates to `/projects/:id` (or opens project sheet).
- Hover reveals: set as focus, quick-add task, open.
- Replace text labels in front of names with the project icon component (`project-icon.tsx`).

## 3. Customizable Goal Check-In

`GoalCheckInCard`:
- Add a settings popover: choose which goals appear, reorder them, pick metric type per goal (progress %, streak, count, custom target), and set daily target.
- Persist to `localStorage` under `careflow:today:goal-checkin:v1` (goals list + per-goal config).
- Inline edit progress by clicking the ring/number (same pattern as `MetricStepper`).

## 4. xTiles-style editable widget grid

Research note: xTiles uses a freeform tile canvas where each block (note, list, embed) is drag-resizable on a snapping grid, addable from a "+" palette, and removable/duplicatable via hover controls — layout persists per page.

Apply that model to Today. The project already has `dashboard-pack.ts` (bin-packing) and `useDailyPlanLayout` — build on them rather than adding a new grid lib.

- Wrap every RhythmDashboard card (Intention, Check-In, Goals, Schedule, Habits, Progress, Meals, Grocery, Projects, Current Focus, End-of-Day Exhale, plus the header triptych pieces) in a shared `<TileFrame id title>` that provides:
  - Drag handle (top-left, appears on hover / edit mode).
  - Resize handle (bottom-right) with size steps `S / M / L / XL` mapped to grid `w` (1–4 cols) and `h` (1–3 rows).
  - Hover menu: collapse, hide, duplicate, settings (opens the card's own settings if it has one, e.g. Goal Check-In config).
- Add a top-right **Edit layout** toggle on Today. In edit mode: dashed outlines, drag/resize enabled, and a `+ Add tile` palette listing hidden/available tiles (grouped by Planning, Wellness, Schedule, Projects, Kitchen).
- Persist layout `{ order, sizes, hidden }` to `localStorage` under `careflow:today:tiles:v1`; add **Reset layout**.
- Reuse `compactLayout` from `dashboard-pack.ts` so tiles reflow with no gaps after resize/remove.
- Mobile: force single-column stack; edit mode allows reorder + hide only (no resize).

## 5. Technical outline

Files to add:
- `src/components/today/tiles/TileFrame.tsx` — drag/resize/hover chrome.
- `src/components/today/tiles/TileGrid.tsx` — grid container using `compactLayout`.
- `src/components/today/tiles/tile-registry.ts` — id → {title, defaultSize, render}.
- `src/lib/today-tiles.ts` — layout persistence hook (order, sizes, hidden), mirroring `widget-order.ts`.
- `src/components/common/InlineTaskComposer.tsx` — shared NLP composer (wraps `NlpHighlightedInput` + `parseNlpTask` + `createTask` with per-slot defaults).
- `src/lib/goal-checkin-prefs.ts` — customization persistence.

Files to update:
- `src/components/today/RhythmDashboard.tsx` — render through `TileGrid`; drop bespoke column layout.
- `ScheduleColumn`, `UpcomingColumn`, `ProgressTasksColumn`, `InProgressProjectsCard`, `CurrentProjectFocusCard`, `GoalCheckInCard` — add inline composer, hover actions, click-to-open, icon-only project labels, customizable goals.
- `src/pages/Today.tsx` — add "Edit layout" toggle in the existing controls row.

No backend or schema changes; all customization lives in `localStorage` alongside existing Today prefs.

## Out of scope

- Freeform (non-grid) canvas positioning — sticking to snap grid to match the rest of CareFlow.
- Cross-page tile sharing (Week/Month/Year keep their existing `WidgetRail`); can be a follow-up once the Today model settles.
- New AI calls; "why this matters today" is derived locally in v1.
