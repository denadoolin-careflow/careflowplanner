## Add copy-to-clipboard buttons for notes and tasks

Add a "Copy all" button that copies the full content of a note or task to the system clipboard, with a brief toast confirmation.

### What will change

1. **New helper** `src/lib/clipboard.ts`
   - `copyToClipboard(text: string): Promise<boolean>` — wraps `navigator.clipboard.writeText()` with fallback to `document.execCommand('copy')`. Returns success boolean. Triggers `haptics.tap()` on success.

2. **Note detail page** (`src/pages/NoteDetail.tsx`)
   - Add a "Copy" ghost button in the header (next to Editor Prefs), using the `Copy` Lucide icon.
   - Copies `title + "\n\n" + body` to clipboard.
   - Toast: "Copied to clipboard".

3. **Task detail page** (`src/pages/TaskDetail.tsx`)
   - Add a "Copy" option in the existing `DropdownMenu` (the "More" button in the sticky header).
   - Copies a formatted plain-text summary: title, status, area, project, due date, priority, tags, notes, and subtask list.
   - Toast: "Copied to clipboard".

4. **Mobile task sheet** (`src/components/tasks/mobile/MobileTaskSheet.tsx`)
   - Add a new `SmallTile` in the Utilities grid labeled "Copy" with the `Copy` icon.
   - Copies the same formatted summary as TaskDetail.
   - Toast: "Copied".

5. **Task editor dialog** (`src/components/tasks/TaskEditor.tsx`)
   - Add a "Copy" ghost button in the dialog header (next to the "Edit task" title or inside the sticky header row).
   - Copies a formatted summary of the current task draft.

### Copy format for tasks

```
<task title>
Status: <Open / Complete>
Area: <area>
Project: <project name or None>
Due: <date or None>
Priority: <Low/Medium/High>
Tags: <tag1, tag2 or None>
Notes:
<notes text or (none)>

Subtasks:
- [ ] subtask 1
- [x] subtask 2
```

### Design notes
- Uses existing `Button variant="ghost" size="sm"` / `SmallTile` patterns.
- Reuses existing `Copy` icon from `lucide-react` (already imported in TaskDetail and MobileTaskSheet).
- Toast via `sonner` (`toast.success` / `toast`).
- Haptic feedback via existing `haptics.tap()` helper.
- No new dependencies.