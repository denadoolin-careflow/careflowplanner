
# Cosmic Flow Expansion — Phase 1 of 3

Phase 1 focuses on the **Transit Timeline** and **dashboard transit interactions**. Phase 2 (Birth Chart wheel + 12-house explorer + rich planet dialog) and Phase 3 (Carey AI snapshot + static header weather/moon + @transit linking in notes) come after you approve Phase 1.

## What you'll get in Phase 1

1. **Full 2026-2027 transit dataset** with element, sign, deeper meaning, and where it lands in your natal chart.
2. **Range filter** that scrolls backward/forward through any window.
3. **Clickable transits on the dashboard Cosmic Timeline strip**, color-coded by element.
4. **Journal inline** from the Current Transits widget + impact rating.
5. **Open any transit → save reflection to Cosmic Journal or Notes**.
6. **Predictive Snapshot** shows most supportive / challenging upcoming dates.

## Scope details

### Transit data (compute + enrich)
- Compute all 2026-2027 events with the existing `astronomy-engine` lib: ingresses (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, N. Node), retrograde stations, lunations (new/full moons + sign), eclipses, void-of-course Moon, major outer-planet aspects.
- Each event carries: `date`, `kind`, `planet`, `sign`, `element` (fire/earth/air/water), `aspect`, `glyph`, `tone` (supportive/growth/rest), `summary`.
- One-time Firecrawl scrape of Astro Seek's 2026 + 2027 calendars (`astro-seek.com/calendar-astrology-2026`) → seed file `src/lib/cosmic/transit-copy-2026-2027.ts` keyed by event signature. Used to enrich the static copy library with their phrasing (paraphrased / tone-aligned, not verbatim).
- New static copy library `src/lib/cosmic/transit-copy.ts` keyed by `{planet, sign}`, `{planet, aspect, planet}`, `{lunation, sign}`, etc. Warm, astrology-friendly tone (no doom language, follows `COSMIC_SYSTEM_PROMPT` guardrails).
- AI personalization layer reuses existing `ai-cosmic-transit` edge function: inputs static copy + user's natal placements + which natal house the transit lands in → returns the "how this lands for you" paragraph. Cached per user+event in new `cosmic_transit_interpretations` rows (table already exists).

### Natal house overlay
- Reuse `computeHouses` + `houseOf` from `src/lib/cosmic/astro/houses.ts`. For each transit event, attach `natalHouse` (1-12) when user has a birth chart.
- Display as: "Mars enters Aries — lighting up your 5th House of joy & play."

### Transit Timeline page (`/cosmic-flow/timeline`)
- Range filter: presets (Today, ±7d, ±30d, This month, 2026, 2027) + custom date range.
- Grouped by month, scrollable both directions, sticky month headers.
- Each row: glyph, title, date, element color chip, natal house badge, ▸ expand.
- Expanded: deeper meaning, AI personalization, "Journal this transit" button, "Save to Notes" button.

### Dashboard updates
- `TransitTimelineStrip`: each day cell becomes a button; tapping a glyph opens the transit detail sheet (color-tinted by element). Add element-color top border per cell.
- `TransitStrip` (today): each chip is already clickable for tooltip — add a "Journal" icon button + 1-5 star "How did this land?" rating. Persists to new lightweight table `transit_reflections (user_id, event_id, rating, note, created_at)`.
- `PredictiveSnapshotList`: extend to highlight upcoming supportive dates (trines, sextiles, Venus/Jupiter activity) vs. growth dates (squares, oppositions, retrograde stations) within the user's selected window.

### Journal integration
- "Save to Cosmic Journal" → inserts into `cosmic_journal_entries` with `linked_event_id`.
- "Save to Notes" → inserts into `notes` with auto-generated title `Transit · {label} · {date}` and the transit summary as first markdown block.

## Technical notes

**New files**
- `src/lib/cosmic/transit-copy.ts` — static copy library (planet-in-sign, aspects, lunations, eclipses, retrogrades).
- `src/lib/cosmic/transit-copy-2026-2027.ts` — scraped Astro Seek enrichment seed (generated once via Firecrawl script in `/tmp`).
- `src/lib/cosmic/transit-elements.ts` — element/tone color tokens (added to `index.css` as `--element-fire`, `--element-earth`, `--element-air`, `--element-water`).
- `src/components/cosmic/TransitDetailSheet.tsx` — shared detail UI (used by timeline + dashboard strip + predictive snapshot).
- `src/components/cosmic/TransitJournalInline.tsx` — composer + rating used inside `TransitStrip` and detail sheet.
- `src/hooks/useTransitsRange.ts` — computes events for any date range, joins natal house, caches.

**Files edited**
- `src/pages/CosmicFlowTimeline.tsx` — add range filter UI, grouping, clickable rows.
- `src/components/cosmic/TransitTimelineStrip.tsx` — clickable glyphs + element colors.
- `src/components/rhythm/TransitStrip.tsx` — inline journal + rating.
- `src/components/cosmic/PredictiveSnapshotList.tsx` — supportive/growth date callouts.
- `src/lib/cosmic/events.ts` — extend event metadata (element, tone, natalHouse hook point).

**Database migration (one)**
```
transit_reflections (id, user_id, event_id text, rating int 1-5, note text, created_at, updated_at)
```
Plus GRANTs + RLS scoped to `auth.uid()`. The existing `cosmic_transit_interpretations` table already handles AI cache.

**Astro Seek scrape**
Run once via Firecrawl from a `/tmp` script, write the result into the seed file, commit. No runtime dependency on Astro Seek.

**Out of scope for Phase 1** (these come in Phase 2 & 3)
- Birth chart wheel redesign + 12-house explorer + planet dialog
- Static header weather/moon glyphs
- Carey AI daily snapshot
- `@transit` linking inside notes/journal editor

---

Ready to build Phase 1? Approve and I'll start with the migration, then the data layer, then the UI.
