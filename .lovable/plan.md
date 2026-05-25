
# Revamp plan

Delivered as one large plan, sequenced so dependencies land first. All changes use existing semantic tokens; new tables get RLS.

---

## 1. Task views: grouping, sorting, visible columns, tags

**Touch:** `KanbanBoard.tsx`, `AllTasksViews.tsx`, `TaskListControls.tsx`, `TaskSortMenu.tsx`, `lib/task-grouping.ts`, new `lib/view-prefs.ts`.

- Extend `GroupMode` to: `section | dueDate | tag | project | priority | energy | status | area | none`. Add tag grouping (tasks with multiple tags appear in each group; "Untagged" bucket).
- Apply grouping + sorting consistently across **list, grid, board, schedule, calendar**. Board columns become the active group (today: status → tomorrow: any group key).
- New "View options" menu (gear icon next to sort) with toggles for visible fields: tag chips, priority, due date, project, energy, est. minutes, icon, cover. Stored **globally per view type** (board/list/grid/schedule/calendar) in `localStorage` under `careflow:view:<type>`, with a Reset button.
- Render tag chips inline on every view's task row/card (compact, color from `tags` table).

## 2. Pomodoro timer contrast

**Touch:** `PomodoroTimer.tsx`, `FloatingPomodoro.tsx`, `FullScreenFocus.tsx`.

- Replace hardcoded timer text color with theme-aware token: `text-foreground/90` on light, `text-foreground` (near-white) on dark. Add subtle backdrop for the floating pill so digits stay legible over any atmosphere.

## 3. NLP tag autocomplete in task composer

**Touch:** `InlineTaskComposer.tsx`, `TaskEditor.tsx`, `lib/nlp-task.ts`, new `components/tags/TagAutocomplete.tsx`.

- While typing, detect `#token` (and bare words matching a tag name). Show a floating suggestion list anchored to the caret with matching tags from `useTags()`. Arrow keys + Enter to insert, Esc to dismiss. Falls back to "Create #new-tag".

## 4. Timeline + table views for Projects and Tasks

**Touch:** `pages/Projects.tsx`, `pages/ProjectDetail.tsx`, `pages/TaskListPage.tsx`, new `components/tasks/TaskTableView.tsx`, `components/tasks/TaskTimelineView.tsx`, `components/projects/ProjectsTimeline.tsx`, `components/projects/ProjectsTable.tsx`.

- **Table view:** sortable columns including any custom fields (see §5). Resizable, sticky header.
- **Timeline view:** horizontal Gantt-style strip using `dueDate`/`createdAt` (and `deadline` for projects). Drag to reschedule, zoom by day/week/month.
- View switcher pill: `List | Grid | Board | Table | Timeline | Schedule | Calendar`.

## 5. AI-assisted custom fields (database-like) for Tasks, Projects, Notes

**Touch:** new tables, new `components/common/CustomFieldsEditor.tsx`, new `lib/custom-fields.ts`, integrated into Task/Project/Note detail panes + table view columns.

- New tables:
  - `custom_field_defs(id, user_id, entity_type ['task'|'project'|'note'], name, kind ['text'|'number'|'select'|'multiselect'|'date'|'checkbox'|'url'], options jsonb, sort_order)`
  - `custom_field_values(id, user_id, field_id, entity_id, value jsonb)`
  - Full RLS on `auth.uid() = user_id`.
- Editor UI: add/rename/reorder/delete fields per entity type; values render in detail panes and as columns in table view.
- New edge function `ai-custom-fields` (Lovable AI, `google/gemini-2.5-flash`): given a sample of the user's tasks/projects/notes, suggests field schemas; given an item, proposes values for empty fields. Surfaced via "✨ Suggest fields" and "✨ Fill" buttons.

## 6. Notes editor polish

**Touch:** `BlockEditor.tsx`, `NoteDetail.tsx`, `NoteMarkdown.tsx`.

- Align body content's left edge to the title's left edge (remove inherited padding mismatch in BlockEditor wrapper).
- Hover/selection background on blocks: `rounded-lg` + `bg-muted/30` (was square/opaque).
- Fix `@` mention dropdown: keep open while typing, anchor to caret using a portal + `floating-ui` style positioning, dismiss only on Esc / outside click / selection. Currently the dropdown closes because of a blur race — switch to `onMouseDown preventDefault` on the menu and track open state in a ref.

## 7. Knowledge graph

**Touch:** new `pages/Graph.tsx`, new `components/graph/KnowledgeGraph.tsx`, route added in `App.tsx`, nav entry.

- Aggregate nodes: notes, tasks, projects, habits, tags, dates (daily notes), goals. Edges: `[[wikilinks]]`, shared tags, task↔project, task↔goal, habit↔date logs, note↔date.
- Render with `react-force-graph-2d` (small, canvas-based, performant). Drag, pin (click-to-fix), zoom, search box, type filters (toggle chips), cluster by tag or area.
- Click a node → opens its detail route in side drawer.

---

## Technical notes

- All new prefs use `localStorage` (no schema change for view prefs).
- DB migrations: only §5 (`custom_field_defs`, `custom_field_values`) plus updated trigger for `updated_at`.
- New dep: `react-force-graph-2d` (and its `d3-force` peer).
- Edge function `ai-custom-fields` follows existing `ai-*` pattern, uses `LOVABLE_API_KEY`.
- No business-logic changes to existing task/project store APIs — additions only.

## Sequencing

1. Pomo contrast (§2) — tiny, immediate win.
2. Task view options + tag chips + grouping/sort everywhere (§1).
3. Tag autocomplete (§3).
4. Notes editor polish + sticky @ (§6).
5. Custom fields schema + UI + AI (§5).
6. Table + Timeline views (§4) — uses §5 columns.
7. Knowledge graph page (§7).
