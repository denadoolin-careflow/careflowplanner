## Goal

Fix two issues with mobile task swipes in `src/components/cards/TaskRow.tsx`:

1. After swiping, the action buttons (Complete / Snooze / Delete / Edit / Priority / Move) snap back before they can be tapped.
2. Swiping gives no tactile feedback — should buzz when the gesture starts, when it crosses the "armed" threshold, and when an action fires.

## What changes

### 1. Swipe actions stay open until tapped or dismissed

- Switch the list from `Type.IOS` (which springs back unless you cross the action threshold) to a latched behavior so a half-swipe parks the row open and exposes the buttons.
- Keep `fullSwipe={false}` so a long swipe never auto-completes by accident.
- Add an outside-tap / scroll handler that closes the open row when the user touches another row or the page background — so only one row is open at a time and users can dismiss without picking an action.
- Track the currently open task id in a small module-level store (or context) so opening row B closes row A.

### 2. Haptic feedback on the swipe gesture

Using `react-swipeable-list`'s `onSwipeStart`, `onSwipeProgress`, and `onSwipeEnd` callbacks on `SwipeableListItem`:

- `onSwipeStart` → `haptics.swipe()` (featherlight tick when the row begins to move).
- `onSwipeProgress` → `haptics.snap()` once when progress first crosses the action threshold (~15%), and again when it crosses a stronger "armed" threshold (~40%). Reset the flag on `onSwipeEnd` so re-swipes re-trigger.
- Each `SwipeAction onClick` → variant matched to the action:
  - Complete → `haptics.success()`
  - Snooze → `haptics.tap()`
  - Delete → `haptics.delete()`
  - Edit / Priority / Move → `haptics.tap()`

(Several of these already call haptics inside their handler; this consolidates them so the swipe path also fires the right pattern.)

### 3. Tightening the swipe handle behavior (carry-over fix)

- Keep the left grip handle as the only swipe-initiating area (already in place).
- Ensure the action button row itself receives pointer events even while the row body's `onTouchStart` stops propagation — confirm by testing that tapping Complete/Snooze/Delete after a swipe actually fires.

## Files touched

- `src/components/cards/TaskRow.tsx` — swipe config, haptic callbacks, open-row coordination.
- (Possibly) `src/lib/swipe-open-store.ts` — tiny new module to track which task row is currently open so opening another closes the first. Alternative: a React context in `AppLayout`.

## Out of scope

- No changes to the bottom-nav swipe gesture (already fixed via `data-no-swipe`).
- No changes to long-press / quick-edit behavior.
- No new action buttons — only how existing ones reveal and confirm.

## Verification

On the mobile preview (411×729):
1. Swipe a task half-way from the grip → row stays parked, three action buttons visible.
2. Tap Snooze → action fires, row closes, haptic plays.
3. Swipe a second task → first row auto-closes.
4. Tap anywhere outside the open row → it closes without firing an action.
5. Feel a tick on swipe start, a snap when crossing the threshold, and the action's signature pattern on tap.
