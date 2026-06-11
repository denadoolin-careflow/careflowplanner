# CareFlow — Phased Recommendations Build

Spec: ship both the **Fine-tune (7)** and **Add (6)** lists in phases so each batch is reviewable. Phase 1 is in flight now; later phases ship in subsequent turns.

## Phase 1 — Cheap fine-tunes (this turn)
1. **Transit Detail Sheet**: default to centered modal on desktop, side-sheet on mobile. User can still flip with the existing Side/Center toggle. _(done — `TransitDetailSheet.tsx`)_
2. **Cosmic state in Carey**: moon phase + top 3 active aspects added to `buildCareySnapshot`; system prompt updated so Carey uses it sparingly. _(done — `src/lib/carey/context.ts`, `supabase/functions/carey-chat/index.ts`)_
3. ⌘K hint already present in `UniversalSearchBar`. _(verified)_
4. Mobile `HeaderNowStrip` already has a compact-chip mode at `<md`. _(verified, no change)_

## Phase 2 — Bigger fine-tunes
5. **Unified card primitive** shared by Cosmic / Carey / Today (one wrapper component, one shadow/border token set).
6. **Collapsed-sidebar indicator dots** — small unread/today count per Flow group when sidebar is collapsed.
7. **Capacity score (0–100)** in header — fuses energy + cycle phase + moon phase + transit intensity into one chip with a tap-to-explain sheet. New file: `src/lib/capacity.ts`. New component: `CapacityChip`.

## Phase 3 — Add features (functional)
8. **Defer to a better day** — task action that proposes 2–3 future dates ranked by capacity score. Plugs into existing task editor.
9. **Caregiver load meter** in header — surface `mental-load.ts` + `carey/burnout.ts` + `carey/capacity.ts` as a small ring next to Capacity.
10. **Finish archetype → dashboard pack** — wire `apply-archetype-setup.ts` + `dashboard-pack.ts` so onboarding lands users on a curated layout.

## Phase 4 — Add features (heavier infra)
11. **Offline-first Today + Brain Dump** — finish wiring `sync-queue.ts`; introduce `vite-plugin-pwa` with `generateSW`, NetworkFirst nav fallback, guarded registration (no preview SW). Tested only in published app.
12. **Share / export day or week as PDF** — server-side render via edge function or client-side `react-pdf`; export route per day/week.
13. **Weekly Carey check-in (Sunday digest)** — new edge function `carey-weekly-digest` + scheduled cron, surfaces in `WhatsNewPopover` or a new bell badge.

## Technical notes
- Carey snapshot stays dependency-free of the cycle store for now; cycle data joins in Phase 2 via the Capacity score.
- No DB changes in Phase 1. Phase 4 adds an `ai_weekly_digests` table + cron.
- All work is additive — no breaking removals beyond what we've already cleaned up in Cosmic Flow.

---

# Archive — previous Cosmic Flow workstreams (shipped)

The earlier 6 Cosmic workstreams are complete; notes preserved below for reference.

## 1. Aspect engine on transits
- Use existing `src/lib/cosmic/astro/aspects.ts` (already supports conjunction, opposition, trine, square, sextile + minors).
- Add a daily aspect detector in `src/lib/cosmic/events.ts` (or a new `aspect-events.ts`) that scans transiting planet pairs each day and emits `CosmicEvent`s for: conjunction, opposition, trine, square, sextile, plus **cazimi** (Sun conjunct planet within 0°17′).
- Merge into `eventsOnDay()` so every timeline/strip/calendar picks them up automatically.
- Glyphs + element/tone metadata via `event-meta.ts` so the strip illuminates the right elemental colors.

## 2. Fix "reading the layers" loader on Current Transits
- `CurrentTransitsTable` on Dashboard is stuck on its loading state. Inspect, find the unresolved promise / missing dep, and fix so it renders the live transit list.

## 3. Astrological-friendly transit copy + journal CTA
- Extend `TransitDetailSheet` (used by the timeline strip) with four sections generated from a new helper `src/lib/cosmic/transit-guidance.ts`:
  - **Do more** · **Do less** · **What to expect** · **Tarot card**
  - **Journal prompt** with a "Journal with this transit" button that deep-links to `/journal-flow?prompt=...&transitId=...`.
- Deterministic copy keyed by (planet, aspect, sign) — no AI call needed; keeps it instant and offline.

## 4. Calendar shows transits + clickable dashboard timeline
- `CosmicCalendar`: render transit chips under each day (reuse `eventsOnDay`, color by element).
- `CosmicTimelineTabs` (dashboard widget): make each item clickable → open `TransitDetailSheet`; apply element color tinting on the card border/glyph using `ELEMENT_VAR` like the strip already does.

## 5. Replace Today/Tomorrow/7/30 tabs with "This Week" + week picker
- `CosmicTimelineTabs`: swap segmented tabs for a single "This Week" label plus prev/next week arrows and a shadcn date popover that snaps to the week containing the chosen date.
- List shows the 7 days of that week with their events.

## 6. Complete Advanced Astrology row
- `AdvancedAstrologyRow` currently shows 6 tiles with light data. Flesh out so each tile (Profection Year, Solar Return, Progressed Moon, House Activations, Lunar Return, Ruler of the Year) is clickable → routes to `/cosmic-flow/predictive` with a section anchor, and shows richer sub-copy (e.g. progressed Moon house, time-lord meaning, days-until next return).
- Verify `CosmicPredictive.tsx` has matching sections; add the missing ones if not.

## Technical notes
- All work is pure client TypeScript — no DB, no edge function, no new secrets.
- Aspect scanning runs per-day with a small orb (≤6° for majors, 0°17′ for cazimi) and is memoized by date string.
- New file: `src/lib/cosmic/aspect-events.ts`, `src/lib/cosmic/transit-guidance.ts`.
- Edited: `events.ts`, `event-meta.ts`, `CurrentTransitsTable.tsx`, `TransitDetailSheet.tsx`, `CosmicTimelineTabs.tsx`, `CosmicCalendar.tsx`, `AdvancedAstrologyRow.tsx`, possibly `CosmicPredictive.tsx`.
- Verify with `tsc --noEmit` after each workstream.

Want me to proceed with all six, or trim/reorder?
