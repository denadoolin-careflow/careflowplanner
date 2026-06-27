## Goal

Make the note/details editor feel premium and connected: a cleaner toolbar, real linked subtasks (not just checklist items), a universal linker that can attach **tasks, notes, dates, journal entries, cosmic events, projects, goals, areas, people, holidays, and memories**, with inline chips everywhere and a full “Linked to” panel in fullscreen and Note detail.

## What gets built

### 1. BlockEditor toolbar polish (`src/components/notes/BlockEditor.tsx`)
- Tighten the symmetrical 3-group layout, replace ad-hoc dividers with thin atmosphere-aware separators, add tooltips and consistent 28px icon buttons.
- Add a dedicated **Link** toolbar button (chain icon) that opens the universal linker (tabbed picker, same surface as slash menu).
- Add a **Subtask** toolbar button that inserts a real linked task (see §2) instead of a plain task-list item.
- Persist toolbar visibility + fullscreen preference per editor instance via `editor-prefs`.
- Autosave: debounce content changes (700ms) and surface a subtle “Saved · just now” indicator in the toolbar; flush on blur, fullscreen toggle, and Escape.
- Fullscreen polish: max width 960px, sticky toolbar, atmosphere gradient background, ⌘/Ctrl+. to exit, and a right rail that shows the Linked-to panel (§4).

### 2. Real linked subtasks
- Extend the existing `promoteTaskItemToTask` flow so the **Subtask** toolbar button (and the `/ subtask` slash command) immediately creates a real `Task` (status `active`, inbox=true unless host context overrides) and inserts an inline **TaskRef node** referencing it.
- New TipTap node `taskRef` (atom inline node) rendered as a pill: checkbox + title + open-in-editor affordance. Toggling the checkbox updates `task.done` via the store; deleting the pill unlinks (does not delete the task).
- On insert, automatically call `linkNote(noteId, "task", taskId)` so it shows in the Linked-to panel.
- Host context prop (`subtaskHost: { kind: "inbox" | "task" | "note" | "journal", id?: string }`) lets the parent (e.g. `TaskEditor`) set `parentTaskId` so subtasks nest under the host task instead of going to Inbox.

### 3. Universal linker
- New component `src/components/notes/UniversalLinkPicker.tsx`: tabbed search across **Task, Note, Date, Journal, Cosmic event, Project, Goal, Area, Person, Holiday, Memory**. Recent + pinned items at top, keyboard navigation, atmosphere styling.
- Extend `EntityType` in `src/lib/note-links.ts` with new kinds: `note`, `date`, `cosmic_event`, `area`, `holiday`, `memory` (existing: task, project, goal, habit, appointment, time_block, person, meal, journal). Update `ENTITY_LABEL`, `ENTITY_ROUTE`, and the `NoteLinksSidebar` tab list/icons/resolvers accordingly.
- Trigger surfaces:
  - **Slash menu** (`/link`, `/task`, `/person`, `/date`, etc.) — extends the existing slash command in `BlockEditor`.
  - **@-mention** popover — typeahead from any character after `@`, results merged across entity types and ranked by recency.
  - **Toolbar Link button** — opens the same picker in a dialog.
- Selecting an item inserts an inline `entityRef` node (pill with type icon + label, click to navigate) **and** persists a row in `note_links` via `linkNote`. Pasting a recognised in-app URL also creates the link.

### 4. Link surfacing — chips inline, panel in fullscreen
- New `NoteLinkChips` (compact, removable, grouped by type) rendered:
  - Under the editor in the **Inbox** inline details panel.
  - Under the BlockEditor in **TaskEditor**.
- The existing `NoteLinksSidebar` becomes the “rich” panel; render it:
  - In **BlockEditor fullscreen** (right rail, collapsible).
  - On the standalone **Note detail page** (already used there — extended with new entity tabs).
- Both surfaces read/write the same `note_links` table so they stay in sync.

### 5. Integration touch-ups
- `src/pages/Inbox.tsx`: when a capture has details, ensure a draft `note` row exists so links can attach before save; show `NoteLinkChips` below the BlockEditor; pass `subtaskHost={{ kind: "inbox" }}`.
- `src/components/tasks/TaskEditor.tsx`: pass `subtaskHost={{ kind: "task", id: task.id }}` and render `NoteLinkChips` under the editor.
- `src/pages/NotesFiles.tsx` / `NotesTimeline.tsx`: surface the upgraded toolbar and linked-to panel; no schema changes required.

## Technical notes

- **Schema**: `note_links` already supports the new entity types since `entity_type` is text — no migration required. For `date`, `entity_id` stores ISO `yyyy-mm-dd`; for `cosmic_event`, use the event id from `src/lib/cosmic/event-id.ts`; for `memory`, the `memories.id`; for `holiday`, `holidays.id`; for `area`, `areas.id`.
- **Subtask node**: store `{ taskId }` in node attrs; render via `ReactNodeViewRenderer` to keep live store sync (Zustand subscription).
- **Autosave**: reuse the existing `onChange` debounce already in BlockEditor host components; add a small status state inside the toolbar.
- **No design system breaks**: all new chips/panels use existing tokens (`bg-card/50`, `border-border/60`, `text-foreground`, atmosphere accents). No hardcoded colors.
- **Performance**: universal picker queries the in-memory `useStore` slices; cosmic events come from the existing `useTransitsRange` hook (lazy-loaded only when the Cosmic tab is opened).

## Out of scope (to keep this focused)
- Re-theming the BlockEditor typography (already done in prior turn).
- Backfilling existing notes with auto-detected links.
- Mobile gesture redesign for the toolbar (the symmetrical layout already adapts).