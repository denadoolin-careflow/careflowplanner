# Unified Lunar Living + Calendar

Bring richer moon data from the Lunar Life project into CareFlow and tie it into a single planning surface across the Lunar Living tab and the Month/Calendar views.

## 1. Port data from Lunar Life

Create three new helpers in `src/lib/`:

- `moon-days.ts` — 30-day lunar-day meanings (`MOON_DAYS`, `getMoonDayNumber`, `getMoonDayMeaning`).
- `zodiac.ts` — `ZodiacSign`, `getZodiac` (sun sign), `getMoonSign` (Meeus moon-in-sign approximation), `MOON_IN_SIGN_GUIDE` (per-sign vibe + 3 actions + body cue + what to avoid), element/symbol maps.
- `lunar-phases.ts` — a new "4 key phase" model that wraps the existing 8-phase `MoonPhase`:
  - `sow` ← new moon
  - `grow` ← first quarter (also waxing crescent/gibbous map to "growing")
  - `glow` ← full moon
  - `let-go` ← last quarter (also waning gibbous/crescent map to "releasing")
  - Each entry carries: label, verb, color token, short invitation, 3 plan-with hints (tasks/intentions/journal), and a longer planning paragraph.

Keep existing `src/lib/moon.ts` untouched — the new key-phase model layers on top.

## 2. New widget: `LunarPhaseWidget`

`src/components/lunar/LunarPhaseWidget.tsx` — replaces the current hero in `LunarLivingPage.tsx` and is also embeddable on Dashboard.

Contents:
- Big `MoonGlyph` + tonight's full label (e.g. "Waxing Gibbous · Grow"), illumination %, days to full / new.
- **Key-phase badge** — pill in the phase's color: 🌑 Sow / 🌓 Grow / 🌕 Glow / 🌗 Let Go, with the verb-driven invitation underneath.
- **Moon in sign** row — sign glyph + name + 1-line vibe from `MOON_IN_SIGN_GUIDE`.
- **Lunar day** chip — "Day 14 · Brink" with one-line meaning.
- Strip of next 4 key phases with date + verb label.

## 3. Planning insights panel

`src/components/lunar/PhasePlanningCard.tsx` shown below the widget on the Lunar Living tab.

Sections:
- **How to plan today** — 3 actionable hints from the key-phase model (Sow → set 1 intention, capture seeds in Inbox; Grow → schedule focused work blocks; Glow → review/celebrate, run Weekly Review; Let Go → archive, decline, clean reset).
- **Moon-in-sign actions** — 3 micro-actions from `MOON_IN_SIGN_GUIDE` with a one-tap "Add to Today" button that creates a task via the existing task store.
- **Plan with this phase** button — opens the existing `PlanWithEnergyDialog` (or a thin new `PlanWithPhaseDialog`) pre-seeded with the phase's planning paragraph and suggested area.

## 4. Calendar / Month integration

Connect the same data to the existing calendar surfaces:

- `src/pages/Month.tsx` — the existing Moon overlay row already shows phase/sign/element. Augment its caption to also show the key-phase verb (Sow/Grow/Glow/Let Go) and color the day-cell ring on the four key-phase days using the phase's token color.
- `src/pages/CalendarPage.tsx` — extend the existing emoji-only badge (`moonPhaseFor`) so that on the four key days it shows the verb label too, and clicking the day opens a small popover with the planning hints from `lunar-phases.ts`.
- `src/components/rhythm/MoonPhaseBadge.tsx` — gain an optional `showKeyPhase` prop so the day-header chip can read "🌕 Glow" instead of "Full moon" on key days, keeping vocabulary consistent across surfaces.

## 5. Wiring

- Mount `LunarPhaseWidget` at the top of `LunarLivingPage.tsx`, replacing the existing inline hero. Keep the rest (calendar + journal + recent entries) as-is.
- Add `LunarPhaseWidget` as an optional dashboard widget via the existing widget system (so users can pin it to their home).
- All new vocabulary (Sow/Grow/Glow/Let Go) lives in one constant in `lunar-phases.ts` so labels stay consistent everywhere.

## Technical notes

- Pure presentation/data work; no migrations or edge functions needed.
- Phase colors use existing semantic tokens (or add 4 new ones: `--phase-sow`, `--phase-grow`, `--phase-glow`, `--phase-letgo`) in `index.css` so they theme correctly in light/dark.
- Moon-sign math is deterministic (Meeus simplified) — no network calls.
- "Add to Today" reuses the existing tasks store; no new schema.
