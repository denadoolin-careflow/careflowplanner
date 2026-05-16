## Cyclical Living Tracker

A privacy-first cycle tracker that pairs your menstrual cycle with the moon (White Moon / Red Moon archetype) and feeds into the planning system you already use — Month, Today, dashboard, and AI nudges.

### 1. Opt-in & privacy

- New **Settings → Cyclical Living** section.
  - Toggle: *Enable cycle tracking* (default off).
  - Average cycle length (default 28), average period length (default 5), luteal length (default 14).
  - Show fertility window? (yes/no — defaults yes, can hide for non-fertility users).
  - Pair with moon archetype? (yes/no).
- All cycle UI (badges, rings, widget, sidebar entry) is hidden until the toggle is on.

### 2. Data model

Two new tables, RLS-locked to `auth.uid()`:

- `cycle_logs` — one row per period start.
  - `period_start` (date), `period_end` (date, nullable), `notes`.
- `cycle_day_logs` — daily log keyed by date.
  - `date`, `flow` (none/spotting/light/medium/heavy), `symptoms` (text[]), `mood`, `energy_level`, `bbt` (numeric, nullable), `cervical_mucus` (text, nullable), `is_intimate` (bool), `notes`.
- `cycle_settings` — single-row per user.
  - `enabled`, `avg_cycle_length`, `avg_period_length`, `luteal_length`, `show_fertility`, `pair_with_moon`, `moon_archetype` (auto/white/red).

### 3. Cycle engine (`src/lib/cycle.ts`)

Pure functions, no DB calls:

- `getPhase(date, settings, history)` → `"menstrual" | "follicular" | "ovulatory" | "luteal"` + cycle-day number.
- `getNextPeriodPrediction(history, settings)` → date + confidence.
- `getFertilityWindow(history, settings)` → `{ start, peak, end }`.
- `getArchetype(cyclePhase, moonPhase)` → `"maiden" | "mother" | "maga" | "crone"` with affirmation/invitation text (mirrors the tone of `MOON_INFO` in `src/lib/moon.ts`).
- `getMoonAlignment(periodStart, moonPhase)` → `"white-moon" | "red-moon" | "pink-moon" | "purple-moon"` per Lunar Life conventions.
- Per-phase planning hints: ideal task types, energy floor, recommended day-parts.

### 4. Calendar integration

- **Month view (`MonthPlanningDashboard`)**: each day cell gets a thin colored ring (menstrual=ruby, follicular=spring green, ovulatory=gold, luteal=amber). Optional moon glyph stays as-is; phases coexist.
- **Today + Day header**: small badge `🌸 Day 14 · Ovulatory · 🌕 Full` next to the date strip, with hover tooltip showing the invitation/affirmation.
- **Week view**: phase strip along the top of `WeekPlanningDashboard`, color-coded.

### 5. Dashboard widget

New `CycleWidget` registered in `WidgetRegistry`:

- Today's phase + cycle day + paired moon phase + archetype.
- "Next period in X days" / "Fertile window starts in Y days".
- One-tap log button → opens `CycleLogSheet`.
- Optional: 28-day mini ring showing phase positions.

### 6. Logging UI

- `CycleLogSheet` (slide-up sheet) accessible from widget, Today header badge, and a new sidebar entry under "Health".
- Quick actions: *Log period start*, *Log period end*, *Log today's symptoms*.
- Daily form: flow, symptoms (chips), mood, energy, BBT, cervical mucus, intimate (toggle), notes.
- History list with edit/delete.

### 7. Energy-aware planning

- Extend `ai-planner` and `ai-inbox-triage` edge functions: when cycle tracking is on, include `current_phase`, `cycle_day`, and `energy_floor` in the prompt context.
- New rules baked into the planner:
  - Menstrual → favor rest, journaling, planning; reduce meeting load.
  - Follicular → batch deep-focus / creative work.
  - Ovulatory → schedule social, presentations, hard conversations.
  - Luteal → wrap-up, admin, prep; flag tasks that exceed predicted energy.
- The existing `lowEnergyMode` automatically turns on during menstrual phase (user can override).

### 8. Moon pairing

- Reuse `src/lib/moon.ts`; no changes to moon math.
- `MoonPhaseWidget` gets an optional `pairedWithCycle` mode that shows archetype + cycle day alongside moon phase when the toggle is enabled.
- Archetype copy follows the gentle, affirming voice already in `MOON_INFO`.

### Technical details

- **Files added**
  - `src/lib/cycle.ts` (engine + types)
  - `src/components/cycle/CycleWidget.tsx`
  - `src/components/cycle/CycleLogSheet.tsx`
  - `src/components/cycle/PhaseBadge.tsx`
  - `src/components/cycle/PhaseRing.tsx` (for Month cells)
  - `src/components/settings/CycleSettingsSection.tsx`
  - `src/pages/CycleHistory.tsx` (optional history page)
- **Files edited**
  - `src/pages/Settings.tsx` — add Cyclical Living section.
  - `src/pages/Today.tsx`, `src/components/cards/DateBarStrip.tsx` — phase badge.
  - `src/components/calendar/MonthPlanningDashboard.tsx`, `src/components/calendar/WeekPlanningDashboard.tsx` — phase rings/strips.
  - `src/components/dashboard/WidgetRegistry.tsx` — register `CycleWidget`.
  - `src/components/widgets/MoonPhaseWidget.tsx` — optional paired mode.
  - `src/lib/store.tsx` — load/save cycle settings, logs.
  - `supabase/functions/ai-planner/index.ts`, `ai-inbox-triage/index.ts` — phase-aware prompts.
- **Migrations**: 3 tables with RLS (`auth.uid() = user_id`), `updated_at` triggers via existing `set_updated_at`.
- **Design tokens**: add 4 phase colors as HSL semantic tokens in `index.css` (`--phase-menstrual`, `--phase-follicular`, `--phase-ovulatory`, `--phase-luteal`) so they theme correctly in dark/light.

### Out of scope (can follow later)

- Partner sharing / multi-user views.
- Apple Health / Fitbit BBT import.
- Pregnancy mode.
- Push notifications for period prediction (we'll surface in-app first).

### Build order

1. Migrations + `cycle.ts` engine + Settings toggle.
2. Logging sheet + dashboard widget + Today badge.
3. Month/Week phase rings + moon pairing.
4. AI planner integration.
