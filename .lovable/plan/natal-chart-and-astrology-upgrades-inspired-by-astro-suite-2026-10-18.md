# Natal chart and astrology upgrades (inspired by Astro Suite)

The goal is the same idea Astro Suite is built around: one birth chart, seen through several views, always answering "what is the sky doing to my chart right now, and what's coming next?" Every view reads from the birth chart that's already saved. Explanations stay in plain, gentle language.

## Phase 1: Natal chart page
1. **Transits on the wheel.** Add a toggle to the chart wheel. When it's on, today's planets appear on an outer ring around your birth placements, with lines showing their aspects. A date picker lets you look at any day.
2. **Transit grid.** A table of every current transit, which you can sort and filter. Each row shows the transiting planet, the aspect, your natal planet, the house it lands in, the orb, whether the transit is applying or separating, and the exact date. Tapping a row opens the explanation you already have.
3. **Houses, one by one.** A guide to each of the 12 houses: what it means, its sign and ruling planet, the ruler's strength by sign, which planets sit there, and whether this year's profection is lighting it up.
4. **Planet strength.** A badge on each planet in the planets list showing its traditional strength by sign: domicile, exaltation, detriment, fall or peregrine. Each badge has a one-line meaning.

## Phase 2: Sky views (no birth chart needed)
5. **Signs and motion.** Which sign every planet is in now, when it moves into the next sign, and its next retrograde station. Each planet gets a simple speed indicator.
6. **Lunations and eclipses.** A list of upcoming new and full Moons, each showing its sign. Eclipse seasons are highlighted, and each lunation lists the houses it touches in your chart.
7. **"Sky only" mode.** A toggle on the Calendar and Timeline that shows the sky alone, without your chart.

## Phase 3: Timing and comparison
8. **Transit peak chart.** A small line graph for a chosen transit, showing it tightening, peaking and separating over the coming months. Retrograde passes appear as several peaks.
9. **Transit search.** Pick a planet, an aspect and one of your natal planets, and get the exact dates for the next 2 years.
10. **Compare two charts.** Save a second person's birth details, such as a loved one from your caregiving profiles. A comparison view shows the aspects between the two charts and where each person's planets fall in the other's houses.

## Navigation
- Add Sky, Grid, Houses, Search and Compare to the Cosmic Flow tabs and sidebar, alongside Tarot, Moon and Almanac.
- Add "Send to Planner" and "Journal this" buttons on transit and lunation rows, matching the rest of the app.

## Out of scope
- Paid reports, PDF exports, daily emails, the world map view, and timing methods beyond profections. These can be added later.

## Technical details
- Reuse `chart.ts`, `transits.ts`, `aspect-events.ts`, `astro/profections.ts` and `NatalWheel` (add an optional `transitPlanets` prop for the outer ring).
- New pure modules with unit tests:
  - `lib/cosmic/dignity.ts`: rulership, exaltation, detriment and fall tables.
  - `lib/cosmic/ingress.ts`: next sign change and retrograde station for each planet, found by stepping through longitudes day by day.
  - `lib/cosmic/lunations.ts`: new and full Moons, plus distance from the lunar nodes for eclipse seasons.
  - `lib/cosmic/transit-search.ts`: exact dates for a transit, using orb curves.
- New pages: `/cosmic-flow/sky`, `/cosmic-flow/grid`, `/cosmic-flow/houses`, `/cosmic-flow/search` and `/cosmic-flow/compare`, registered in `NAV_SUBPAGES`.
- Compare charts are stored in the existing birth-chart storage with a new `label` and `kind` ("self" or "other"), using an additive migration. Row-level security stays scoped to the owner.
- All calculations run on the device. No AI calls are added, so these views can't hit rate limits.
