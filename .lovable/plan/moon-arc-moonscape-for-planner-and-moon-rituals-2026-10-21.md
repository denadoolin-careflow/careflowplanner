# Moon Arc moonscape for Planner and Moon & Rituals

## What you'll see
- The Planner's monthly moonscape becomes the **Moon Arc**: a curved arc of every moon in the month, shown over a band in the solar season's colour. New, first quarter, full and last quarter moons are bigger and labelled. Each moon has its zodiac sign glyph underneath.
- Below the arc there's a row of **four phase cards**: Plan, Grow, Care, Let go. They follow the style of your CareFlow Rhythm board. Each card shows:
  - a small phase picture (sprout for Plan, sun for Grow, watering can for Care, falling leaves for Let go)
  - the moon glyph for that phase and the sign the Moon is in when the phase starts
  - the date range and a short tagline: "Plant the seed.", "Bring it outward.", "Tend what you've created.", "Empty the cup."
- Tapping a moon or a phase card opens that day, just like the current moonscape does.
- The same Moon Arc also appears on Moon & Rituals for the month you're viewing.
- On a phone, the arc scrolls sideways if it needs to, and the phase cards stack 2×2. Tap targets are at least 44px.
- The temporary mockup preview page is removed.

## Technical details
- Pull `MockupArc` out of `src/pages/MoonscapeMockups.tsx` into a new `src/components/cosmic/MoonArc.tsx`. It takes `month` and an optional `onSelectDate` callback.
- Add a `PhaseIconCards` part built from `rhythmPhaseForMoon` / `RHYTHM_LABEL`, the phase start dates from the month's days, `moonSignOn` and `SIGN_GLYPH` (with `\uFE0E` so glyphs don't render as emoji). The illustrations are inline SVGs coloured with phase tokens.
- Replace the inside of `MonthlyMoonscape.tsx` with MoonArc, keeping its props and existing navigation, intentions and reminder links so `PlannerMonthExperience` doesn't change.
- Render MoonArc in `CosmicMoon.tsx` near the top.
- Remove the `/cosmic-flow/moonscape-mockups` route and page.
- Use semantic or phase tokens only. Check at 360px and on desktop that nothing overflows.
