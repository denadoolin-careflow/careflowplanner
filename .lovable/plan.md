## Goal
1. Cleaner formatting toolbar with more writing space, positioned **above** the rich note entry in the Inbox capture panel.
2. Inline subtask creation directly from any task row via a hover "+ Add subtask" button, with a progress bar.

## Changes

### 1. BlockEditor toolbar placement (`src/components/notes/BlockEditor.tsx`)
- Add a new prop `toolbarPlacement?: "top" | "bottom"` (default `"bottom"` to preserve existing usage).
- When `"top"`, render the desktop `<Toolbar />` above `<EditorContent />` instead of the sticky bottom bar; keep the same context-aware fade (visible when focused/has-selection) and "Hide toolbar" affordance, but anchored on top.
- Trim the toolbar visual weight: tighter group separators, smaller corner radius on the bar, reduced vertical padding, no shadow when placed inline above the editor — so the input area feels like the focal point.

### 2. Inbox capture rich-text area (`src/pages/Inbox.tsx`)
- Pass `toolbarPlacement="top"` to the `<BlockEditor>` inside the details/journal panel.
- Bump `minHeight` for more writing room: task details `160px` (was 96px), journal `260px` (was 160px), note body `220px`.
- Tighten the wrapper padding so the editor itself gets more usable width.

### 3. Inline subtask hover button on TaskRow (`src/components/cards/TaskRow.tsx`)
- Add a compact "+ Add subtask" button rendered just under the task's metadata row.
  - Hidden by default; revealed on row hover (and on tap/focus for mobile).
  - Always visible when the parent row already has subtasks (so it pairs with the progress bar).
- Clicking it reveals the same inline `Input` composer already used inside the expanded block (Enter to save, Escape to cancel), creating a subtask via `addTask({ parentTaskId, area, projectId })`. Auto-expand the subtask list after the first one is added.
- Progress bar is already implemented at line 382 — keep as-is so newly added subtasks immediately show progress.
- Don't render the inline button on rows that are themselves subtasks (`task.parentTaskId`).

## Out of scope
- No backend/schema changes.
- No changes to mobile toolbar layout beyond reusing the existing mobile `<Toolbar />` row.
- Other BlockEditor callers (Notes detail, Task editor) keep the current bottom toolbar.
