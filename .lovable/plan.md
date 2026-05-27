# Mobile optimization: Week & Month

Current state at 411px wide is broken: headers wrap into a tall pill stack, the side `UnscheduledTasksRail` eats horizontal space, the 7-day TimeGrid forces horizontal scroll, and Month's 7×6 grid squeezes day cells too small to be useful.

## Scope

UI-only refactor of `src/pages/Week.tsx`, `src/pages/Month.tsx`, plus minor tweaks to a few calendar subcomponents. No business-logic, data, or routing changes.

## Week view (`src/pages/Week.tsx`)

1. **Header**: collapse the action pills on mobile.
   - Stack vertically with tighter padding (`p-4` instead of `p-6`, `text-2xl` heading).
   - Put `ScopeNavToggle`, "Reset & reflect", and Schedule/Plan toggle on a single horizontally-scrollable row (`overflow-x-auto -mx-4 px-4 no-scrollbar`).
   - Hide the helper subtext on `< sm`.

2. **Body layout**: hide `UnscheduledTasksRail` on mobile; add a "Unscheduled tasks" disclosure (`<details>` or collapsible) above `CalendarTasksPanel` that reuses the same rail content. Keep current desktop layout intact via `hidden lg:block` / `lg:hidden`.

3. **Schedule view on mobile**:
   - Default to showing one day at a time when viewport `< md`. Add a left/right day swiper using the existing `WeekRhythmRow` as the day picker (tap a day → set `selectedDate`, render `TimeGrid days={[selectedDate]}`).
   - Keep the 7-day grid for `md+`.
   - For "parts" view: already iterates per day, just ensure each card is full-width with reduced padding on mobile.

## Month view (`src/pages/Month.tsx`)

1. **Header**: same treatment — compact padding, scrollable action row, smaller title. Move "Monthly overview" and "Reset & reflect" links into the scroll row.

2. **Grid cells**: 
   - Reduce `min-h-24` to `min-h-14 sm:min-h-24`.
   - On mobile, render at most 1 event chip and a `+N` counter instead of 3 chips with labels (use small colored dots row when >1).
   - Drop the moon glyph + sign glyph pair down to just the moon glyph on `< sm`.
   - Make day-number font slightly smaller; trim cell padding to `p-1`.

3. **Tap-to-expand**: tapping a day on mobile opens a bottom sheet (reuse existing shadcn `Sheet`) listing that day's events with the same click handlers (edit task, edit appt, open block in week). This replaces drag interactions which are impractical on touch anyway.

4. **Hide `UnscheduledTasksRail`** on mobile, same pattern as Week.

5. **Overlay legend** (`showMoon`): wrap in `flex-wrap` already present; reduce gap on mobile.

## Shared helpers

- Add a tiny `no-scrollbar` utility to `src/index.css` if not present (for the action pill rows).
- Use the existing `useIsMobile()` hook in both pages to gate the single-day Week schedule and the Month bottom sheet.

## Out of scope

- No changes to `TimeGrid`, `DayPartsView`, `AgendaView` internals beyond what's needed to render in a narrow container.
- No changes to data, tasks store, or Supabase.
- Tablet (`md`) stays close to current desktop behavior.
