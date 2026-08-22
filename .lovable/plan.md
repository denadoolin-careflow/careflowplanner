# Quick-add shortcut, redo, tag search, and a Tana-style Notes workspace

Four changes: a global planner shortcut that opens Quick Add focused on the supertag picker, a Redo action in the task undo toast, search inside the Tags workspace, and a Notes page reworked into an outliner-style workspace.

## 1. Keyboard shortcut for Quick Add with supertag focus

- Press `Q` anywhere in the planner (and `Shift + #` as an alias) to open the shared quick-add sheet with the cursor already in a supertag selector.
- The sheet gains a dedicated tag row above the text input: a searchable supertag combobox listing tags with icon, color, and a "supertag" marker for tags carrying defaults or fields. Picking one applies its defaults, checklist, and typed fields immediately, then moves focus to the title input.
- Opening via the existing capture button or `C` keeps the current behaviour (focus in the text input), so only the new shortcut jumps to the tag picker.
- Both shortcuts get listed in the planner shortcuts sheet.

## 2. Redo in the undo toast

- After undoing a task edit, the toast is replaced by a "Change reverted" toast with a **Redo** action that re-applies the original values.
- Works for single edits and for bulk actions (bulk complete, bulk reschedule) with a matching "Redid N changes".
- Applies everywhere the toast already appears: Schedule, Board, Overview, List, Table, Today, and the task editor — because it lives in the shared store path, not in individual views.
- Undo/redo alternate indefinitely on the most recent change; a new edit resets the pair.

## 3. Tags-scoped search

- The Tags page search box also filters the nested items under each tag (tasks, notes, projects, grocery), not just tag names.
- Matching keeps the current view (Cards / List / Table) and sort untouched; tags with matching children auto-expand and matched text is highlighted.
- A small count shows "N tags · M items" for the active query, and clearing the box restores the previous expansion state.

## 4. Notes as a Tana-style workspace

- Notes list becomes an outline-first workspace: each note row can expand in place to reveal its child nodes and tagged items, with the same nesting affordances as the tag outline (indent/outdent, collapse, zoom into a node).
- View switch alongside the current layouts: Outline (new default for the list), Cards, List, Table — table columns include title, tags, fields, updated, word count, and are sortable.
- Tag improvements on the page: tag chips open the supertag fields popover inline, a tag rail filters notes by one or more tags, and typed field values show inline on rows.
- Sort, view, tag filter, and expansion state persist per user across sessions, matching the Tags page conventions.

## Technical notes

- Shortcut: extend `useGlobalShortcuts` / planner key handling to dispatch `openPlannerQuickAdd({ focus: "tag" })`; `PlannerQuickCapture.tsx` reads the flag and autofocuses a new tag combobox built on the existing `useTags` cache and `TagChip`.
- Redo: extend `src/lib/task-undo.ts` with a `showRedoToast` and have `store.tsx`'s undo callback capture the "after" values it just replaced, re-using the same toast id. Bulk path goes through `showBulkUndoToast`.
- Tags search: filter inside the existing row builder in `src/pages/Tags.tsx` before sorting, so sort/view code is unchanged; store pre-search expansion in component state.
- Notes: reuse `TagOutline.tsx`'s node model (parentId/collapsed/zoom) as a shared outline component so `Notes.tsx` and `TagDetail.tsx` render the same rows; view/sort prefs stored in localStorage like `careflow:tags:prefs`.
- No schema changes expected; field values continue through `src/lib/tag-fields.ts`.
