# Classic week tidy-up and one consistent moon across all schedule styles

## What you'll see

**1. One moon everywhere**
Right now the six schedule styles (Phase Timeline, Day Cards, Agenda Ribbon, Phase Grid, Hour Rails, Block Pills) use emoji moons from a rough math estimate. Elsewhere in the app, moons are drawn with the soft, hand-drawn moon. The plan:
- Every day heading in all six styles, plus the Classic week, shows the same small drawn moon, worked out by the app's own moon calculation. It's placed and sized the same way every time.
- Next to the moon is a small soft-tint pill with that day's Moon phase name (e.g. "Waxing Gibbous") and its Plan, Grow, Care or Let go icon and color. Same look in every style.
- New moon, first quarter, full moon and last quarter days get a slightly stronger ring so turning points are easy to spot through the week.

**2. A calmer, easier-to-read Classic week**
- **Day headings:** bigger day name and date in the heading font, the moon and phase pill, and today highlighted with a soft ring instead of a faint wash. Tap a heading to open that day.
- **Readable text:** all labels at least 12px. That includes the hour labels, row labels (Care, Meals, Rhythm), zoom percentage and legend, which are 9–11px now.
- **Phase bands:** a faint tint behind the hour grid for Plan (morning), Grow (midday), Care (afternoon) and Let go (evening), with the phase icon by the hour labels. It matches the other styles.
- **Event blocks:** rounded cards with a thin phase-colored edge and titles that wrap instead of getting cut off, matching the new task rows.
- **Toolbar:** the meals, care, rhythm, zoom and full-screen buttons get 44px tap areas and grouped soft pills, so they're easier to hit on a phone.
- **Phone:** the 3-day view stays, with the same headings and bands.

Nothing changes in your data. Dragging items onto the grid, zoom, the meals/care/rhythm rows and the weather icons all keep working.

## Technical details
- Add one shared `ScheduleDayMoon` component (e.g. `src/components/planner/schedule/ScheduleDayMoon.tsx`). It uses `MoonGlyph` for the moon. For the phase name and Plan/Grow/Care/Let go, it reuses `getMoonAgeDays` and the existing lunar phase mapping (`lunarRhythmAt`). It has a `compact` size for week cells.
- In `ScheduleStyles.tsx`: remove the `MOONS`/`moonFor` emoji code and `WeekDay.moon`. Render `ScheduleDayMoon` in every day heading (Phase Timeline/Day Cards/Agenda Ribbon/Phase Grid/Hour Rails/Block Pills, Day and Week).
- `PlannerWeekGrid.tsx` and `WeekDayHeader.tsx`: new heading layout with `ScheduleDayMoon`; raise the sub-12px classes; add phase background bands using `PHASE_HOURS` plus `--rhythm-{phase}-tint`; bigger toolbar hit areas.
- Event chips in `PlannerTimeline` (week mode): rounded-xl, phase edge via `phaseForTime`, wrapping titles.
- Add a small test that the shared moon helper returns the same phase for known dates (a full moon and a new moon).
- Check Classic week and all six styles at 390px and 1280px.
