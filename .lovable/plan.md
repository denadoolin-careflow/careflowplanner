# Cosmic Flow Upgrades

Big request — breaking into 6 focused workstreams. I'll implement them in this order so each builds on the last.

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
