## Cosmic Flow v2: AI-Powered Astrology Guidance

Goal: turn the existing Cosmic Flow hub into a richer, AI-narrated astrology companion centered on **Your Current Chapter** — one synthesized life-season narrative instead of raw event lists. Everything ladders up to CareFlow's mission (plan, care, grow).

---

### 1. Astrology engine (calculations)

Extend `src/lib/transits.ts` and add new modules under `src/lib/cosmic/astro/`:

- **`bodies.ts`** — add Moon (already partial), Uranus, Neptune, Pluto, Chiron, Ceres, True/Mean Lunar Nodes, Black Moon Lilith (mean), and a curated fixed-star list (Regulus, Spica, Algol, Sirius, Antares, Aldebaran, Fomalhaut). Outer bodies + Chiron/Ceres use VSOP87-trimmed series or low-order analytic series — accurate to ≤0.2° for sign/house placement.
- **`houses.ts`** — Placidus + Whole Sign (user-selectable), needs birth time + lat/lng. Returns 12 cusps, MC, IC, ASC, DSC, plus chart ruler (ruler of ASC sign).
- **`aspects.ts`** — major + minor aspects (conj, opp, sq, tri, sex, quin, semisextile, sesquiquadrate, semisquare) with configurable orbs and applying/separating flag.
- **`dignities.ts`** — dominant element/modality counts, hemispheres, chart shape (bowl/bundle/locomotive/seesaw), chart ruler placement.
- **`progressions.ts`** — secondary progressions ("day-for-a-year"), progressed Moon sign + lunation phase, solar arc directions.
- **`returns.ts`** — solar return, lunar return, Saturn/Jupiter return dates and ingress charts.
- **`profections.ts`** — annual profections: profected sign + house + time-lord planet for current age.
- **`eclipses.ts`** — pre-computed eclipse table 1990-2050 (JSON) with type, sign, degree; flag activations when a transit/natal point is within 3° of eclipse degree.
- **`calendar.ts`** — moon phases, ingresses, retrogrades/direct stations, VoC, solstices/equinoxes, cross-quarter seasonal shifts.

Engine is pure-functional and runs locally. Heavy ephemeris constants kept in JSON to keep bundle small.

### 2. Data model (Lovable Cloud)

New tables (all `user_id` scoped, RLS on, grants per project conventions):

- `cosmic_chart_cache` — stores computed natal snapshot v2 (planets, houses, aspects, dignities) keyed by birth-info hash so we don't recompute on every load.
- `cosmic_chapters` — AI-generated narrative: `chapter_theme`, `characters` (planets), `lessons`, `practices`, `valid_from`, `valid_to`, `source_signals` (jsonb of transits/progressions/profection/journal themes used).
- `cosmic_daily_guidance` — daily AI snapshot: `date`, `headline`, `body`, `suggested_actions` (jsonb), `mood_tags`.
- `cosmic_journal_themes` — rolling AI analysis of journal entries: `period_start`, `period_end`, `themes`, `patterns`, `breakthroughs`.

Extend `cosmic_birth_chart` with optional `house_system`, `chart_settings_json`.

### 3. AI interpretation layer

Replace single `ai-cosmic-themes` with a small family of edge functions sharing tone guardrails:

- **`ai-cosmic-daily`** — input: today's transits + active progressions + profection lord + moon phase + natal highlights. Output JSON: `headline`, `body`, `suggested_actions[]`, `gentle_reminder`, `journal_prompt`.
- **`ai-cosmic-transit`** — per-event multi-layer interpretation: `technical`, `meaning`, `emotional`, `practical`, `growth`, `careflow` (tasks/habits/routines/journaling suggestions). Cached by event id.
- **`ai-cosmic-chapter`** — synthesizes transits + progressions + returns + profection + recent journal themes into one **Your Current Chapter** narrative. Runs on-demand and weekly via user action.
- **`ai-cosmic-journal-insights`** — analyzes last 30/90 days of journal entries; cross-references active transits to produce recurring themes, patterns, reflection prompts.

All functions:
- Use Lovable AI gateway (`google/gemini-3-flash-preview` default; chapter uses `gemini-2.5-pro`).
- Share a system prompt enforcing warm, non-deterministic, non-fear-based language ("may invite", "you might notice", "this is an opportunity to").
- Reuse existing `meterRequest` / `aiInvoke` quota plumbing.

### 4. UI changes

Restructure `/cosmic-flow` around the chapter narrative:

```text
┌─ Your Current Chapter (hero card) ──────────┐
│ Chapter Theme · Major Characters · Lessons  │
│ Helpful Practices · "Read full chapter →"   │
└─────────────────────────────────────────────┘
┌─ Today's Cosmic Guidance (AI) ──────────────┐
│ Plain-language headline + body              │
│ Suggested CareFlow Actions (✓ tappable)     │
└─────────────────────────────────────────────┘
┌─ Moon ─┐ ┌─ Active Transits ─┐ ┌─ Upcoming ─┐
└────────┘ └───────────────────┘ └────────────┘
┌─ Predictive Snapshot ───────────────────────┐
│ Progressed Moon · Profection Year · Next    │
│ Return · Eclipse Activations                │
└─────────────────────────────────────────────┘
```

New pages/components:
- `src/pages/CosmicChapter.tsx` — full chapter view with sources expanded.
- `src/pages/CosmicNatal.tsx` — expanded natal: wheel SVG, planets table, houses, aspects grid, dominants, chart ruler, Chiron/Ceres/Nodes/Lilith/fixed-star contacts.
- `src/pages/CosmicPredictive.tsx` — progressions, solar arc, returns, profections, eclipse activations.
- `src/pages/CosmicCalendar.tsx` — month grid of phases, ingresses, retrogrades, VoC, solstices.
- `src/components/cosmic/ChapterCard.tsx`, `DailyGuidanceCard.tsx`, `TransitLayersSheet.tsx` (modal showing 6-layer interpretation), `NatalWheel.tsx` (SVG), `ProgressedMoonCard.tsx`, `ProfectionCard.tsx`, `EclipseActivationCard.tsx`.

Tap any transit/event → opens `TransitLayersSheet` with all six layers + "Add suggested tasks to CareFlow" button that creates tasks/habits via existing store actions.

### 5. CareFlow integration

- **Tasks / habits / routines**: Suggested actions from AI become one-tap creators (reuses `addTask`, area auto-detect already in place). Cosmic-origin items get a subtle moon-tag.
- **Journal**: existing `logCosmicJournal` extended; chapter + daily prompts deep-link to `/journal` with prefilled prompt.
- **Cycle tracking**: cross-reference progressed Moon + menstrual cycle phase in journal insights.
- **Calendar feed**: existing `calendar-feed.ts` extended to include eclipses, returns, profection birthdays.
- **Mood tracking + goals + seasonal planning**: chapter "Helpful Practices" link to goal/season pages.

### 6. Rollout / scope

- v2.0 (this plan): engine extensions, chart cache, daily guidance, chapter (manual refresh), expanded natal page, predictive snapshot, transit layers sheet, journal insights surfaced on chapter page.
- Out of scope for now: full Placidus wheel interactivity (clickable houses), synastry/composite, horary, custom orb editor — flagged as future.

### Technical notes

- All new ephemeris math lives client-side; no extra API costs for calculations.
- AI calls are cached per (user, date) or per (user, week) to limit credit burn; chapter regenerates weekly or on user demand.
- Fixed-star + eclipse JSONs (~30KB total) loaded lazily on `/cosmic-flow/natal` and `/cosmic-flow/predictive`.
- Tone guardrails enforced in a single shared system prompt constant in `supabase/functions/_shared/cosmic-tone.ts`.

### Files (high-level)

- New: `src/lib/cosmic/astro/{bodies,houses,aspects,dignities,progressions,returns,profections,eclipses,calendar,fixed-stars}.ts` + JSON data, `src/lib/cosmic/chapter.ts`, `src/pages/Cosmic{Chapter,Natal,Predictive,Calendar}.tsx`, multiple components under `src/components/cosmic/`.
- Edited: `src/pages/CosmicFlow.tsx` (new layout), `src/lib/cosmic/hooks.ts` (new hooks), `src/App.tsx` (routes), `src/lib/cosmic/calendar-feed.ts`.
- Edge functions: `ai-cosmic-daily`, `ai-cosmic-transit`, `ai-cosmic-chapter`, `ai-cosmic-journal-insights`, shared `cosmic-tone.ts`. Keep existing `ai-cosmic-themes` as deprecated shim or remove.
- Migrations: new tables above + extension of `cosmic_birth_chart`.

### Open questions (please confirm before build)

1. House system default — **Placidus** or **Whole Sign**?
2. Chapter refresh cadence — **weekly auto + manual refresh button**, or **manual only** to conserve AI credits?
3. Should suggested CareFlow actions auto-create tasks tagged "Cosmic", or always require a confirm tap?
4. Scope check: OK to defer synastry, full interactive wheel, and custom orbs to a later pass?
