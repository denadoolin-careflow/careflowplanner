## Goal
Rebuild the inbox task row to match the selected "Soft floating v3" direction: wider task surface, smooth rounded outline that softly highlights when selected/focused, symmetric left controls (drag handle + selection), inline subtask progress shown as a count label ("4 of 6"), pill tags with icons, full-width inline notes, and a clear "When" pill.

## Scope
Frontend/presentation only. Behavior of existing controls (drag, select, complete, when picker, notes editor, hover actions) is preserved — only layout, container, and visuals change.

## Changes

1. `src/components/inbox/InboxSortableRow.tsx`
   - Wrap the row in a soft floating card: `rounded-[22px] border bg-card shadow-sm`, padding `p-4`, gap `gap-3`.
   - Selected/highlighted state: `border-2 border-primary` + subtle `shadow-[0_4px_18px_-8px_hsl(var(--primary)/0.35)]`. Smooth transition.
   - Left control column: vertical stack of drag dots (3×2 grid dots, opacity 30% / 100% on hover) + selection dot (5×5 ring, filled primary dot when selected), centered, `pt-0.5`.
   - Remove the separate meta row underneath; source/age chips move next to the When pill inside the card footer.
   - Pass an `inCard` prop into `TaskRow` so it renders without its own border/background.

2. `src/components/cards/TaskRow.tsx`
   - Accept new optional prop `variant: "card" | "row"` (default `row` to keep other pages stable). When `card`:
     - Drop outer border/shadow; rely on parent card.
     - Title uses `text-[15px] font-medium leading-snug break-words whitespace-normal`, full available width (no truncate).
     - Priority badge becomes a small rounded pill (`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider`) right-aligned next to the title.
     - Tags render as icon pills (`rounded-full bg-muted border text-[10px] font-semibold` with the tag's icon).
     - Subtask progress: keep the slim 1px bar but replace the "%" text with `"{done} of {total}"` count, e.g. `4 of 6`. Hide when there are no subtasks.
     - "When" picker pill moves to its own row beneath the title block (`rounded-lg bg-muted px-2.5 py-1.5 text-xs`), so date never collides with the title.
     - Notes preview/inline editor sits below a hairline divider (`pt-3 border-t border-border/60`) and spans the full card width for comfortable writing.
     - Completion checkbox stays on the right, vertically aligned with the first line of the title.
   - Keep all existing handlers, hover actions, swipe actions, and double-click-to-edit behavior intact.

3. `src/pages/Inbox.tsx`
   - Increase row container width: widen the inbox column wrapper to `max-w-[640px]` (from current narrow mobile width) and use `px-3 sm:px-4` so cards have room on tablet/desktop while staying mobile-friendly.
   - Add vertical rhythm between cards (`space-y-3`).
   - Pass `variant="card"` when rendering rows inside `InboxSortableRow` buckets.

4. Tokens (no new colors)
   - Reuse `--primary`, `--border`, `--muted`, `--card`. Selected border uses `hsl(var(--primary))`. No hardcoded indigo/zinc — atmosphere-aware.

## Out of scope
- TaskListPage, Calendar, Kanban rows — they keep current `row` variant.
- No backend, schema, or store changes.
- No new dependencies.

## Acceptance
- Inbox rows look like the selected prototype, atmosphere-themed (light + dark).
- Long titles wrap; notes editor stretches full card width.
- Selected/highlighted row shows a smooth 2px primary outline with soft glow.
- Drag handle and selection dot sit in a symmetric left column aligned with the title baseline.
- Subtask progress shows "X of Y" instead of a percentage.
