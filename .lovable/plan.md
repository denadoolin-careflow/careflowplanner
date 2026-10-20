# New Today headers: Moon card + Calm band top strip

## What you'll see
1. **Top strip (by the search bar), Calm band style.** On every page, the slim area next to the search bar shows:
   - The date
   - The time, updating each minute
   - Weather
   - Season
   - Moon phase and sign
   - Cycle phase (only when cycle tracking is on)
   - Today's Plan / Grow / Care / Let go chip in its phase color

   On phones it shrinks to the date, weather and phase chip; tap it to see the rest. Tapping weather still opens the weather details.
2. **Today page header, Moon card style.** A rounded card at the top of Today with:
   - A moon picture on the left
   - The weekday and date, plus the time
   - The moon phase and sign
   - The Plan → Grow → Care → Let go track with today's phase highlighted
   - Weather and season in the corner
   - Today's affirmation along the bottom

   On phones it stacks: the moon and date on top, the track below, then the affirmation.

## Where the details come from
- Weather comes from your current weather setting, in your chosen temperature unit.
- Moon phase, moon sign, season and phase come from the same moon math the Planner moonscape uses.
- The affirmation comes from the phase guide on Moon & Rituals.
- Cycle phase comes from your cycle tracking.
- Nothing is invented. If weather or cycle info isn't available, that piece is left out.

## Technical notes
- New `TodayMoonHeader` sits at the top of Today, where the greeting was removed.
- The `HeaderNowStrip` top-bar area becomes a calm band. It reuses the existing weather hooks, `monthRhythmMoments` / lunar helpers, `PhaseBadge`, and the affirmations in `astro-suite/lunar.ts`.
- Uses phase tokens (`--rhythm-*`) and DM Serif Display. Semantic colors only. No data or schema changes.
- I'll check on phone and desktop that nothing overlaps or spills off the screen.
