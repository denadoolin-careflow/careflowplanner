## Add swipe gestures to MobileTaskCard

Wrap `MobileTaskCard` in `react-swipeable-list` (already used by `TaskRow` — no new deps) and match the spec from the original redesign brief: right-swipe = Complete; left-swipe = Edit + Delete. Smooth iOS-style animations and toast-based Undo.

### Behavior
- **Right swipe (leading) → Complete**
  - Calls `toggleTask`, plays existing haptics + `playCompletionChime`, shows toast "Completed · Undo".
  - Undo restores prior `done` + `lastCompletedAt`.
- **Left swipe (trailing)**
  - **Edit** — navigates to `/tasks/:id` (same as tap).
  - **Delete** — calls `deleteTask`, toast "Deleted · Undo". Undo re-inserts the task via `addTask` with the original fields preserved (id regenerated; ok for an undo restore).
- Tap behavior preserved (navigate to detail).
- `fullSwipe={false}`, `threshold≈25%`, `SwipeType.IOS` for the natural iOS bounce/snap animation that library provides out of the box.
- Haptic "tap" on action trigger; "success" on complete; "warn" on delete (reuse `@/lib/haptics`).
- Action panels use semantic tokens: complete = `bg-primary` (sage), edit = `bg-secondary`, delete = `bg-destructive`. Rounded to match `cf-card` (22px) via `overflow-hidden` wrapper.

### Files
**Edit**
- `src/components/tasks/mobile/MobileTaskCard.tsx` — wrap card in `SwipeableList` / `SwipeableListItem` with Leading (Complete) and Trailing (Edit, Delete) actions; add undo handlers + haptics.

No other files change. No new dependencies, no schema changes, no desktop impact.
