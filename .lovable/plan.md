
# Cosmic Flow 2.0

This is a large, multi-week build. I'll break it into phases so we can ship value early and you can steer along the way. Confirm the phasing (and Phase 1 scope) before I start coding.

## Goal
Turn `/cosmic` from a static astrology page into a living guidance system: Natal → Transits → Planner → Journal → Rituals → Carey Cosmic AI, all using **Whole Sign houses** and grounded in CareFlow planning.

## Phased Roadmap

### Phase 1 — Foundation (engine + hero) ⭐ start here
- Refactor `src/lib/cosmic/*` to a single engine module with: natal placements, **Whole Sign houses**, aspects, current transits, lunar phase, retrogrades, ingresses, eclipses, **annual profections**, **progressed Moon/Sun**, Solar Return themes.
- Verify a few sample charts against Astro-Seek (Pisces rising, etc.).
- New `/cosmic` hero: Moon phase, zodiac season, rising-sign theme, today's astro-weather sentence, 5 quick actions (Journal, Plan Day, Transits, Moon Ritual, Insights).
- Design tokens: moonlit white, deep indigo, soft lavender, muted gold, glassmorphism cards.

### Phase 2 — Birth Chart tab
- Interactive SVG wheel (hover/click planets, houses, signs; animated aspect lines).
- Click-through panel: Core Gifts / Growth Edge / In Your Life / Journal Prompt.
- House Explorer: 12 cards (sign, themes, planets present, current focus).

### Phase 3 — Current Transits tab
- Timeline scrubber: Today / Week / Month / Upcoming.
- Transit cards: planet, sign, house activated, interpretation, practical advice, journal prompt.
- "Add to planner" action on each card.

### Phase 4 — Cosmic Planner tab
- Per-transit planning suggestions (best for / avoid / suggested tasks).
- One-click "Add tasks to planner" → writes into existing `tasks` table for today.
- Daily energy gauges: Focus, Relationships, Creativity, Home, Wellness.

### Phase 5 — Cosmic Journal tab
- Auto-generated daily prompts (Reflection / Shadow / Action) from Moon + transits + profections.
- "Write entry" links into existing journal flow.

### Phase 6 — Lunar Rituals tab
- Phase-aware rituals (New / First Quarter / Full / Last Quarter), personalized by natal Moon.
- Link each ritual to a journal entry.

### Phase 7 — Carey Cosmic Mode + Insights Feed
- Extend existing Carey edge function with a `cosmic` system prompt that receives the user's natal + today's transits + goals/tasks summary.
- Personalized insights feed on the hero ("Venus entering your 9th House…").

## Technical Notes
- Engine lives in `src/lib/cosmic/engine.ts` (pure functions, fully typed); UI consumes via `useCosmic(date)` hook.
- Whole Sign: ascendant sign = house 1, next sign = house 2, etc. Drop Placidus cusps from transit/house logic.
- Calculations use existing ephemeris helper (already in `src/lib/cosmic/`); no new heavy deps.
- New tables only if needed for saved insights/ritual completions — I'll surface a migration when we hit that phase.
- Carey Cosmic uses the existing edge function via Lovable AI Gateway (no new secret).

## What I need from you
1. **Approve the phase order** (or re-order).
2. Confirm I should start with **Phase 1 only** in the next turn, then check in with you before Phase 2.
3. Any natal-data caveat — should I assume users with no birth time get a noon chart with a soft warning? (Astro-Seek default.)
