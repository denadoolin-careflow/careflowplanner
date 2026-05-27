## 1. Mobile-friendly view toggle (Schedule / Time of day / Agenda)

**Pattern:** keep header layout on `sm+`, render a dedicated row under Quick Add on mobile so the pills stay tappable instead of being squeezed into the overflow-scroll header.

- `src/components/calendar/CalendarViewToggle.tsx` — add an optional `fullWidth` / `size="sm"` variant (no-shrink pills with horizontal scroll fallback, full-row look on mobile).
- `src/pages/Week.tsx`
  - In the `SectionCard` action prop, render `<QuickAddCalendarPopover />` always and the `<CalendarViewToggle />` only on `sm+` (`hidden sm:inline-flex`).
  - Immediately below the `WeekRhythmRow`, on mobile only (`sm:hidden`), render a full-width row containing the toggle so it sits right under Quick Add and above the grid.
- `src/pages/Month.tsx` — same treatment: toggle moves under Quick Add on mobile, header on desktop. Keep the existing Moon toggle next to the view toggle in both placements.

## 2. Tappable lunar rhythm per day → bottom sheet

A shared "Plan with this day" sheet drives both Week and Month so the content stays in one place.

- New `src/components/lunar/DayLunarSheet.tsx`
  - Props: `date: Date | null`, `open`, `onOpenChange`.
  - Pulls `getRhythmForecast(date)` (phase, sign, element) + `getMoonPhase` → `toKeyPhase` → `KEY_PHASES[...]` (verb, invitation, planning paragraph, hints) + `MOON_GUIDANCE[phase]` (doMore / doLess / caregiverNote) + `getSignInfo(sign)` (element, modality, ruler, season).
  - Layout (uses existing `Sheet`, side="bottom", `max-h-[85vh] overflow-y-auto rounded-t-2xl`):
    1. Header: big moon glyph, date, phase label, key-phase verb chip in phase color.
    2. Zodiac + element row: sign emoji + name + "Moon in <sign>", element pill with emoji, ruler & modality.
    3. "Plan with this phase" paragraph (`KEY_PHASES.planning`) + 3 hint chips.
    4. Do / Don't grid: two columns sourced from `MOON_GUIDANCE.doMore` / `doLess`, plus caregiver note.
    5. Footer actions: "Open Today" (navigates `/today?date=…`) and "Open Lunar Living" (navigates `/health/lunar`).
- `src/components/rhythm/WeekRhythmRow.tsx` — replace the per-day moon-glyph navigate-to-Today click with an `onLunarOpen?(date)` callback; tapping the glyph (and the day label) opens the new sheet instead. Keep the cell click selecting the day.
- `src/pages/Week.tsx` — own `lunarISO` state, pass `onLunarOpen` to `WeekRhythmRow`, mount `<DayLunarSheet />`.
- `src/pages/Month.tsx` — on mobile the day-cell tap currently opens the events sheet; add a small moon glyph button (top-left of the cell) that `stopPropagation` and opens `DayLunarSheet`. Also expose a "Lunar guidance" button inside the existing events bottom sheet so the desktop/mobile flow both reach it.

## 3. Mobile sizing pass for Week + Month

- `Week.tsx`
  - Header padding already responsive; tighten greeting/title gap on mobile (`gap-2 p-3 sm:p-6`), make `WeekNavigator` row scroll horizontally if needed.
  - `TimeGrid` already supports single-day on mobile via `visibleDays`; ensure agenda + parts views also collapse to the selected day when `isMobile` (use `visibleDays` for `parts` as well so we don't render 7 stacked day-parts blocks on a phone).
- `Month.tsx`
  - Header: shrink to `p-3 sm:p-6`, smaller h2 on mobile (`text-xl`), wrap the Reset & Monthly-overview links into the scrollable nav row (already in the row, just verify `shrink-0`).
  - Day cells: bump `min-h-14` → `min-h-16` and increase top-row tap target so the new moon button has room; ensure tap on the cell still opens the events sheet without firing the moon button.
  - Moon toggle button: include a short "Tap any day for lunar guidance" helper text on mobile when `showMoon` is on.

## 4. Routines strip — collapsed by default on Week/Month + auto-collapse on scroll elsewhere

- `src/components/routines/RoutinesStrip.tsx`
  - Replace the current `forceClosed = pathname.startsWith("/week")` rule with a `forceClosed` rule that matches `/week`, `/month`, and `/calendar`.
  - Add a `useEffect` that listens to `window` scroll: when `scrollY > 80` and the strip is open, write `open: false` to prefs (and skip if `forceClosed`). On `scrollY < 8` we do **not** auto-reopen — user keeps control via the toggle.
  - Keep current persistence so users can manually reopen on any non-calendar page.

## Files touched

```text
src/components/calendar/CalendarViewToggle.tsx   (variant for mobile row)
src/components/lunar/DayLunarSheet.tsx           (new)
src/components/rhythm/WeekRhythmRow.tsx          (onLunarOpen callback)
src/components/routines/RoutinesStrip.tsx        (force-close routes + scroll collapse)
src/pages/Week.tsx                               (toggle placement, lunar sheet, mobile padding)
src/pages/Month.tsx                              (toggle placement, lunar sheet, mobile cell, mobile padding)
```

No backend, store, or schema changes — all frontend/presentation.

## Out of scope

- Reworking `TimeGrid` internals beyond passing `visibleDays`.
- Changing how moon/zodiac data is computed (reusing existing libs as-is).
- Desktop layout changes outside the toggle row.
