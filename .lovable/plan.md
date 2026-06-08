## Cosmic Flow Dashboard Redesign

Transform `/cosmic-flow` from a stack of cards into a focused dashboard: **Astrology → Meaning → Action → Journal**. Reuse existing data hooks (`useNatalChart`, `useDailyGuidance`, `getActiveAspects`, `getRhythmForecast`, `eventsOnDay`); this is primarily a layout, composition, and interpretation-language pass — no schema changes.

### New page structure (`src/pages/CosmicFlow.tsx`)

```text
┌── Zodiac Ribbon ─────────────────────────────────────────────┐
│ ☉ Libra · ☽ Gemini · ↑ Pisces · Water dom · Cardinal · Venus│
├── Header: "Today: Moon in Aquarius ♒ Air · First Quarter" ──┤
├──────────────────────────────┬──────────────────────────────┤
│  Natal Chart Module          │  Today's Sky (sticky sidebar)│
│  [Wheel|Houses|Aspects|Dom]  │  Moon glyph + element        │
│                              │  Mood chips                  │
│                              │  Good for ✓ / Avoid ✕        │
├──────────────────────────────┴──────────────────────────────┤
│  Current Transits (interpretation cards, not raw data)      │
│  ┌── Mars in Cancer ──────────────────────────────────────┐ │
│  │ Protective energy around family & home.                │ │
│  │ Focus: home projects · boundaries · caring leadership  │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Big Three      │   Active Houses (4th: Home & Family)      │
├─────────────────┴───────────────────────────────────────────┤
│  Timeline: Past ← Today → Upcoming (horizontal scroll)      │
├──────────────────────────────┬──────────────────────────────┤
│  Cosmic Tasks (from transits)│  Transit Reflection Journal  │
│  □ Brain Dump / Declutter…   │  Prompt + editable textarea  │
└──────────────────────────────┴──────────────────────────────┘
```

### Components

**New**
- `ZodiacRibbon.tsx` — chips for Sun/Moon/Rising + dominant element/modality/year ruler (data from `chart.planets`, `chart.dominants`).
- `NatalChartTabs.tsx` — Tabs (Wheel · Houses · Aspects · Dominants) wrapping existing `NatalWheel` + new sub-views:
  - HousesGrid: 12 cards w/ theme blurbs.
  - AspectMatrix: replaces raw table; columns Aspect / Meaning, color-coded (harmonic = sage, tension = amber).
  - DominantsPanel: element/modality bars + chart shape.
- `TodaySkySidebar.tsx` — sticky right rail. Pulls `getRhythmForecast(today)` for moon phase/sign/element, renders Mood/Good for/Avoid chips from a small lookup in `src/lib/cosmic/sky-mood.ts`.
- `TransitInterpretationList.tsx` — replaces `CurrentTransitsTable` on this page. Each item shows Title → one-sentence meaning → 2-3 focus chips. Source: `getActiveAspects` + interpretation helper.
- `ActiveHousesCard.tsx` — derives from transits intersecting natal houses; one card per activated house with theme.
- `CosmicTimelineStrip.tsx` — horizontal scroll of past/today/upcoming events from `eventsOnDay` & `forecast`.
- `CosmicTasksCard.tsx` — generates 3-5 suggested tasks from today's transits (reuse `SuggestedCareflowActions` data); each row has a checkbox that opens QuickAdd prefilled.
- `TransitReflectionCard.tsx` — picks the most prominent tension aspect, shows prompt + textarea that saves to `journal_entries` (type=`cosmic`, tag the aspect).

**New helpers (`src/lib/cosmic/`)**
- `interpretations.ts` — map of `{planet+sign}` and `{aspect}` → `{meaning, focus[]}`. Seeded with the planet-in-sign and major-aspect interpretations from the prompt; falls back to the existing copy library.
- `sky-mood.ts` — per-element (Fire/Earth/Air/Water) and per-moon-phase Mood / Good-for / Avoid lists.
- `house-themes.ts` — 1st–12th house titles + one-line themes.

**Reused unchanged**
- `NatalWheel`, `useNatalChart`, `getActiveAspects`, `getRhythmForecast`, `eventsOnDay`, `useDailyGuidance`, `PlacementDetailDialog`, `TransitLayersSheet`.

**Removed from CosmicFlow page** (kept available elsewhere)
- `DailyOverviewCard`, `CurrentTransitsTable`, `MoonCycleCard`, `JournalWithTheSkyCard`, `CosmicTimelineTabs`, `PredictiveSnapshotList`, `PersonalGuidanceGrid`, `SuggestedCareflowActions`, `AdvancedAstrologyRow` — replaced by the new composition.

### Visual system

Scoped to the Cosmic Flow page (no global theme change):
- Wrapper class `cosmic-flow-theme` in `src/index.css` overriding `--card`, `--border`, `--muted` to moonlight purple + lavender glass tones for that subtree only.
- New utility classes: `.glass-panel` (backdrop-blur + soft silver border), `.zodiac-chip`, `.aspect-harmonic` / `.aspect-tension` color tokens.
- Subtle radial gradient background tied to current moon phase.
- All colors via semantic tokens — no hard-coded hex in components.

### Data flow

```text
useBirthChart → useNatalChart ─┬─→ ZodiacRibbon, NatalChartTabs, BigThree
                               └─→ ActiveHousesCard (transits ∩ natal)
getRhythmForecast(today)       ─→ Header line, TodaySkySidebar
getActiveAspects(today)        ─→ TransitInterpretationList, CosmicTasksCard
eventsOnDay + forecast window  ─→ CosmicTimelineStrip
useDailyGuidance               ─→ AI overlay text in interpretation + journal prompt
```

### Out of scope
- Birth chart entry flow (`/cosmic-flow/birth-chart`) — unchanged.
- `/cosmic-flow/natal`, `/timeline`, `/calendar`, `/event/:id` subpages — unchanged.
- No DB migrations, no edge function changes. Journal save reuses existing `journal_entries` insert pattern from `CareExhale`.

### Acceptance
- Empty natal state still shows the "Add Birth Chart" prompt.
- Sidebar stays sticky on `lg+`, collapses below transits on mobile.
- Every transit row shows interpretation + focus chips (no bare "Mars 25° Cancer").
- Tapping a Cosmic Task opens QuickAdd with title/anchor prefilled.
- Reflection saves to `journal_entries` with `template='cosmic_transit'`.
