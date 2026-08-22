# Supertag-aware quick add, safer edits, and a richer tag workspace

Five improvements: a one-flow quick add available from every planner view, hover previews for backlinks, undo toasts for task edits, sorting and multiple views on the Tags page, and deeper Tana-style nesting.

## 1. Quick add from any planner view, with supertag defaults

- A single shared quick-add sheet (built on the existing planner quick capture) usable from Schedule, Board, Overview, List, Table, Month, Year — plus the `c` shortcut and the capture button.
- Typing `#tag` in the input immediately applies that supertag's item defaults (area, priority, duration, category) and pre-fills its checklist template — shown as removable chips so nothing is silently applied.
- Any typed fields the supertag defines render inline in the same sheet (select dropdowns, dates, checkboxes, text/number), so one flow captures the task and its field values without opening the detail modal.
- The sheet inherits context from wherever it was opened: current date, and the clicked time slot when there is one.

## 2. Backlink hover previews and keyboard focus

- Each "Linked from" row gets a hover card (tap on touch) showing the source's title, a longer excerpt, its type, and the date — so context is clear before navigating.
- Rows become a proper keyboard list: arrow-key roving focus, Enter/Space to open, visible focus ring, and the preview also opens on focus, not just hover.

## 3. Undo toast for task edits and completions

- Completing, rescheduling, or editing a task anywhere (List, Table, Board, Schedule, Overview, Today) raises a toast with an Undo action that restores the previous values.
- Undo works off the existing planner history store, so multiple recent changes can be reverted in order and the toast stays consistent across views.
- Bulk actions get a single "Undid N changes" style revert rather than one toast per task.

## 4. Tags page: sorting and views

- Sort control: Name, Most items, Recently used, Pinned first.
- View switch: Cards (current grid, richer — counts by type, accent bar, description), List (compact rows with inline counts and pin), Table (name, items, tasks, notes, fields, last used — sortable columns).
- Each tag row/card expands to reveal its nested notes and nodes underneath, so the tag tree can be browsed without leaving the page.
- Sort, view, and expansion state persist per user across sessions.

## 5. Tana-style nodes

- Outline nodes support children: indent/outdent with Tab/Shift+Tab, collapse/expand with persisted state, and drag to reparent.
- Enter creates a sibling node inline; nodes can carry their own tags, and adding a tag applies that supertag's defaults right in the outline.
- Breadcrumb "zoom into node" so any node can become the outline root.
- Node rows show typed field values inline and open the fields popover on click.

## Technical notes

- Shared quick add: new `src/components/planner/PlannerQuickAddSheet.tsx` reusing `parseTaskInput`, `supertagPatch`/`supertagChecklist` from `src/lib/supertag.ts`, and `FieldCell` for typed fields; mounted once in `Planner.tsx` and triggered by a small context so every view opens the same instance.
- Backlinks: extend `src/lib/backlinks.ts` snippet length and add `updatedAt`; `BacklinksSection.tsx` gains hover card + roving tabindex.
- Undo: wrap `updateTask`/`toggle` call sites through a helper in `src/lib/planner-history.ts` that snapshots prior fields and emits a sonner toast with an Undo action.
- Tags page: sort/view prefs in localStorage alongside `useViewPrefs` conventions; nested children derived from `note_links`/`task_links` plus tag membership.
- Outline: extend `TagOutline.tsx` node model with `parentId`/`collapsed`, persisted in `item_field_values`-style storage or a small outline prefs record (chosen at build time to avoid a schema change if possible).
