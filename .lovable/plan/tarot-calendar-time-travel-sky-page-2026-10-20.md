# Tarot calendar + time-travel Sky page

## 1. Tarot card-of-the-day calendar
- New "Calendar" view on the Tarot page: a month grid where each day shows a mini thumbnail of the daily card pulled that day (reversed cards shown flipped), plus a small dot count for any spreads pulled.
- Tapping a day opens a day panel: the daily card with meaning, every spread pulled that day (positions + cards), and a "See the sky that day" button.
- Month arrows and a Today button; empty days stay blank (no invented pulls).
- Uses your existing saved pull history, which already syncs to your account — nothing new stored. History keeps the latest 120 pulls; this limit is raised to about 2 years so the calendar stays full.

## 2. Sky page: jump to any date
- Date bar at the top: previous/next day arrows, a date picker, and "Now". Choosing a date recalculates every planet position, retrogrades, upcoming sign changes, and lunations from that date — past, present or future.
- The selected date lives in the page link (e.g. `?date=2026-03-14`) so the tarot calendar can open the sky for that exact day, and the Back button works.
- Clear label when viewing a non-today date ("Sky on Sat, Mar 14, 2025").

## 3. Connecting them
- Sky page shows a small "Tarot that day" chip when a daily card exists for the selected date, linking back to that day on the tarot calendar.

## Technical details
- `src/lib/astro-suite/tarot-pulls.ts`: add `pullsByDate(month)` helper; raise MAX to ~800.
- New `TarotCalendar.tsx` component, added as a tab on the existing Tarot page.
- `CosmicSky.tsx`: replace fixed `now` with a date read from `useSearchParams`, using the shared `DayPickerButton`; parse dates at local noon to avoid timezone shifts.
- Test for `pullsByDate` grouping and daily-pull selection.
