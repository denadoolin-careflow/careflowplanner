# Year view: moon on each date + phase list under each month

## What you'll see
1. **Each date in the mini-months** keeps its phase color and also shows a tiny moon glyph (for example a waxing or full moon) and the zodiac symbol for the sign the Moon is in that day. On small phone screens the date stays readable; the moon and sign sit in a small row under the number.
2. **Under each month**, the phase bar is replaced by a short list, one line per phase change in that month:
   `Oct 2 · Plan · New Moon · ♎ Libra`
   `Oct 9 · Grow · First Quarter · ♑ Capricorn`
   ...
   Each line shows the start date, the phase name in its color with its icon, the moon glyph and phase name, and the sign. Tapping a line opens that day in the Planner.
3. Days with plans still look bold with an underline, and today stays highlighted.

## Technical details
- `PlannerYearView.tsx`: per day use `moonPhaseFor()` (emoji) and `moonSignOn()`/`getMoonSign()` (glyph); compute once per month in a `useMemo` keyed by year.
- Replace the per-month segment bar with a list built from phase-change days (reusing `lunarRhythmAt`), each row a button calling `onSelectDay`.
- Enlarge day cells slightly (taller cell, glyphs at 7–8px) and keep the 2/3/4-column grid; check at phone, tablet and desktop widths.
