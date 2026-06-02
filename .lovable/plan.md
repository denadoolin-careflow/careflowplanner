# Lunar Life × CareFlow Integration

Layer Lunar Life Home's softness and a real **astrological transits** engine into CareFlow's existing rhythm/cycle/tarot stack — fully toggleable for users who aren't into astrology.

## 1. Astrology master toggle (Settings → Rhythm)

Today `useRhythmForecastEnabled` toggles moon/sign chips. Replace it with a small group:

- **Astrology** (master) — when OFF hides all of: rhythm forecast, moon-sign chips, tarot, transits, moon journal banner, MoonGuidanceHero, lunar widgets. Cycle stays (it's health, not astrology).
- **Transits** (sub-toggle, on by default when Astrology is on)
- **Tarot** (sub-toggle)
- **Menstrual cycle overlay on lunar surfaces** (already exists via `cycle-store.enabled`)

New helpers in `src/lib/astrology-prefs.ts`: `useAstrologyEnabled`, `useTransitsEnabled`, `useTarotEnabled`. `isRhythmForecastEnabled` becomes `astrology && rhythm`. Wire all current call sites (`MoonPrefetcher`, `RhythmGuidanceCard`, `TodayEnergy`, `MoonJournalReminderBanner`, sidebar lunar quick-jumps, dashboard widgets) through the new gate.

## 2. Astrological transits engine (new)

New `src/lib/transits.ts` — pure math, no API keys, follows the same Meeus-style approach already in `rhythm-forecast.ts`:

- **Planet longitudes** (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn) — abridged VSOP87 mean-element series; ~0.1° accuracy is plenty for caregiver-grade guidance.
- **Daily transit list**: planet → sign (and ingress days), retrograde stations for Mercury/Venus/Mars/Jupiter/Saturn, **Mercury retrograde windows**, **void-of-course moon** (gap between last major Moon aspect and next sign ingress), **Sun↔Moon major aspects** (conjunction, square, opposition), and the active **moon phase**.
- Each transit gets a caregiver-friendly one-liner (e.g. *"Mercury retrograde — re-read, re-do, re-check. Don't sign new things."*, *"Void of course moon — drift is allowed."*, *"Moon ingresses Cancer — soft, family-first window."*).
- Cached per local date to localStorage, prefetched by `MoonPrefetcher` for ±1 month so the Today/Week/Month surfaces render instantly.

## 3. New surfaces

### Today
- New **TransitStrip** card (between RhythmGuidanceCard and AIDailyGuidance): horizontally scrollable chips for today's active transits with tooltip explanations and a "Plan around this" button that opens the existing `PlanWithEnergyDialog` pre-filled with the dominant transit's guidance.
- Extend `RhythmGuidanceCard` to render the **moon-day affirmation in Lunar Life voice** ("You are not behind. You are exactly where today needed you.") and gain a tiny `MoonLogo` (ported from Lunar Life Home).
- New **TarotSpreadSheet** trigger: tap today's tarot card → bottom sheet offers three small spreads (Past/Present/Future, Mind/Body/Spirit, Morning/Afternoon/Evening). Cards are deterministic per date + spread name, drawn from existing `MAJOR_ARCANA`.

### Week / Month
- `WeekRhythmStrip` already shows moon glyphs per day — add a small dot/indicator for days with active named transits (retrograde stations, ingresses, VoC). Tap → opens `DayLunarSheet` with the transit list for that day.
- `Month.tsx` calendar cells gain a faint glyph row (already has moon phase glyphs from earlier work) — extend to show ingress glyphs (♋, ♌ …) and an "℞" mark on retrograde station days.

### Dashboard
- New **TransitsToday** widget (registered like `MoonWrap`) and a new **LunarPlannerCard** that brings the Lunar Life Home aesthetic: greeting, gentle wins progress bar, energy toggle (low/med/high), and a peek at the day's top transit.

### Sidebar
- The existing pinned/months/weeks block gains a small "Astrology" disclosure (only when Astrology=on) with quick links to Moon Journal, Today's Transits, and current Cycle phase.

## 4. Energy-gated planning (from Lunar Life Home)

Port Lunar Life Home's energy concept into CareFlow's planner without duplicating tasks:

- New `src/lib/energy-store.ts` (localStorage + cycle-store-style hook) holds today's self-reported energy (low/med/high). Persists per date.
- New `EnergyToggle.tsx` component (3 pill buttons, sage/clay/moon styling) — appears on **Today**, **PlanDay**, and the **DailyPlanningDashboard**.
- Existing task lists on Today and Plan get an optional **"Match my energy"** filter: hides tasks tagged `est_minutes >= 45` when energy=low, surfaces `low-effort` first when energy=medium, shows everything when high. No DB schema change — purely a client-side view filter that respects existing `est_minutes`, `energy` task field, and rhythm forecast's `energyFloor`.
- `RhythmGuidanceCard` reads the energy toggle so its suggestion text adapts (e.g. low-energy + waxing-gibbous = "tend one thing, postpone the rest").

## 5. Moon journal upgrade

- `MoonJournalReminderBanner` already nudges on key-phase days. Extend its target sheet (`DayLunarSheet`) with:
  - Two new prompts per key phase (Sow/Grow/Glow/Let Go) — pulled from `lunar-phases.ts`.
  - "Cycle + moon" combined reflection when `cycleSettings.enabled` (e.g. *"Cycle day 14 meets a full moon — what feels amplified?"*).
  - The chosen tarot card and any active transit are written into the journal entry as italic context lines (read-only).
- A new `moon_journal_entries` table is **not** needed — entries continue to live in existing `notes` with a `moon-journal` tag (matches current pattern).

## 6. Visual layer (port from Lunar Life Home)

- Add `MoonLogo.tsx` to `src/components/widgets/` (small SVG of crescent + dot, animates with existing `animate-float`).
- Add 3 new gradient tokens in `index.css` under `--lunar-*` namespace: `--gradient-moon`, `--gradient-sage`, `--gradient-clay` (HSL only, semantic). Tailwind tokens: `bg-moon-grad`, `bg-sage-grad`, `bg-clay-grad`. Used only by lunar surfaces — does not change the global theme.
- Reuse Lunar Life's "gentle wins" progress bar pattern inside the new LunarPlannerCard.

## 7. Settings copy

`/settings` Rhythm section becomes:

```text
Astrology
  ├─ Master switch
  ├─ Show transits (Mercury retrograde, ingresses, VoC moon)
  ├─ Show tarot card of the day + spreads
  └─ Recommendation tone: Gentle | Actionable   (existing)
```

Microcopy under the master: *"Off — hides moon phases, transits, tarot, and lunar journal prompts everywhere. Cycle tracking stays available under Health."*

## Technical notes

- **No database migrations.** Everything is client-side prefs (localStorage) + math.
- New files: `src/lib/astrology-prefs.ts`, `src/lib/transits.ts`, `src/lib/energy-store.ts`, `src/components/rhythm/TransitStrip.tsx`, `src/components/rhythm/TransitChip.tsx`, `src/components/today/TarotSpreadSheet.tsx`, `src/components/today/EnergyToggle.tsx`, `src/components/widgets/MoonLogo.tsx`, `src/components/dashboard/widgets/TransitsToday.tsx`, `src/components/dashboard/widgets/LunarPlannerCard.tsx`.
- Edits: `src/lib/rhythm-forecast.ts` (delegate `isRhythmForecastEnabled` to the new gate), `src/pages/Settings.tsx` (new toggles), `src/pages/Today.tsx` (TransitStrip + EnergyToggle), `src/pages/PlanDay.tsx` (EnergyToggle), `src/pages/Week.tsx`, `src/pages/Month.tsx` (transit indicators), `src/components/today/RhythmGuidanceCard.tsx` (MoonLogo + tarot spread trigger), `src/components/cycle/MoonJournalReminderBanner.tsx` (combined cycle+moon prompts), `src/components/rhythm/MoonPrefetcher.tsx` (prefetch transits), `src/components/dashboard/WidgetRegistry.tsx` (register new widgets), `src/components/layout/Sidebar.tsx` (astrology disclosure), `src/index.css` + `tailwind.config.ts` (lunar gradient tokens).
- Reuses existing `MAJOR_ARCANA`, `KEY_PHASES`, `getMoonSign`, `getPhaseInfo`, `MoonPrefetcher`, `PlanWithEnergyDialog`, `DayLunarSheet`, `cycle-store`.
- All copy stays in the existing caregiver-gentle voice; transit one-liners modeled on `MOON_GUIDANCE`.

## Out of scope (call out if you want them later)

- Natal-chart input / personal placements (would need birth time/location form).
- Real ephemeris from an external API (Swiss Ephemeris). Local math is accurate to ~0.1° which is plenty for the chips we're showing.
- Custom tarot decks / Minor Arcana.
- Persisting energy history to Supabase (currently localStorage only).
