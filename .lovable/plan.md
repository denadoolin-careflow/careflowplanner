# Outliner-grade planner: fields as columns, live embeds, backlinks, zoom, folders

Six related pieces. Each phase is usable on its own; later phases reuse earlier plumbing.

## Phase 1 — Tag fields as Table columns

Custom fields already exist (`tag_fields` schema + `item_field_values` per item), but the
weekly Table view only knows built-in columns.

- When a tag filter is active (or a tag is picked in the column menu), that tag's fields
  appear in the column picker as real columns — Provider, Location, Dose.
- Columns show, reorder, hide, and sort like built-in ones, per range (day/week/month/year),
  using the persistence already in place.
- Values are editable inline in the cell (text/number/date/select/checkbox/link).
- Empty cells render as a muted dash so rows stay scannable.

## Phase 2 — Live query embeds in notes

An `/query` block inside a note that runs a saved view (or an ad-hoc filter):

- Insert via slash menu: "Live query" → pick a saved view or build a quick filter.
- Renders live results in list or table form, re-running whenever the note is opened and
  when tasks change in the shared task store — no snapshot, no stale copy.
- Checkboxes, due-date chips, and priority edits inside the embed write straight to the
  real task.
- Block stores only the view id (or the filter JSON), so editing the saved view updates
  every note that embeds it.

## Phase 3 — One node, many views

Today, List, Table, and Board each shape their own rows.

- All weekly views read the same normalized feed and render from one shared row model,
  so a task appears exactly once per view with identical fields.
- Edits made anywhere (inline title, checkbox, day-part drag, field value) update the
  shared store and repaint every open view immediately.
- Selection and bulk actions carry across views — select in List, switch to Table, the
  selection survives.

## Phase 4 — Bidirectional references and backlinks

`@` mentions already resolve entities, and link rows are recorded — the missing half is
the reverse lookup.

- Every task, note, project, and person detail surface gets a "Linked from" section
  listing the notes, journals, and tasks that mention it, with a snippet and a jump link.
- Mentions typed in the editor create the link row on save; deleting the mention removes it.
- Counts show as a small chip ("3 mentions") so an unreferenced item stays quiet.

## Phase 5 — Zoom-in outline nesting

- Click a task's zoom control to make it the root: the view shows only its subtree —
  subtasks, linked notes, its fields, its schedule.
- A breadcrumb walks back up to the full range.
- Collapse/expand carets on any parent row, with the open/closed state remembered.
- Works in List, Table, and Board; the Schedule grid stays chronological but filters to
  the zoomed subtree.

## Phase 6 — ClickUp-style Spaces, Folders, and Lists

Projects today are a flat list. ClickUp's hierarchy is Space → Folder → List → Task, with
per-list views and statuses.

- Add **folders** above projects: a sidebar tree of folders containing projects, drag to
  reorder and re-nest, collapse state remembered.
- Each project gets its own view tabs (List, Board, Table, Calendar) reusing the planner
  view components rather than a separate implementation.
- Per-project custom statuses (e.g. To do → In progress → Waiting → Done) with a Board
  column per status.
- A folder rollup screen: task counts, overdue, and progress across the projects inside it.

## Technical approach

- **Table columns**: extend `TableColumnId` with dynamic `field:<tagId>:<key>` ids appended
  to `ALL_COLUMNS` when tags are active; batch-load `item_field_values` for the visible rows
  in one query keyed by entity id; sorting compares typed values, not raw JSON.
- **Query embeds**: new Tiptap node `queryBlock` in `BlockEditor.tsx` storing
  `{ savedViewId? , filters? , layout }`, rendered by a shared `SavedViewRunner` component
  that also powers the pinned views in the planner.
- **Unified rows**: promote `src/lib/planner/feed.ts` output to the single row model used by
  `PlannerWeekList`, `PlannerWeekTable`, and `PlannerWeekBoard`; lift selection into a shared
  context.
- **Backlinks**: query `note_links` / `task_links` by `entity_type + entity_id` for the
  reverse direction; new `useBacklinks(entityType, entityId)` hook plus a `BacklinksSection`
  component reused across detail surfaces.
- **Zoom**: derive the subtree from the existing `parent_task_id` relation; zoom root and
  collapsed-ids live in planner prefs so they survive reloads.
- **Folders**: new `project_folders` table (name, parent_id, sort_order, color) and a
  `folder_id` on `projects`; per-project statuses stored as an ordered JSON list on the
  project row. Standard RLS scoped to `auth.uid()` with the usual grants.

## Suggested order

1 and 3 first (columns are more useful once the views share a row model), then 4, then 2,
then 5, then 6 — Phase 6 is the largest and is best done on its own. Say the word if you
want a different order or a phase dropped.
