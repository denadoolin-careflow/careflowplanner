# NLP-aware title in Task Settings

Bring the inbox-style natural-language parsing into the task editor's title field so editing a task's title (e.g. "Doctor appt tomorrow 3pm #health p2 30m") can fill in date, time, priority, tags, energy, estimate, recurrence, reminder, and area.

## UX

In `src/components/tasks/TaskEditor.tsx`, just below the title input:

1. **Live chip preview** — when the user types in the title, run `parseTaskInput(draft.title)` (memoized). If it returns chips, render a small row of pill chips beneath the title (same look as `InlineTaskComposer`: `Sparkles` icon + `bg-primary/10` pills).
2. **NLP toggle + "Apply"** — a tiny row next to the chips:
   - `Sparkles` toggle button "NLP" (on/off, persisted in localStorage `cf.taskedit.nlp`, default ON) — when off, no parsing is done.
   - "Apply" button (only visible when chips exist) that:
     - Sets `draft.title` to the cleaned `parsed.title`.
     - Merges parsed fields into `draft` only when they are currently empty/undefined OR when the user holds Shift / clicks an "Override" toggle. Default behavior: do not overwrite existing values, only fill blanks. Tags get merged (deduped).
     - Toasts "NLP applied" listing the applied chips.
3. **Auto-apply on blur** — when the title input loses focus, if NLP is on and there are chips and any of the parsed fields would actually fill a blank, apply automatically (same merge rule). This matches Inbox capture's feel where typing the sentence is enough.

No changes elsewhere — only `TaskEditor.tsx` is touched, plus reusing existing `parseTaskInput` from `src/lib/nlp-task.ts`.

## Field-mapping rules

| Parsed | Task field | Apply when |
| --- | --- | --- |
| `dueDate` | `dueDate` | currently empty |
| `time` | `dueTime` (if field exists) else appended into title | currently empty |
| `priority` | `priority` | currently empty |
| `area` | `area` | currently default/empty |
| `tags` | `tags` | merged + deduped |
| `energy` | `energy` | currently empty |
| `estMinutes` | `estMinutes` | currently empty |
| `recurrenceType/Interval/Days` | matching task fields | currently empty |
| `reminderMinutes` | `reminderMinutes` | currently empty |
| `projectName` | `projectId` if a project name matches in `state.projects` | currently empty |
| `someday` | `someday` | currently false |

Verify each target key exists on `Task` before wiring (read `src/lib/types.ts`); silently skip any field the model doesn't have.

## Out of scope

- No new parser features; uses the existing `parseTaskInput` as-is.
- No changes to `InlineTaskComposer`, mobile sheet, or any other surface.
- No persistence of chips on the task — chips are derived from the title each render.
