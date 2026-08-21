# Voice auto-record, editable Inbox, and drag-to-grid on Today

## 1. Voice quick add starts recording immediately

Today the FAB's Voice button opens the assistant, and the Voice capture dialog opens on an "intro" screen where you still have to press Mic.

- Add an `autoStart` option to the voice capture dialog: when it opens with that flag, it goes straight into recording (mic permission prompt, timer running, live transcript).
- Point the FAB's Voice tile at the voice capture dialog with `autoStart` on, instead of the intro screen.
- If the mic is blocked or unavailable, fall back to the current intro screen with a clear message instead of a silent failure.
- Keep manual open (from the command palette) on the old behavior so nothing records unexpectedly.

## 2. Edit tasks directly from the Inbox sections

Applies to every section: Today, Upcoming, Needs scheduling, Scheduled for today.

- Tap the task title to open the compact quick editor (title, date, time of day, priority, energy, notes) instead of only reaching it through the full modal.
- Every row in every section gets the same quick-action strip that Inbox rows already have (date, time of day, priority, energy), plus the When picker.
- On mobile, editing opens the existing mobile task sheet (large touch targets, swipe to dismiss) rather than a desktop dialog.
- Titles get inline rename: long-press / double-tap the title to edit text in place and save on blur or Enter.

## 3. Today view: drag Inbox tasks onto the grid

- Add a compact Inbox rail to the Today planning view, directly above the time grid: unscheduled + overdue tasks in a horizontally scrollable strip, with a count and a "see all" link to the Inbox.
- Each chip is draggable onto the timeline (desktop drag, long-press drag on mobile) and drops snap to the grid slot, setting date + start time in one gesture.
- Dropping shows a toast with Undo, matching the planner's existing history behavior.
- Tapping a chip (no drag) opens the quick editor so you can set duration/priority before placing it.

## 4. Mobile polish

- Today: the Inbox rail and grid share one scroll surface so the grid isn't trapped; sticky day-part tabs stay visible while scrolling.
- Inbox: tighter row spacing, full-width tap targets, quick actions wrap instead of overflowing, and the section headers stick while you scroll through a long section.
- Drag feedback: the dragged chip stays visible over the grid and the target slot highlights; haptic tick on pickup and on drop.

## Technical notes

- `VoiceCaptureDialog` gains an `autoStart` prop; `CombinedFab`'s voice tile dispatches `careflow:quick-add` with `{ tab: "voice", autoStart: true }`, handled in `QuickAddFab`.
- Inbox rows reuse `openTaskQuickEdit` / `MobileTaskSheet` and the existing `TaskQuickActions`; the sectioned list in `src/pages/Inbox.tsx` renders `InboxSortableRow` for all sections so behavior is uniform.
- The Today rail reuses `TASK_DRAG_MIME` and the planner's existing drop handling in `PlannerTimeline`, plus `useLongPressDrag` for touch, so no new scheduling logic is introduced.
- No schema or backend changes.
