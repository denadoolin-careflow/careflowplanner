# Cycle + moon everywhere, insight history, and a rhythm-aware time review

Three connected additions, all read-only on top of existing cycle and moon data — no schema changes.

## 1. Cycle alongside the moon on day, week and month

Today the day theme (moon phase, zodiac sign, element, theme name) comes from a pure helper that can't see cycle data, so week/month headers show moon only.

- Add a small hook that pairs the existing day theme with the cycle phase for any date (phase name, glyph, cycle day, phase color token), returning `null` when cycle tracking is off.
- Week view day headers: add a cycle dot + phase glyph under the moon glyph in Insight mode, and a single colored dot in Compact mode. Tooltip reads e.g. "Waxing Gibbous · Moon in Leo · Luteal, day 19".
- Month view day cells: a tiny cycle dot next to the existing day number, colored by the phase token, so the whole month reads as a cycle band at a glance.
- Day view: the moon insight header gains the cycle phase chip next to sign/element (the atmosphere strip already shows a cycle dot; keep it consistent in color and label).
- All of it hides completely when cycle tracking is disabled in settings.

## 2. Moon Insight history timeline

A new "History" tab inside the Moon Insight card.

- A scrollable vertical timeline of past days (default 30, with 60/90 options) showing for each entry: moon glyph + phase label + illumination, moon sign and element, the day theme name, and the cycle phase if tracked.
- Entries group under phase-change markers (New, First Quarter, Full, Last Quarter) so the lunar arc is visible.
- Days that have a journal entry or daily note show a small marker; tapping the entry jumps the planner to that date, and tapping the marker opens that day's note/journal.
- Filter chips for phase, element, and cycle phase so you can pull up "every Full Moon" or "every luteal Fire day".

## 3. Time review connected to capacity, energy, moon and cycle

Extend the existing "Where the time went" review (day/week/month) with a rhythm layer.

- New "Rhythm" tab beside Type/Area: a combined chart plotting planned vs completed hours per day against moon illumination, with cycle phase shown as colored background bands and logged mood/energy points overlaid.
- Summary lines derived from the data in the current window, e.g. "You planned ~30% less during your menstrual days" or "Completion peaked around the full moon" — only shown when there's enough data to be honest about it.
- Day scope shows the surrounding 7 days for context since a single day has no trend.
- A compact version of the same rhythm summary appears in the day review card.

## Technical notes

- New: `src/lib/planner/day-rhythm.ts` (day theme + cycle pairing hook), `src/lib/planner/moon-history.ts` (history entries + filters), `src/components/planner/MoonInsightHistory.tsx`, `src/components/planner/PlannerRhythmChart.tsx`.
- Extend `src/lib/planner/time-allocation.ts` with a per-day series (planned/done minutes) plus moon illumination, cycle phase and mood/energy lookups from `mood-by-part` and cycle day logs.
- Touch points: `WeekDayHeader.tsx`, `PlannerMonthView.tsx`, `PlannerMoonInsight.tsx`, `PlannerTimeReview.tsx`, `PlannerDayReview.tsx`.
- Cycle colors reuse the existing `--phase-*` tokens; charts reuse Recharts already in the project.
