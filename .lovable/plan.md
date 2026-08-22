# Supertags, fields, and a Tana-style tag workspace

Nine related improvements across the weekly views, backlinks, supertags, and
the tag page.

## 1. One task, one row, everywhere

The weekly List, Table and Board already share a selection store, but each view
still builds its own row from the feed. Move to a single source: one shared
hook that returns the task-backed rows for a range, and one mutation path for
toggling done, editing title, time, and duration. Any edit made in Table or
Board updates the same store record, so List reflects it immediately and a task
that matches two buckets (for example an overdue task also placed on today)
renders once, in its scheduled position only.

## 2. Jump-to links on backlinks

Each entry in "Linked from" becomes a one-click jump that opens the exact
mention: notes open at the note (journal entries open at their date), tasks open
their editor directly rather than dropping you on a list page. Each row also
gets a small "open" affordance and keyboard focus styling.

## 3. Supertag defaults on more than tasks

Tasks already absorb tag defaults on create. Extend the same merge to habits and
appointments so creating either with a supertag pulls in the tag's area,
energy, duration, priority and repeat.

## 4. Checklist template pre-fill

Today the checklist silently creates child tasks after save. Change it so that
as soon as a supertag is added in the task composer/editor, its checklist
appears as editable pre-filled subtask lines you can trim or add to before
saving — with a note of which tag contributed them.

## 5. Custom fields on the task detail page + filtering

Show the tag's typed fields in the task editor (they exist as a component but
aren't surfaced on the detail page), grouped per tag. Add field values to the
weekly filter bar: when you filter to a tag, you can further narrow by any of
that tag's fields (choice, checkbox, number range, date range, text contains).

## 6. Icon picker with search and previews

Replace the grouped icon grid with a searchable picker: a search box that
matches icon names and group labels, a live preview of the chip as it will look
with the chosen color, and recently used icons pinned to the top.

## 7. Supertag dropdown that reveals its fields

Tag chips on tasks and in the tag rail get a click-through dropdown showing the
tag's fields and their current values for that item, editable in place, plus
"Edit tag schema" as the last item.

## 8. Better field pickers in tables

Field columns get a proper column picker grouped by tag with type icons and
search. Cells become real dropdown controls: choice fields open a menu of
options (with "clear"), checkbox toggles inline, date opens a calendar popover,
number and text stay inline inputs. Saved-view queries gain field predicates so
a view can be "#appointment where Provider = X".

## 9. Tag page as a Tana-style workspace

Rework the tag page into an editor-like surface: an inline title and rich
description using the note editor, the tag's schema (fields, defaults,
checklist) in a right-hand inspector rather than a collapsible block, and the
tagged items rendered as one live outline (tasks, notes, groceries, projects)
with inline editing, grouping by type or date, and a "+ new" line at the bottom
that inherits the tag and its defaults.

## Technical notes

- New `src/lib/planner/use-range-rows.ts` as the single row source for List /
  Table / Board; the three views become presenters over it.
- `src/lib/backlinks.ts` route builder gains per-source deep links
  (`/notes/:id`, `/journal?date=`, task editor route param).
- `src/lib/supertag.ts` `supertagPatch` reused inside `addHabit` and
  `addAppointment` in `src/lib/store.tsx`; checklist preview moves into the
  composer state so lines are editable pre-save.
- `src/lib/tag-fields.ts` gains a value-predicate helper; `week-filters.ts` and
  `saved-views.ts` carry an optional `fieldFilters` array.
- New `TagIconPicker` (search + preview) replacing `IconGroupPicker` usage in
  `TagPicker`, `TagManagerDialog`, and the tag page.
- `FieldCell` split into per-type controls (select menu, date popover, checkbox,
  inline input) with a shared save path.
- No schema changes needed — `tags`, `tag_fields`, `item_field_values`,
  and `saved_views` already cover this; saved-view filter JSON just carries more.

Tell me if you want any of the nine dropped or reordered.
