# Three new monthly moonscape mockups

## What you'll see
A new preview page, **Moonscape mockups**, under Cosmic Flow. It shows three designs side by side on a computer and stacked on a phone. Each design uses the real moons for the month you pick, the sign the Moon is in each day, the solar season, and the Plan, Grow, Care and Let go colours. Arrows switch the month.

- **A. Lunar Tide:** a wave across the month with one moon per day. The four main moons (new, first quarter, full, last quarter) are bigger and labelled. The wave is tinted by phase, and the season sits as a soft band behind it.
- **B. Moon Wheel:** a round dial of the month's days with moons around the edge and the zodiac signs on an inner ring. The middle shows today's moon, phase and season. Tap a day to see its phase and sign.
- **C. Phase Journey:** four stacked cards, one each for Plan, Grow, Care and Let go. Each card has its illustration, dates, the moon and sign when the phase starts, and a row of small moons for the days in that phase.

Tapping a day in any mockup opens that day in the Planner. The current Moon Arc in the Planner stays as it is until you choose a design. I'll remove the preview page once you've picked one.

## Technical details
- New page `src/pages/MoonscapeMockups.tsx`, route `/cosmic-flow/moonscape-mockups` (temporary).
- Reuse `monthRhythmMoments`, `lunarRhythmAt`, `moonSignOn`/`SIGN_GLYPH`, `MoonGlyph`, the season helpers and the phase tokens. Use SVG for the tide and wheel, with no raw hex colours.
- Check that nothing spills off the screen at 360px and on desktop. No data changes.
