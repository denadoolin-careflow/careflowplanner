## Task Views Overhaul — Grouping, Sorting & Visible Field Options

Implements the next phase: full grouping/sorting across all task views (List, Grid, Board, Schedule, Calendar) plus a per-view-type "View Options" menu for toggling visible fields. Tag chips become first-class on every task surface.

### 1. Expanded grouping modes

Extend `GroupMode` in `src/lib/task-grouping.ts` from the current set to:
`none | section | dueDate | tag | project | priority | energy | status | area`

- **Tag grouping**: tasks with multiple tags appear in each matching group; untagged → "No tag" bucket.
- **Due date**: Overdue / Today / Tomorrow / This week / Later / No date.
- **Energy**: High / Medium / Low / Unset.
- **Status**: Todo / In progress / Done / Cancelled.
- **Project / Area / Priority**: bucket by entity, with "None" bucket.

### 2. Expanded sort options

In `TaskSortMenu.tsx`, add: Manual, Due date, Priority, Energy, Created, Updated, Title (A→Z), Project, Estimated minutes. Direction toggle (asc/desc). Sort applies inside each group.

### 3. View Options menu (per view type, global)

New `src/components/tasks/ViewOptionsMenu.tsx` — gear icon next to the view switcher. Toggles for visible fields:
`tags · priority · dueDate · project · area · energy · estMinutes · icon · cover · checkbox · description · createdAt`

Stored globally per view type in `localStorage`:
- `careflow:view:list` · `careflow:view:grid` · `careflow:view:board` · `careflow:view:schedule` · `careflow:view:calendar`

New hook `src/hooks/useViewPrefs.ts` exposes `{ visible, toggle, group, sort, setGroup, setSort }` for the current view type.

### 4. Tag chips on every task surface

- `KanbanBoard.tsx` card → render tag chips row when `visible.tags`.
- `AllTasksViews.tsx` list rows + grid cards → tag chips.
- `Schedule` and `Calendar` task chips → small tag dots/pills.
- Reuse existing tag color tokens.

### 5. Group + sort UI

Both controls live in `TaskListControls.tsx`:
- `Group by ▾` dropdown reflecting the new `GroupMode` set
- `Sort ▾` dropdown with field + direction
- Both persist via `useViewPrefs` keyed by current view type

Board view groups columns by the chosen mode (not just status) — e.g. "Group by priority" produces priority columns.

### Files

**New**
- `src/hooks/useViewPrefs.ts`
- `src/components/tasks/ViewOptionsMenu.tsx`
- `src/components/tasks/TaskFieldChips.tsx` (small shared renderer for chips row)

**Edited**
- `src/lib/task-grouping.ts` — new group modes + helpers
- `src/components/tasks/TaskListControls.tsx` — wire group/sort/view-options
- `src/components/tasks/TaskSortMenu.tsx` — expanded sort fields
- `src/components/tasks/KanbanBoard.tsx` — group-mode-driven columns, tag chips, respect `visible`
- `src/components/tasks/AllTasksViews.tsx` — apply `visible` + grouping to list/grid
- Schedule/Calendar task renderers — tag chips + `visible` flags

### Out of scope (next phases)

Table view, Timeline view, AI custom fields, knowledge graph — these come after this lands.
