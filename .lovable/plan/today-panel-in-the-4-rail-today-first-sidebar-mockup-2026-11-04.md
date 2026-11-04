## Today panel in the "4 · Rail + Today first" sidebar mockup

Preview page only; the real sidebar stays the same.

1. **Moon above cycle**
   - Swap the small moon badge in the corner for a full-width row under the time, e.g. "Waxing Gibbous · Moon in Taurus".
   - The cycle row ("Cycle day 12 · Follicular") sits right below it. A sample cycle row shows when cycle tracking is off, so you can see the design.
   - Tap the moon row to open a small card with a 2–3 line summary of today's energy, based on the moon phase, its Plan/Grow/Care/Let go phase and its sign.
   - Tap the cycle row to open the same kind of card with the cycle phase's energy, invitation and a short planning hint.
2. **Weather icon that matches the sky**
   - The icon follows today's forecast: sun, partly cloudy, rain, snow and so on. It shows a moon when it's clear at night. The temperature sits next to it.
   - Tap it to open a popover with two tabs:
     - **Today:** condition, high/low and chance of rain.
     - **Week:** the next 7 days, each with an icon, high/low and rain %.
   - If there's no forecast, sample values are used.

## Technical details
- Edit only `src/pages/SidebarMockups.tsx` (RailToday).
- Moon: `getMoonPhase`/`MOON_INFO` (lib/moon), `getMoonSign` (lib/zodiac), and the Plan/Grow/Care/Let go phase from the existing rhythm helper. Use shadcn Popover for both info cards.
- Cycle: `getPhaseInfo` (label, invitation, planningHints), with the current safe fallback.
- Weather: `useWeekForecast` + `useTempUnit`; reuse the condition-to-icon mapping from DayWeatherMoon, choosing a moon icon for clear weather after sunset.
- Check in a browser at desktop and phone widths, including opening each popover.
