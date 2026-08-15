# Planner: smarter capture, accessible chips, and a workspace-shaped left panel

Nine improvements across the planner grid, chips/editors, and the left panel. No changes to the underlying task/appointment data model beyond one new profile preferences column.

## 1. Auto-detect area when creating tasks
Today new tasks fall back to `Personal` when no area is picked. Instead, infer the area from what you typed: keywords ("dentist" -> Appointments, "groceries/dinner" -> Meals, "mom's meds" -> Caregiving, "laundry" -> Home, "birthday" -> Holidays & Birthdays, "bill/invoice" -> Money, etc.), plus stronger signals first: linked project's area, tagged person's area, the planner section you created from. The area pill shows the guess with a subtle "auto" hint; picking an area manually always wins and turns the hint off.

## 2. Click anywhere on the grid to open the inline editor at the cursor
Clicking empty grid space currently creates a block at the nearest slot. It will instead open the inline composer as a floating card anchored at the click point (snapped to the 15-minute slot, with that time and day prefilled). Works in Day, 3-Day and Week grids; Escape or clicking away dismisses without creating anything.

## 3. Accessible energy popover
The energy picker becomes a proper listbox: focus moves into it on open, Tab/Shift+Tab stay inside, Up/Down move between Low/Medium/High, Enter selects, Escape closes and returns focus to the pill. Same treatment applied to the sibling Area and Priority pills so the composer is keyboard-complete.

## 4. Consistent deep links from every chip
Every chip (task, appointment, caregiving, meal, birthday, holiday, calendar event, cosmic event) routes through the shared opener with a URL that names the record — e.g. `/planner?item=appointment:<id>`, `/meals?date=...&meal=<id>`, `/seasons/holidays?item=<id>`. Landing on that URL opens the right editor with the right record and section already selected, so links are shareable and survive a refresh.

## 5. Inline quick-edit on chips
Right-click (or the "..." affordance / Enter on a focused chip) opens a compact popover on the chip itself for the fields you change most: time, duration, priority, energy, area, and done/undone. Saves in place, no navigation, undo-able through the existing planner history.

## 6. Cosmic context in the editor header
When an item carries a cosmic tag (phase/sign/element), the editor header shows a slim band with the phase glyph, the energy word, and a one-line "what to expect", plus a link into Cosmic Flow. Items with no cosmic link look exactly as they do now.

## 7. Sidebar width and collapsed state persist across devices
Panel width and collapsed state currently live in this browser's local storage only. They move into your profile so they follow you to any device, with the local value used instantly on load and reconciled once your profile loads.

## 8. Quick-add in the Routines panel
A one-line "New routine" row at the top of the Routines section: type a name, press Enter, and the routine is created and started immediately (with a slot guess from the current time of day).

## 9. Search, filter, and reorder in the left panel
- A single search box filters Habits and Routines together, matching name and tag.
- Habit filters: due today / streak active / all. Routine filters: morning / afternoon / evening / all.
- Every left-panel section (Inbox, Today, Upcoming, Projects, Habits, Routines) gets a drag handle so you can reorder them; the order is saved with the other sidebar preferences and syncs across devices.

## Technical notes

- **Area inference**: new `src/lib/area-infer.ts` with a keyword table over `AREAS`, consulted by `InlineTaskComposer` (and the planner quick-capture) after `nlp-task.ts` parsing; precedence project area > person area > section context > keywords > `Personal`.
- **Cursor composer**: `PlannerTimeline` gains an anchored-composer state (x/y + snapped minute from `planner-metrics`); `PlannerWeekGrid` reuses it per column. Rendered in a Radix `Popover` anchored to a virtual element so positioning, dismissal, and focus handling come from the primitive.
- **Popover a11y**: replace the hand-rolled button lists in `InlineTaskComposer` with `Command`/`role="listbox"` inside the existing Radix `PopoverContent`, which already supplies focus trap and Escape; add roving arrow-key handling and `aria-activedescendant`.
- **Deep links**: extend `PlannerItemOpener` with `toItemHref(item)` / `openFromParam()`; `Planner.tsx`, `Meals`, and `Seasons` read the param on mount and open the matching editor.
- **Chip quick edit**: new `ChipQuickEdit.tsx` reusing the field controls from `TaskQuickActions` and `DurationEditor`, mounted by the week grid, week board, month view, and all-day row.
- **Cosmic header**: new `EditorCosmicBand.tsx` fed by `lib/planner/cosmic-link.ts` + `day-rhythm.ts`, rendered in the task and appointment editors when `cosmicTag` is present.
- **Prefs sync**: migration adds `planner_ui_prefs jsonb not null default '{}'` to `public.profiles` (existing RLS/grants already cover it). New `usePlannerUiPrefs()` hook holds `{ taskPanelWidth, panels, sectionOrder }`, hydrating from local storage first and writing through to the profile with a debounce.
- **Left panel**: `TaskSourcePanel` gets a shared search/filter bar and renders sections from the persisted `sectionOrder` with pointer-based drag reordering (keyboard reorder via Alt+Up/Down).
