# CareFlow → Interactive Productivity Upgrade

This is a very large, multi-area request. To keep quality high and avoid a half-finished mega-PR, I'll ship it in **5 focused phases**. Each phase is independently usable and testable. After each phase you can say "continue" to move to the next, or reorder them.

---

## Phase 1 — Foundations: Universal Task Row + Schedule Icon + Quick Edit
The base layer that the rest of the work plugs into.

- **`<TaskRow>` upgrade (single source of truth)** used everywhere (Today, Inbox, Upcoming, Anytime, Someday, Logbook, Projects, Goals, Calendar tasks panel, Kanban, widgets):
  - Click → opens TaskEditor (already exists)
  - Inline title edit on double-click / Enter
  - Long-press / right-click / hard-press → **QuickEditPopover** (priority, project, goal, area, tags, recurring, day-part, reschedule)
  - Long-press drag (uses existing `useLongPressDrag`) extended to accept generic drop targets
  - Hover row gets soft elevation + glow (sage/gold), grip handle reveals on hover
  - Soft haptic on mobile (existing `haptics`)
- **Smart Schedule icon** (`<QuickScheduleButton>`) shown on hover/focus of every task row:
  - Animated calendar icon → radial/floating popover
  - Today / Tomorrow / This Week / Next Week / This Month / Someday / Pick Date
  - Writes through `updateTask` (cascades to calendar, agenda, project, goal automatically)
- **`<QuickEditPopover>`**: compact card with priority chips, project select, goal select, area chips, tag input, recurrence toggle, day-part chips. Opens with scale-in animation.

**Files**: new `src/components/tasks/QuickScheduleButton.tsx`, `src/components/tasks/QuickEditPopover.tsx`, edits to `src/components/cards/TaskRow.tsx`, small CSS tokens in `src/index.css`.

---

## Phase 2 — Calendar: Drag, Resize, Snap, Now-Line
- Tasks dragged from sidebar → snap to hour grid (already partially in `TimeGrid`); extend to **30-min snap with shift-key for 15-min**
- Existing time blocks: drag to move, drag bottom edge to resize, both snap to grid
- Animated drop placeholder + drag shadow
- Persistent **current-time line** across day & week
- Hover highlight on hour cell
- Soft haptic on snap (existing `haptics.snap`)

**Files**: `src/components/calendar/TimeGrid.tsx` (significant), small additions to `src/lib/time-blocks.ts`.

---

## Phase 3 — Grouping, Filtering, Sorting (persisted)
- New `<TaskListControls>` with **Group by / Filter / Sort** menus
- Group by: project, area, priority, date, energy, status
- Filter by: area, project, due-date range, tags, goal, habit
- Sort by: due date, priority, manual, alphabetical, energy, est. minutes
- Persisted per-page in `localStorage` (key includes page id)
- Applied on Anytime, Upcoming, Inbox, Project detail, Goal detail

**Files**: new `src/components/tasks/TaskListControls.tsx`, `src/lib/task-grouping.ts`, edits to `TaskListPage.tsx`, `Inbox.tsx`, `ProjectDetail.tsx`, `Goals.tsx`.

---

## Phase 4 — Anytime/Upcoming Tabs + View Modes + Kanban
- Tabbed timeframe filter: **Today / Tomorrow / This Week / Next Week / This Month** (animated underline)
- View toggle: **List / Agenda / Kanban** (persisted)
- New **`<KanbanBoard>`**:
  - Default columns: Inbox, Today, Upcoming, In Progress, Waiting, Done
  - Drag cards between columns (updates status / due date accordingly)
  - Drag columns to reorder, collapse/expand, horizontal scroll on mobile
  - Inline quick-add per column
  - Group-by + sort options reuse Phase 3 controls
- Kanban also exposed on Projects page as a per-project board

**Files**: new `src/components/tasks/KanbanBoard.tsx`, `src/components/tasks/KanbanColumn.tsx`, `src/components/tasks/KanbanCard.tsx`, edits to `Anytime.tsx`, `Upcoming.tsx`, `ProjectDetail.tsx`.

---

## Phase 5 — Linking & Progress + Inbox NLP polish
- TaskEditor: link to project / goal / area / habit (already partial — finish UI)
- **Auto progress rollups**:
  - Project completion % = done child tasks / total
  - Goal progress % = avg of linked projects + manual override
  - Surfaced in sidebar Goals/Projects tabs and Project/Goal detail pages
- Improve **Inbox NLP** (`src/lib/nlp-task.ts`) to recognize "today", "tomorrow", "this week", "this month", "next month" and assign `dueDate` accordingly so inbox capture pre-routes itself

**Files**: edits to `TaskEditor.tsx`, `ProjectDetail.tsx`, `Goals.tsx`, `src/lib/nlp-task.ts`, `src/lib/store.tsx` (derived selectors).

---

## Visual language (applies to all phases)
- Sage green primary, warm tan/gold accents, soft cream surfaces, dark plum text — already in tokens; no new colors
- Rounded-2xl cards, subtle inner border, layered shadow on drag (`shadow-elegant`)
- 200–300ms cubic-bezier transitions, `animate-fade-in` / `animate-scale-in` on popovers
- Glassmorphism on popovers (`backdrop-blur` + `bg-card/80`)

## Out of scope (call out)
- No backend schema changes — everything maps onto existing `tasks`, `projects`, `goals`, `time_blocks` tables.
- No new AI endpoints in this batch (existing AI features stay).

---

**I'll start with Phase 1** as soon as you approve. Reply "go" to ship Phase 1, or tell me to reorder / drop phases.