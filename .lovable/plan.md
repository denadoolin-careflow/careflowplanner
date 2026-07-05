# Home Reset — Redesign & New Capabilities

Scope: `src/pages/HomeReset.tsx` and `src/components/reset/redesign/*`. Backend fields already exist (`time_block`, `due_date`, `est_minutes`, `kind`) so no schema changes.

## 1. Replace FAB with a sticky Toolbar

- Remove `<QuickFab />` from bottom of `HomeReset.tsx`.
- Add a horizontal toolbar directly under the page header, sticky on scroll (`sticky top-0 z-20`, glass background):
  - Add task · Add zone · AI generate · History · Low‑energy toggle · Reset all.
- Same `handleFabAction` handlers, wired to buttons instead of a floating menu.

## 2. Focus + Pomodoro strip (top of page)

- New component `FocusTimerStrip.tsx` placed above `HeroBand`.
- Shows the current focus task (from `smartNext` on `current` list), an inline 25/5 timer bound to `pomodoro` store, and Start / Pause / Skip / Complete buttons.
- Completing from the strip calls existing `completeItem` and advances to next `smartNext`.

## 3. Move Tips + Moon guidance to the top

- Relocate the `TipsCarousel` + `MoonResetTip` section from bottom to just under the Focus strip (before HeroBand progress row).
- Collapsible on mobile (chevron), remembers state in `localStorage`.

## 4. Morning / Afternoon / Evening section

- New component `TimeBlockBoard.tsx` between Progress row and Room cards.
- Three columns (stack on mobile) using existing `time_block` field on `reset_items`.
- Inline tasks: checkbox, title, est time, hover state reveals actions:
  - Schedule (opens new date/time popover — see §5)
  - Start timer (loads task into Focus strip)
  - "Go to area" link that scrolls/opens the matching room card via `iconFor` name match.
- Highlights the current block based on `currentTimeBlock()`.

## 5. Schedule checklist tasks

- New `ScheduleTaskPopover.tsx` modeled on `src/components/tasks/QuickScheduleButton.tsx` (Today / Tomorrow / This week / Pick date, plus a Time‑block picker: morning/afternoon/evening).
- Writes `due_date`, `time_block`, optional `start_time` via existing `reset.updateItem`.
- Trigger: schedule icon on every task row in `RoomCard` `TaskRow` and in the TimeBlockBoard rows.

## 6. Per‑zone reset button

- On each `RoomCard` header (and each zone view header), add a "Reset zone" icon button.
- Confirmation toast with Undo; calls `reset.updateItem(id, { done: false })` for all root items in that list.
- Existing global `resetEntireHome` stays, moved into the new toolbar.

## 7. Timer button on area header (cycles tasks)

- On each `RoomCard` header, add a Play icon that starts a cycling timer:
  - Loads the first incomplete root item into Focus strip.
  - On complete, auto-advances to the next incomplete item in that room until done, then celebrates with existing `RoomCelebration`.
- Implemented via a small `useZoneCycle(listId)` hook that reads from `reset.lists` and drives Focus strip state.

## 8. Create / delete zones

- Toolbar "Add zone" opens a small popover: name + kind (`quick | weekly | deep | low_energy | custom`) + optional icon key.
- Uses existing `reset.createList` / `reset.deleteList` (delete already wired via room sheet's `onDeleteList`).
- Add a delete affordance in the RoomCard "..." menu as well.

## 9. Implement By Room / Routines / Zones views

Existing `ViewSwitcher` currently only filters. Concrete behavior per tab:

- **By Room**: current room-name grouping (unchanged) with `ROOM_FILTERS` rail.
- **Routines**: groups by `kind` — Quick reset · Weekly · Deep clean · Low‑energy. Header per group with count + reset button.
- **Zones**: flat grid of every custom zone (`kind === 'custom'` or user‑created lists), each with the new zone timer + reset controls.
- Persist selected view in `localStorage`.

## Technical notes

- Files to add:
  - `src/components/reset/redesign/FocusTimerStrip.tsx`
  - `src/components/reset/redesign/TimeBlockBoard.tsx`
  - `src/components/reset/redesign/ResetToolbar.tsx`
  - `src/components/reset/redesign/ScheduleTaskPopover.tsx`
  - `src/components/reset/redesign/AddZonePopover.tsx`
  - `src/hooks/useZoneCycle.ts`
- Files to edit:
  - `src/pages/HomeReset.tsx` — remove FAB, add toolbar, reorder sections, wire new tabs.
  - `src/components/reset/redesign/RoomCard.tsx` — header timer + reset buttons; task row schedule button; hover-reveal actions.
  - `src/components/reset/redesign/pieces.tsx` — export a slimmer `ViewSwitcher` labeled By Room / Routines / Zones.
- Reuses existing `pomodoro` store, `reset.updateItem`, `smartNext`, `iconFor`, `MoonResetTip`, `TipsCarousel`, `RoomCelebration`.
- No DB migrations, no changes to `HeroBand.tsx` colors (previously matched to atmosphere).

- Drag-and-drop between time blocks (checkbox + schedule popover only).
- Server-side recurring schedules (uses existing `reset_recurrence`).
- New task fields beyond what `reset_items` already supports.