## Goal
Make the Planner timeline safer and more controllable, and make login land on the page saved in Settings (defaulting to Inbox).

## 1. Undo / redo for schedule changes
New `src/lib/planner-history.ts`: an in-memory stack (capped ~30) of reversible schedule actions. Each entry stores the before/after snapshot of the affected tasks/time-blocks (`dueDate`, `startTime`, `estMinutes`, block start/end).

Recorded actions in `PlannerTimeline.tsx`:
- Auto-schedule (one grouped entry covering all placed tasks)
- Drag-to-reschedule
- Resize / duration change
- Drop from task panel or inbox

Undo/redo replays the stored snapshot through `updateTask` / `updateBlock`. Exposed as toolbar buttons (with counts disabled when empty), `Cmd/Ctrl+Z` and `Cmd/Ctrl+Shift+Z` shortcuts while the timeline is focused, plus an "Undo" action button on the auto-schedule toast. History resets when the viewed date changes.

## 2. Inline duration editing
Click the time label on a scheduled block to open a small inline editor: preset chips (15/30/45/60/90/120 min) plus a numeric minutes input. Committing updates `estMinutes` (and the paired time block end time) and pushes a history entry. Also add ±15 min stepper buttons for keyboard/touch users, and keep drag-resize working as-is.

## 3. Conflict resolution helper
Overlaps are already flagged with a red ring. Add a click on the warning icon that opens a popover listing the conflicting blocks with one-tap fixes:
- Move this to the next free slot
- Shorten this to fit before the next item
- Push the later item down by the overlap amount
- Keep both (dismiss for this session)

Also add a summary chip in the timeline header: "2 conflicts" that scrolls to the first one. All fixes are undoable.

## 4. Saved auto-schedule preferences
New `src/lib/auto-schedule-prefs.ts` (localStorage, same pattern as `planner-prefs.ts`), holding:
- Day window start/end (default 5:00–22:00)
- Default duration for tasks with no estimate
- Buffer minutes between tasks
- Energy windows (morning/afternoon/evening ranges for high/medium/low)
- Respect existing appointments (on/off), skip past times (on/off)
- Priority-first vs duration-first ordering

A gear button next to "Auto-schedule" opens a popover to edit these; `autoSchedule()` reads them instead of the current hardcoded constants.

## 5. Accessible timeline controls
- Grid gets `role="application"` with an aria label; each block becomes a focusable element (`tabIndex=0`, `role="button"`, aria-label with title, time range and duration).
- Keyboard on a focused block: ↑/↓ move by 15 min, Shift+↑/↓ by 60 min, Alt+↑/↓ change duration, Enter opens the editor, Delete unschedules.
- Visible focus rings, `aria-live` polite region announcing the new time after a move/resize/undo.
- Toolbar buttons get labels and tooltips; icon-only buttons get `sr-only` text; drag handles get `aria-hidden` where duplicated by keyboard paths.

## 6. Default page after login
`src/components/auth/IndexRedirect.tsx` currently falls back to `/home-reset` whenever the saved route is missing or `"/"`. Change `FALLBACK_ROUTE` to `/inbox` so a user with no saved preference lands on Inbox, and keep honouring any explicitly saved route from Settings (already wired through `state.settings.defaultRoute` and the `careflow.defaultRoute` localStorage cache). No schema change needed — the Settings picker already writes `default_route` and already lists Inbox.

## Technical notes
Files touched: `src/components/planner/PlannerTimeline.tsx` (main), new `src/lib/planner-history.ts`, new `src/lib/auto-schedule-prefs.ts`, new `src/components/planner/ConflictPopover.tsx`, new `src/components/planner/AutoScheduleSettings.tsx`, `src/components/auth/IndexRedirect.tsx`. History is session-only (not persisted) to avoid replaying stale state after a reload.
