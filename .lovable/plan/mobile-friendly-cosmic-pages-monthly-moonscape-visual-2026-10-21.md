# Mobile-friendly Cosmic pages + monthly moonscape visual

## 1. Two moonscape mockups to preview (first)
Both mockups show the real moon phases for the month, the sign the Moon is in each day, the solar season, and the Plan / Grow / Care / Let go colour bands. They use the styling from your CareFlow Rhythm carousel: cream paper, burgundy serif headings, and soft phase tints.

- **Mockup A: Moon Arc.** A curved arc of all the month's moons, sitting over a band in the colour of the solar season (for example "Autumn · Libra → Scorpio Sun"). The new, first-quarter, full and last-quarter moons are larger and labelled. Under each moon is its sign glyph, and the arc is tinted by phase (Plan green, Grow yellow, Care orange, Let go red).
- **Mockup B: Phase Garden Calendar.** A 7-column calendar grid where each day has a small moon drawing, the Moon's sign glyph and the date. Rows are grouped into four soft phase cards ("1 · Plan: Plant the seed", and so on), like your carousel. A season ribbon runs across the top.

I'll open both on a temporary preview page at phone width so you can tap through them and pick one. Nothing changes in the real Planner until you choose.

## 2. Build the chosen moonscape
Replace the current monthly moonscape in the Planner with the design you pick. Tapping a moon opens that day in the Planner, and the same visual also shows on Moon & Rituals.

## 3. Mobile pass on all Cosmic pages
I'll go through Cosmic Flow, Sky, Moon & Rituals, Tarot, Natal, Houses, Calendar, Almanac, Chapter, Compare, Grid, Predictive and Search at 360–390px width, and fix:
- anything that runs off the side of the screen or makes the page scroll sideways
- tap targets smaller than 44px (tabs, day arrows, chips)
- headers or date bars that cover content
- crowded tables and grids, which become stacked cards or swipeable rows
- tabs that wrap, which become one scrollable row

Each page gets a phone screenshot check before and after.

## Technical details
- The moonscape uses the moon phase and sign calculations already in the app, plus the existing solar-season helper. No new data is stored.
- Colours come from the existing phase and brand colour settings, with no raw hex values.
- The mockups live on a temporary preview page, which is removed once you pick a design.
