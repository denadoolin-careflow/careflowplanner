
# Cosmic Flow — Accuracy + Polish Pass

The current engine uses hand-rolled mean-longitude approximations (±0.3–1°) and a Placidus implementation that falls back to equal-house, which is why the rising sign and planet placements feel off. Lunar Life solved this with `astronomy-engine` (true geocentric tropical positions, retrograde detection, correct ASC/MC). This plan ports that accuracy and Lunar Life's interactive wheel + visual language into CareFlow's Cosmic Flow without changing CareFlow's information architecture.

## 1. Accurate astronomy engine

- Add `astronomy-engine` dependency.
- Rewrite `src/lib/cosmic/astro/bodies.ts` to use `Astronomy.GeoVector` + `Ecliptic` for Sun, Moon, Mercury…Pluto. Keep current approximations only for Chiron/Ceres (good enough for sign), and use Meeus polynomial for Mean Lunar Node + South Node + Lilith.
- Add proper retrograde detection (sample longitude ±12h, sign of delta) — fixes the earlier `a0` crash and the "always direct" outer planets.
- Rewrite `src/lib/cosmic/astro/houses.ts` Ascendant/MC using the standard spherical formula with quadrant correction (matches Lunar Life). Whole-sign remains default; Placidus gets a real semi-arc solver (or is hidden until correct).
- Update `chart.ts` to expose `retrograde`, `speed`, and `house` per body; recompute aspects against accurate longitudes.

## 2. Natal chart wheel — interactive + accurate

Replace `src/components/cosmic/NatalWheel.tsx` with a wheel modeled on Lunar Life's `ChartWheel`:

- Ascendant anchored at 9 o'clock, houses run counter-clockwise (traditional layout).
- Concentric rings: sign band (colored by element token), house numbers, natal planet ring, optional transit ring (outlined markers).
- Aspect lines drawn inside inner circle, color/weight by aspect type.
- Element-colored sign slices using semantic tokens `--element-fire/earth/air/water` (add to `index.css`).
- Glyph hit-targets with hover tooltip + click → opens a `PlacementDetailDialog` (port a slim version) showing sign, house, degree (DMS), retrograde, aspects, and a 1-paragraph meaning.
- Pinch-zoom / tap-to-focus on mobile; ASC/DSC/MC/IC axis pointers.
- Toggle: Natal only ↔ Natal + Today's transits (bi-wheel).

## 3. Icons & visual system

- Add `SIGN_GLYPH`, `PLANET_GLYPH`, `ASPECT_GLYPH` maps centrally in `src/lib/cosmic/glyphs.ts` (single source of truth; replaces scattered records).
- Add `RetrogradeBadge` component (small ℞ pill) used in wheel, transit list, and chapter chips.
- Add element + modality color tokens to `index.css` and `tailwind.config.ts`. All wheel colors use HSL semantic tokens (no hard-coded colors).
- Replace generic `Sparkles` placeholders on cards with sign/planet/phase glyphs.
- Lottie-free subtle moon-phase SVG (computed from current illumination) in header.

## 4. Transits & guidance polish

- New `ActiveTransitsList`: groups by planet, shows aspect glyph + orb + applying/separating arrow + days-to-exact, tap → `TransitLayersSheet` (existing 6-layer view) prefilled.
- `DailyGuidanceCard`: surface today's Moon sign/phase, void-of-course window (port `void-of-course.ts`), and one "cosmic weather" line. Confirm-tap to add suggested actions (already user-approved pattern).
- `PredictiveSnapshotCard`: add profection year ruler glyph + current Lord-of-Year highlight; show solar-return countdown.
- Add `TodaysSkyCard` (port from Lunar Life) to home: Sun/Moon sign, Moon phase %, next ingress, next aspect.

## 5. Calendar & predictive views

- `CosmicCalendar`: month grid with dots colored by event type (ingress, aspect, retrograde station, eclipse, lunation). Tap day → event sheet.
- `CosmicPredictive`: add progressed Moon sign, current profected house, next planetary return date — using new accurate engine.

## 6. Birth chart entry UX

- Reuse current `CosmicFlowBirthChart` form but add: place autocomplete already exists → ensure lat/lng/tz captured; show a live mini-wheel preview as user fills the form; validation hints for missing time (explain whole-sign still works without exact time, but ASC may be off).

## Technical notes

- New deps: `astronomy-engine` (MIT, ~80kb, no native bindings).
- Files touched: `src/lib/cosmic/astro/{bodies,houses,aspects,calendar,returns,progressions}.ts`, `src/lib/cosmic/chart.ts`, `src/components/cosmic/*`, `src/pages/Cosmic*.tsx`, `src/index.css`, `tailwind.config.ts`.
- New files: `src/lib/cosmic/glyphs.ts`, `src/lib/cosmic/void-of-course.ts`, `src/components/cosmic/{RetrogradeBadge,PlacementDetailDialog,TodaysSkyCard,ChartWheel}.tsx`.
- No DB migrations needed (cache tables already exist); bump `hashBirth` to invalidate stale cached charts after engine swap.
- No changes to AI edge functions' contracts; they consume the same `NatalChartV2` shape.

## Out of scope (defer)

- Synastry (two-chart overlay) — schema exists in Lunar Life but is a bigger build.
- Tarot/I-Ching — separate product surface.
- Custom orb settings UI (engine supports it; UI later).
