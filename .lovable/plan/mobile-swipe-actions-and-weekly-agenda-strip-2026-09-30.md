# Mobile swipe actions and weekly agenda strip

## What will change
**Swipe actions on mobile task cards (Planner)**
- Swipe right: complete / reopen (green reveal, check icon).
- Swipe left: reveals two buttons — Reschedule (Tomorrow, Next week, pick a date) and Delete (with an Undo toast instead of a confirm dialog).
- Short swipes snap back; a full swipe right completes instantly. Light haptic feedback on each action.
- Tapping still opens/expands the task; long-press drag onto the grid keeps working (swipe only engages on clear horizontal motion).

**Weekly agenda strip (mobile Planner)**
- A compact 7-day row under the Planner header: weekday, date, a dot per scheduled task (up to 3, then "+n"), and today highlighted.
- Tap a day to jump the Planner to it; swipe the strip or use arrows to move a week.
- Long-press a day to peek a small preview listing that day's scheduled tasks with times and checkboxes.

## Technical details
- New `SwipeableTaskCard` wrapper using pointer events with a horizontal-intent threshold, so it coexists with the existing pointer drag in `PlannerTaskRow`; applied only when `useIsMobile()` is true.
- Reuses store `toggleTask`, `updateTask`, `deleteTask` (undo re-adds via `addTask`).
- New `MobileWeekAgendaStrip` rendered in Planner's mobile branch, reading tasks by `dueDate`, driving the existing selected-day state.
- Verify with type check and a 390px Playwright run.
