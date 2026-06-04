# Plan: cleaner task quick-edit, hover actions, project jump

Three focused upgrades to the Inbox / task row experience. No backend changes.

## 1. Replace the "3 dots" QuickEditPopover with a clean Quick Sheet

Today the `MoreHorizontal` button on a task row opens `QuickEditPopover` — a dense 5-section chip wall. We'll replace it with a new **`QuickTaskSheet.tsx`** modeled on the mobile sheet's visual language (`BigCard`, `SmallTile`, `SectionLabel` from `TaskSettingsBits.tsx`) so quick-edit looks consistent with the polished mobile view.

Layout (compact, ~360px popover or side-sheet on desktop, sheet on mobile):

```text
┌─────────────────────────────────────────┐
│  ◯  Task title (inline edit)        ✕  │
├─────────────────────────────────────────┤
│  [ Today ] [ Tomorrow ] [ +Days ] [📅] │  ← Quick due
│  [ Morning · Afternoon · Eve · Late ]  │  ← Day part
├─────────────────────────────────────────┤
│  Project   ▸  Home renovation          │
│  Goal      ▸  None                     │
│  Area      ▸  Home                     │
│  Priority  ▸  ● ● Medium               │
│  Repeat    ▸  Weekly                   │
│  Tags      ▸  #urgent #call            │
├─────────────────────────────────────────┤
│  Open full editor   ·   Delete         │
└─────────────────────────────────────────┘
```

Each row is a tappable `SmallTile` that swaps the body into an inline picker (project list w/ search, goals, area chips, etc.) — same pattern `MobileTaskSheet` already uses. Reuses `updateTask` for live patches with toast+undo (already in QuickEditPopover).

Wire-up: `TaskRow.tsx` and any other call sites of `QuickEditPopover` swap to `QuickTaskSheet`. Behavior keys (right-click, long-press, `MoreHorizontal` click) stay identical.

## 2. Hover quick-action rail on inbox task rows

Right now hovering a task row only shows the More button. Add a small action cluster that fades in on hover (and is always visible on touch via long-press) with these actions:

- **Plan** (`CalendarClock`) → opens a tiny date popover (Today / Tomorrow / Next week / pick…)
- **Edit** (`Pencil`) → inline rename (existing behavior)
- **Snooze** (`Snowflake`) → +1d / +3d / +1w (sets `dueDate`)
- **Move** (`FolderInput`) → project picker popover with search
- **Details** (`MoreHorizontal`) → opens new QuickTaskSheet

Implementation: new **`TaskHoverActions.tsx`** rendered inside `TaskRow.tsx` next to the existing More button. Uses `opacity-0 group-hover:opacity-100` on the row (row already a `group`). On touch, surfaces via the existing long-press handler. Each action is keyboard-reachable and has a `title` tooltip.

A user preference (`mem://design`) will let us later toggle which icons are pinned vs. tucked into More; v1 ships all five visible.

## 3. Project search & jump in the Inbox side panel

`TaskDetailPane.tsx` already sits on the right of the Inbox. When no task is selected we currently show only an empty state. Add a **"Jump to project"** section underneath:

```text
No task selected
────────────────
🔍 Find a project…
────────────────
★ Pinned
  • Home renovation       (12)
  • Wedding planning      (3)
All projects
  • …
```

- Search input filters `state.projects` (non-archived) by name & area, case-insensitive.
- Clicking a row navigates via `navigate('/projects/' + id)` (same path used elsewhere).
- Shows open-task count per project (derived from `state.tasks`).
- ⌘K still opens universal search; this is an inline jumper scoped to projects.

The same component (`ProjectQuickJump.tsx`) is reused inside the Move hover action above so we have one searchable project list.

---

### Files

**New**
- `src/components/tasks/QuickTaskSheet.tsx` — replaces QuickEditPopover visual
- `src/components/tasks/TaskHoverActions.tsx` — hover quick-action rail
- `src/components/tasks/ProjectQuickJump.tsx` — searchable project list (used by side panel + Move action)

**Edited**
- `src/components/cards/TaskRow.tsx` — render `TaskHoverActions`, swap popover to `QuickTaskSheet`
- `src/components/tasks/TaskDetailPane.tsx` — mount `ProjectQuickJump` in the empty state
- `src/components/tasks/QuickEditPopover.tsx` — kept temporarily as fallback, removed once all call sites migrate (only `TaskRow.tsx` today)

**Out of scope**
- No changes to `TaskEditor.tsx` (full editor) or mobile sheet
- No DB / store schema changes
- No new drag-and-drop libraries
