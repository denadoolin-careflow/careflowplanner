## Goal

Three related upgrades to how tasks surface notes and detail on the web:

1. Show a **collapsed notes preview** under every task that has notes, click to edit inline.
2. Add a **quick-view detail toggle** for a lightweight side/pop detail without leaving the list.
3. **Restore a true desktop layout** for the full Task Editor so it no longer looks like a mobile sheet on the web.

---

## 1. Inline notes preview under tasks

In `src/components/cards/TaskRow.tsx`:

- When `task.notes` is non-empty, render a compact `NoteMarkdownPreview` block under the title row (indented under the task body, above the subtask area).
- Two visual states:
  - **Collapsed (default)**: 1–2 line clamp with a soft fade. Click anywhere on the preview → expands to full markdown, no editor swap yet.
  - **Expanded**: click again or click a small "Edit" affordance → swap to the existing `BlockEditor` inline, auto-saving via `updateTask(id, { notes })` on change with debounce. Click outside or press Esc to collapse back to preview.
- Empty-notes case: render a subtle "Add notes" link that opens the inline `BlockEditor` directly.
- Respect `dense` prop — hide preview when dense, show a tiny "Has notes" dot/icon instead.
- Persist per-task expanded state in component state only (not stored).

## 2. Quick-view detail toggle

Add a small chevron/eye button in the task row's hover actions strip:

- Click → opens a new **`TaskQuickView`** popover/sheet anchored to the row (Radix Popover on desktop, bottom Sheet on mobile).
- Contents: title, area/project/priority chips, due chip, full notes via `BlockEditor` (read-mostly with inline edit), subtask checklist with progress, and a footer with `Edit all` (opens full `TaskEditor`), Complete, Delete.
- This is the "lightweight detail" — no full form, no AI panels, no attachments grid.
- Place component at `src/components/tasks/TaskQuickView.tsx`. Reuse `BlockEditor`, `SmartDueChip`, existing badges.
- Wire it into `TaskRow` and `InboxSortableRow` action clusters with a `PanelRightOpen` icon button.

## 3. Restore desktop Task Editor layout

`src/components/tasks/TaskEditor.tsx` currently uses a dialog whose desktop sizing still feels like a mobile fullscreen (one stacked column, sticky bottom bar). Refactor:

- Keep the same `Dialog` shell but on `lg:` apply a **two-column layout**:
  - **Left column (main, ~62%)**: title, notes (`BlockEditor`), subtasks, attachments.
  - **Right column (meta rail, ~38%)**: due/schedule, priority, energy, area/project/tags, recurrence, AI assist, danger zone.
- Sticky header stays; remove the full-height `h-[100dvh]` on `lg:` so the dialog floats centered with `lg:h-[min(86vh,900px)] lg:w-[min(94vw,1100px)] lg:rounded-2xl`.
- Replace the current single scroll body with two independently scrolling columns (`overflow-y-auto`).
- Mobile/tablet (`<lg`) keeps today's stacked sheet behavior — no regression.
- Also adjust `GlobalTaskEditor` so mobile still navigates to `/tasks/:id`, desktop opens the new two-column dialog (no change needed if `isMobile` already true at <768px; confirm and keep).

## Technical notes

- Notes preview already exists as `src/components/notes/NoteMarkdownPreview.tsx` — reuse, set `maxChars={180}` collapsed, `maxChars={2000}` expanded.
- Debounce inline note saves at ~600 ms to avoid update storms; flush on blur.
- `TaskQuickView` should not re-fetch — read from `useStore()` like other task surfaces.
- No DB migrations, no store schema changes.

## Files

- Edit: `src/components/cards/TaskRow.tsx`, `src/components/tasks/TaskEditor.tsx`
- Add: `src/components/tasks/TaskQuickView.tsx`
- Touch (small): `src/components/inbox/InboxSortableRow.tsx` (expose quick-view button), `src/components/tasks/GlobalTaskEditor.tsx` (verify breakpoint).

## Out of scope

- No changes to task data model, sync, or list filtering.
- No redesign of `TaskDetailPane` (the existing selection sidebar stays as-is).
