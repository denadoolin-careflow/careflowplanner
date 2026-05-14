# Phase 2 — Things-style Hierarchy

Add **Areas → Projects → Tasks → Subtasks** to CareFlow without breaking the existing dashboard, Today/Week/Month, or current task data.

## What changes

### 1. Database (additive, no destructive edits)

New tables:

- `areas` — user's top-level life buckets (we already have a fixed `Area` enum in code; this gives them custom name/icon/color/sort and lets us add more). Seeded from existing 10 areas on first load.
  - `id, user_id, name, icon, color, sort_order, is_archived, created_at, updated_at`
- `projects` — Things-style projects inside an area.
  - `id, user_id, area_id (nullable), name, notes, icon, color, status (active|paused|done|someday), deadline, sort_order, archived_at, created_at, updated_at`

Extend `tasks`:
- `project_id uuid` (nullable — null = loose task in inbox/area)
- `parent_task_id uuid` (nullable — enables **subtasks**, single level deep for now)
- `inbox bool default false` (Things "Inbox" until triaged)

Extend `quick_add_presets`:
- `default_project_id` already exists ✅

RLS: own-row policies mirroring existing tables.

### 2. Store + types

- `Area` stays as the enum label, but we add `AreaRecord`, `Project`, and `subtasks: Task[]` derivation.
- `useStore` gets: `areas`, `projects`, `addProject`, `updateProject`, `archiveProject`, `addSubtask`, `moveTask({projectId, parentId, areaName})`.
- Existing `tasks` array unchanged in shape — just two new optional fields, so all current widgets keep working.

### 3. Navigation (Things-style left rail)

Update `src/lib/nav.ts` + `Sidebar.tsx`:

```text
Inbox
Today
Upcoming
Anytime
Someday
Logbook
─────────
Areas
  ▸ Family
      • Summer trip      ← project
      • Doctor visits
  ▸ Home
      • Kitchen reno
  …
```

Areas expand to show their projects. Projects route to a new `/projects/:id` page. Each list (Inbox/Today/Upcoming/Anytime/Someday/Logbook) is a filtered view over `tasks`.

### 4. New pages

- `/inbox` — `tasks` where `inbox=true` and not done
- `/upcoming` — due in future, grouped by date
- `/anytime` — no due date, has project or area, not someday
- `/someday` — `status='someday'`
- `/logbook` — `done=true`, grouped by completion week
- `/projects/:id` — project header (progress ring, deadline, notes), task list with inline add, subtask expand/collapse, drag-to-reorder

Today/Week/Month pages unchanged — they keep filtering by `dueDate`.

### 5. Quick Add wiring

`QuickAddFab` already parses NLP. Add:
- A **project picker** row in the palette (shows after typing or via `/project name`)
- New tokens in `nlp-task.ts`: `+ProjectName` → resolves to project, falls back to area
- Default routing rules:
  - No date + no project → **Inbox**
  - Date set → **Today/Upcoming** (unchanged behavior)
  - `someday` token or `~someday` → `status='someday'`
- Presets with `default_project_id` drop the new task straight into that project.

### 6. Subtasks UI

`TaskRow` gets a chevron when `subtasks.length > 0`, expanding indented `TaskRow`s. A `+ subtask` button appears on hover. Subtasks inherit `project_id` and `area` from parent.

## Migration order

1. SQL migration: create `areas`, `projects`, alter `tasks`, alter `quick_add_presets` (no-op if already there).
2. Backfill: seed `areas` rows from the 10 enum values per user on first store load.
3. Store + types update.
4. Sidebar + nav update + new list pages.
5. `/projects/:id` page.
6. Quick Add project picker + NLP `+project` token.
7. Subtask expand in `TaskRow`.

## Out of scope this round

- Drag-and-drop between projects (queued for Phase 3 calendar pass — easier to do alongside the unified scheduler)
- Multi-level nested subtasks (single level only for now)
- Migrating existing journal/ideas into projects (Phase 4)

## Questions before I start

1. **Areas as records vs. enum** — OK to introduce the `areas` table and let users rename/add/reorder them, while keeping the existing 10 as defaults? (Recommended — required for true Things-style.)
2. **Inbox default** — should *all* new tasks with no date and no project land in Inbox, or only ones created via Quick Add without context?
3. **Logbook retention** — keep completed tasks forever, or auto-archive after 90 days?
4. **One PR or two?** — bundle schema + nav + pages + Quick Add together (one big batch, ~10 files), or split into (a) schema + store + sidebar, then (b) project page + quick add + subtasks?
