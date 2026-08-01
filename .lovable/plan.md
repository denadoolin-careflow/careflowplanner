# TickTick-style task surfaces

Bring a TickTick feel to CareFlow's task screens only (Today list, Inbox, Upcoming/Anytime/Someday/Logbook via TaskListPage). Planner, Cosmic, Care and the rest keep their current look.

## What changes

**1. Row style — flat, compact, scannable**
- Replace card-ish rows (rounded borders, shadows, background fill) with flat rows separated by hairline dividers, roughly 40px tall (a moderate density step, not maximum compression).
- Left: round checkbox that carries the priority color (red / yellow / blue / grey) instead of the coloured left bar and priority pills.
- Middle: title on one line, optional one-line grey description/notes preview underneath only when notes exist.
- Right: quiet meta chips in a single row — list/project name, due date/time, subtask count (3/6), recurrence and reminder icons — all muted grey, with due date turning red when overdue and blue when today.
- Hover reveals the action icons (currently always-on clutter); nothing shifts layout on hover.
- Selected row gets a soft grey fill, not a border.

**2. Grouped sections**
- Section headers become small collapsible rows: caret + name + count, matching TickTick's `Weekly Plan 8` style. Collapse state remembered per list.
- Thin coloured left accent line runs alongside a group's rows to carry the list/area colour.

**3. Add-task bar**
- Move the quick add to a single always-visible slim field pinned directly under the page title: `+ Add task to "Inbox"`, faint grey field, NLP parsing preserved.
- The "More options" disclosure and second composer collapse into that one field (advanced editor still reachable from the task detail).

**4. Right detail pane**
- Detail pane becomes the default on desktop for these pages (currently toggled off), sitting flush as a third column with its own header row: complete checkbox, due-date button, flag/priority, overflow menu.
- Body: title as a large editable heading, then notes/description, then subtask checklist — no badge cluster at the top; metadata moves to the header controls.
- Clicking a row opens it in the pane; the modal `TaskEditor` stays as the "Edit all" fallback and stays the mobile behaviour.

**5. Header row**
- Page title left; light-bulb/insight, sort, and overflow icon buttons right — replacing the current pill row of view toggles, which folds into the overflow menu.

## Technical notes

- `src/components/cards/TaskRow.tsx`: add a `ticktick` presentation path for row chrome, meta chips, and hover actions; keep all existing behaviour (swipe, long-press, subtasks, celebration, quick edit) intact.
- `src/pages/TaskListPage.tsx` and `src/pages/Inbox.tsx`: new header layout, single add bar, collapsible group headers, default `paneOpen` to true on desktop.
- `src/components/tasks/TaskDetailPane.tsx`: restructure into header-controls + heading + notes + subtasks.
- New tokens in `src/index.css` for row divider, row hover/selected fill, and priority checkbox colours — no hardcoded colour utilities.
- Mobile keeps the existing sheet/rail behaviour; the pane is `lg:` only.

## Out of scope
Planner, Today dashboard, Cosmic, Care, Seasons, and settings pages keep their current design. No data-model or backend changes.
