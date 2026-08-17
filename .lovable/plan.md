# Mobile task editing from the day & week grid

Today, tapping a task block on mobile jumps straight to the full task sheet, and small blocks in the week grid are easy to mis-tap. This adds a purpose-built mobile editing layer that works directly on the grid.

## Interaction model

- **Tap a task block (day or week grid)** → opens a compact bottom sheet anchored to that task.
- **Long-press a task block** → opens a quick-action menu (no sheet): Complete/Reopen, +15m / -15m duration, Move to tomorrow, Start timer, Open full editor.
- Both work identically in day view and week view; in week view the tap target is padded so tiny blocks stay reachable.

## The compact editor sheet

A peek-height sheet (about 45% of screen) that can be dragged up to full height:

- Header: task title (inline editable), status toggle, priority dots.
- Row 1: start time picker + duration stepper in 15-minute steps, with live "2:00–3:15 PM" preview.
- Row 2: date chip — Today / Tomorrow / pick a day (moves the task between days in week view).
- Expanded section (revealed on drag-up): area, project, tags.
- Footer: Delete, and "Open full editor" to hand off to the existing full mobile sheet.

Every change saves immediately with a toast + undo, matching the existing task-card behavior, and the grid re-renders in place so the block visibly moves/resizes.

```text
 ┌──────────────────────────────┐
 │ ▁▁▁                          │  drag handle
 │ ☐  Refill prescriptions      │
 │ ● ● ○   priority             │
 │ 2:00 PM   ─ 45m +   → 2:45   │
 │ [Today] [Tomorrow] [Pick…]   │
 │ ─────── drag up for more ─── │
 │ Area ▾  Project ▾  Tags ▾    │
 │ Delete            Full editor│
 └──────────────────────────────┘
```

## Scope

- Applies to task and caregiving-task blocks. Appointments, meals, birthdays, holidays and cosmic events keep their current openers.
- Desktop behavior is unchanged.

## Technical notes

- New `src/components/planner/mobile/MobileBlockSheet.tsx` (compact editor) and `MobileBlockQuickMenu.tsx` (long-press menu).
- New `src/lib/open-mobile-block-editor.ts` event bus mirroring `open-task-editor.ts`, with a host mounted once in the planner shell.
- `usePlannerItemOpener` gains a mobile branch: `useIsMobile()` → dispatch the compact sheet for `type === "task"` instead of `openTaskEditor`.
- `PlannerTimeline` block tap/long-press handlers route through the same bus (reusing the existing long-press pointer logic from `MobileTaskCard`), so day, week grid and all-day rows share one path.
- Writes go through the existing `updateTask` / `toggleTask` store actions; duration edits reuse the planner metrics helpers (15-min slots) so drag-resize and stepper stay consistent.
