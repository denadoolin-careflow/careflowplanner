# Cosmic Flow page redesign (phone, tablet, desktop)

Layout and presentation only. Every card, reading and button stays; nothing is removed or recalculated.

## Phone (under 640px)
```text
[ Hero: date · moon phase · Sun/Moon/Rising ]
[ Quick tools: Natal  Chapter  Tarot  Moon  Sky  Almanac ]  <- swipeable chip row
[ Tabs:  Today | Sky | Guidance | Explore ]                <- sticky under header
```
- **Today** tab: today's overview, "what this means today" (moon + void-of-course), daily tarot card, Align focus.
- **Sky** tab: current transits as stacked cards (not a wide table), then the upcoming timeline.
- **Guidance** tab: personal guidance, suggested CareFlow actions, Journal with the sky.
- **Explore** tab: predictive snapshots and advanced astrology links.
- The tab you were on is remembered on this device. Cards go full width with roomier tap targets (44px), and the bottom area leaves space for the dock.

## Tablet (640–1023px)
- Same tool chip row, no tabs. A two-column grid: Today and Sky on the left, tarot, Align focus and Guidance on the right. Explore cards at the bottom in two columns.

## Desktop (1024px and up)
- Three columns: the main reading column (overview, meaning, transits, timeline) is 2 wide, and a sticky right rail holds tarot, Astro Suite tools, Align focus and Journal.
- Below that, personal guidance and actions sit side by side, then a full-width advanced row.
- The separate Natal/Calendar buttons merge into the tool chip row so there is one navigation.

## Polish
- Same card spacing and heading style throughout, using the CareFlow tokens (no new colors).
- The Big Three line moves into the hero.
- Emoji tool icons become the app's line icons.

## Technical details
- `CosmicFlow.tsx`: add a `CosmicQuickTools` chip row and `CosmicMobileTabs` (shadcn Tabs, `md:hidden`); the tablet/desktop grids use `md:` and `lg:` classes. Tab state lives in localStorage `careflow.cosmic-tab`.
- `CurrentTransitsTable`: a stacked card layout below `sm`.
- Verify with Playwright at 384×708, 841×712 and 1280×1800.
