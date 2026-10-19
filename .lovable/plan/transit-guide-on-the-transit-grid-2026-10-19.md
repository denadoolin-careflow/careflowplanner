# Transit Guide on the Transit Grid

Tapping any transit row opens a full guide panel (side sheet on desktop/tablet, bottom sheet on phone) instead of only the small orb chart.

## What the guide shows
1. **Headline** — e.g. "Saturn square your Venus", with tone tag (Supportive / Stretching / Intense / Blending) and timing (Building / Peaking now / Easing).
2. **Dates** — start (enters orb), exact date(s), end (leaves orb), and total length ("about 7 weeks"). Orb chart kept below.
3. **What it means, practically** — plain-language explanation of how the transiting planet meets your natal planet through this aspect.
4. **Where it shows up** — the house the natal planet sits in (and the house the transit is passing through), described as life areas ("home & family", "work & reputation").
5. **How to work with it** — 3–4 practical actions tailored to planet + aspect tone + house, each with "Add to Planner".
6. **Tarot for this transit** — pick Single card or a 3-card spread (Situation / Challenge / Guidance); cards drawn from the existing deck, saved to your synced tarot history, with the card linked to the transit planet highlighted.
7. **Journal** — 2–3 reflection prompts plus an inline writing box that saves a dated journal entry tagged with the transit (and tarot cards, if pulled).

## Technical details
- New `TransitGuideSheet.tsx` opened from `CosmicGrid.tsx` (replaces inline panel; keeps `SkyRowActions`).
- New `src/lib/cosmic/transit-guide.ts`: orb window scan (daily steps from date back/forward until orb exceeded) for start/end/length; practical copy built from existing `plain-language.ts` (`describeTransit`, `aspectTone`, `timingLabel`) plus house life-area and planet-action maps. Tests for window length and copy selection.
- Tarot reuses `drawCards`/`recordPull` (synced via astro_suite_state) and `TarotCardArt`; journal reuses `TransitJournalInline`. No schema change; all calculation local.
