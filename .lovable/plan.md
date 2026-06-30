## Goal
Restore the Today page view-switcher ("Rhythm / Time of day / Day plan / Schedule") and the inline Quick Add bar that were lost in the recent RhythmDashboard redesign.

## Changes

### 1. `src/pages/Today.tsx`
- Read the persisted view via `useTodayView()` and Today prefs via `useTodayPrefs()`.
- Render a compact view toggle row above the dashboard:
  - Pill group using `TODAY_VIEW_LABELS` (Rhythm · Time of day · Day plan · Schedule).
  - Small "Preferences" popover (mirrors the old RhythmHeader popover) with toggles for `showCareyNudges` and `showQuickAdd`.
- Conditionally render the body based on the selected view:
  - `rhythm` → existing `RhythmDashboard`
  - `timeofday` → `TimeOfDayBoard`
  - `plan` → `DayPlanBoard`
  - `schedule` → `ScheduleBoard`
- When `prefs.showQuickAdd` is true, render `<QuickAddBar date={day} />` directly under the toggle so it's available in every view.

### 2. No changes to `RhythmDashboard.tsx`
Keep the new hero design intact; the toggle + quick add live in the page shell so they apply to all four views.

### 3. Persistence
Uses existing `useTodayView` / `useTodayPrefs` (already backed by `localStorage`), so the selection survives reloads.

## Out of scope
- No redesign of the four view boards themselves.
- No changes to other pages.
