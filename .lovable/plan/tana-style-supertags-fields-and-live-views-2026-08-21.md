# Tana-style supertags, fields, and live views

A phased build. Each phase ships something usable on its own, and later phases
depend on the data model created in Phase 1.

## Phase 1 — Supertags with a schema

Tags today are name + color + icon (`public.tags`). A supertag adds:

- **Field schema**: an ordered list of typed fields (text, number, date, time,
  select, checkbox, person, money). Example `#med-refill`: dose (text),
  pharmacy (select), refill cadence (select).
- **Defaults**: default recurrence, default area, default energy/duration,
  default priority — applied when the tag is added to a task.
- **Checklist template**: steps seeded onto the item when the tag is applied
  (`#weekly-reset` seeds its steps as subtasks).

**Settings UI**: a "Supertags" section inside the existing tag manager — pick a
tag, add fields, set defaults, write the checklist. Plain tags stay plain; a tag
only becomes a supertag when you give it a schema.

**Applying**: when you add a supertag to a task (quick add, task editor, planner
row), a small field card appears inline under the title with just that tag's
fields, and the defaults/checklist apply once with an undo toast.

## Phase 2 — Fields on items

Typed key/value pairs stored per item, per tag. Once fields exist:

- The **Table view** offers the fields of any tag you filter by as real columns
  (filter to `#appointment`, gain Provider and Location columns).
- Fields are filterable and sortable like built-in columns.
- Fields render as compact chips on cards and rows, editable in place.

## Phase 3 — Live search views

Save the current filter set as a named view, choose its layout
(list / table / board / calendar), and reuse it anywhere:

- Save from the planner filter bar: "high energy · Care · this week".
- Pin a view to Today, or to the planner sidebar, where it stays current.
- Views are shareable across ranges — the same saved query renders as a list on
  mobile and a table on desktop.

Builds directly on the per-range layout switching and filter bar already in the
planner, which is the "one node, many views" foundation.

## Phase 4 — Zoom-in / outline nesting

Click any task to make it the root and see only its subtree: subtasks, linked
notes, its fields, and its schedule. A breadcrumb walks back up. Suits projects
and multi-step care tasks. Uses the existing `parentTaskId` relationship.

## Phase 5 — References and backlinks

`@` mentions in notes and journals already resolve dates; extend them to
entities (tasks, projects, people, meals, appointments). Every target then shows
a "Linked from" list — notes and journals that mention it — using the existing
`note_links` / `task_links` tables.

## Phase 6 — Inline queries in notes

An `/query` block inside a note that embeds a saved view (or an ad-hoc filter):
"open tasks in Care this week" stays live inside a daily note, with checkboxes
that write back to the real task.

## Technical approach

- **Schema**: new `tag_fields` (tag_id, key, label, type, options, sort_order,
  required) and `tag_defaults` columns on `public.tags` (default recurrence,
  area, energy, est_minutes, checklist jsonb). Item values live in
  `item_field_values` (entity_type, entity_id, tag_id, field_key, value jsonb)
  so any entity — not just tasks — can carry fields. RLS scoped to `auth.uid()`
  with the standard grants.
- **Client**: extend `src/lib/tags.ts` + `useTags` with the schema; new
  `src/lib/tags/supertag.ts` for applying defaults/checklists; new
  `src/lib/fields.ts` hook for reading/writing item values in one batched query
  per view.
- **Table columns**: `src/lib/planner/table-columns.ts` gains dynamic column ids
  (`field:<tagId>:<key>`) appended to `ALL_COLUMNS` when a tag filter is active,
  reusing the per-range persistence just added.
- **Saved views**: new `saved_views` table (name, scope, layout, filter json,
  pinned) plus a "Save view" control in `PlannerWeekFilterBar`, and a view
  runner component shared by the planner, Today, and note embeds.
- **Notes**: extend the existing `refMention` Tiptap node to resolve entities,
  and add a `queryBlock` node that renders the saved-view runner.

## Suggested order

Phases 1 and 2 together give the biggest payoff (supertags are not much use
without fields), then 3, then 5, then 4 and 6. Tell me if you want a different
order or want a phase dropped.
