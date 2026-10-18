# Natal chart connections + clearer transit and sky language

## 1. Ascendant joins the Big Three
- The Big Three becomes Sun, Moon and Rising, all in the same order and style, on the right-side tiles and in the trait cards below the chart.
- Tapping Rising opens a dedicated **Rising sign** panel instead of the plain sign panel. It shows the rising sign and exact degree, what the Ascendant means, your chart ruler and where it sits (sign and house), planets in your 1st house, and current transits touching the Ascendant.
- If the birth time is missing or approximate, Rising shows a gentle "add your birth time" or "approximate" note instead of a blank.
- On the wheel, the ASC (and MC) marker can be tapped and opens the same Rising panel.

## 2. Every area of the wheel opens connected info
- **Planet tap**: the panel shows sign, degree, house, dignity and retrograde, its aspects to other planets, and tappable chips that jump to that sign or house.
- **Sign tap**: the panel lists your planets in that sign, which house the sign rules in whole-sign houses, and its ruling planet with a link to it.
- **House tap**: the panel shows the sign on that house, planets inside it, the house ruler and where it is placed, and any current transits passing through it.
- **Outer ring transit planets** become tappable and open a short "transiting X in Y, now in your Nth house" panel with aspects to your natal planets.
- Panels can link to each other (planet to sign to house) without closing and reopening, with a back step.

## 3. Friendlier language for transits and Sky
- Each transit row gets a plain one-line title and meaning, such as "Mars is pushing on your Sun: more drive, watch your patience", next to the technical label (Mars square Sun, orb 1.2°).
- Clear timing words: "building" (applying), "peaking now" (exact), "easing" (separating), plus the date of the exact hit.
- Tone tags in everyday words: Supportive, Stretching, Intense, Blending.
- Sky page: each planet gets a short "what this means today" line based on its sign (for example "Venus in Scorpio: love feels deep and private"), retrogrades explained as "review time for…", and upcoming sign changes worded as "Moon moves into Leo tonight".
- The technical terms (orb, applying, retrograde) stay available with small explanations you can tap.

## Technical details
- Add `src/lib/cosmic/plain-language.ts`: aspect tone/verb maps, planet theme and sign flavour phrases, `describeTransit()`, `describeSkyPlacement()`, and timing labels; add unit tests for sample outputs.
- `NatalWheel.tsx`: add `onSelectAngle` (ASC/MC) and `onSelectTransit` handlers on the angle markers and outer-ring glyphs; forward them through `InteractiveNatalWheel` (pan/zoom click capture must not swallow taps).
- New `AscendantDetailDialog.tsx`; extend `PlacementDetailDialog`, `SignDetailDialog` and `HouseDetailDialog` with props for chart context (planets in sign/house, ruler placement, transits) and an `onNavigate` callback; `CosmicNatal.tsx` keeps one selection stack for panel-to-panel links.
- Use the plain-language helpers in `CurrentTransitsTable`, `ActiveTransitsList`, `TransitDetailSheet` and `CosmicSky.tsx`.
- Presentation only; no database changes. Rising still uses the shared whole-sign `computeHouses`.
