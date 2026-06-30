## Goal
Make the Today hero (greeting + big date + time + weather) and the Moon · Energy · Cycle triptych appear consistently on **Today**, **Week**, and **Month**, with richer zodiac insight under the moon phase and a new **Daily Debrief** AI section that reads today's planned tasks against capacity, moon, and cycle.

## 1. Extract shared planning header
Pull the existing `Hero` and `Triptych` blocks out of `RhythmDashboard.tsx` into two reusable components under `src/components/today/rhythm/`:

- `PlanningHero.tsx` — greeting + ticking clock + weather chip + big date. Accepts a `scope: "today" | "week" | "month"`, the anchor date, and a title/subtitle override so Week shows the range and Month shows the month name while keeping identical visual treatment.
- `PlanningTriptych.tsx` — re-exports the Moon / Energy / Cycle triptych. Keeps the current moon panel additions (sign chip, invitation, keywords) and the cycle panel insight.

`RhythmDashboard.tsx` continues to render them so `/today` is unchanged visually.

## 2. Mount on Week and Month
- `src/pages/Week.tsx` and `src/pages/Month.tsx`: render `<PlanningHero>` + `<PlanningTriptych>` immediately above the existing `ScopeHero`/content. `ScopeHero` stays for nav + view actions; the new hero just owns the greeting/date/time/weather + triptych so the planning surfaces feel like one family.
- Optional follow-up (not in this plan): collapse `ScopeHero`'s greeting/clock chip on Week/Month since the new hero now owns it — flagged for review after we see it in context.

## 3. Deepen the zodiac insight under moon phase
In the `MoonPanel`:
- Add the moon's **ruling element archetype line** (e.g. "Water moon — feel first, plan second.") sourced from a small `MOON_SIGN_INSIGHT` map keyed by element in `src/lib/zodiac.ts`.
- Add a second keyword row showing **sign keywords** (e.g. Cancer → "nurture · home · soften") next to the existing phase keywords, separated by a subtle divider.
- Keep the existing sign chip; new copy sits directly under it so the phase + sign read as one thought.

## 4. New Daily Debrief card
Add `src/components/today/DailyDebrief.tsx` rendered on Today (under the triptych, above the 3-column grid) and on Week/Month (under the new triptych, before existing content).

Behavior:
- Pulls today's planned items via existing store: tasks with `dueDate === today` (excluding parked + subtasks) and appointments for today.
- Computes a local **capacity snapshot**: total estimated minutes vs. a soft daily ceiling derived from `src/lib/capacity.ts` and the current cycle phase (luteal/menstrual lower the ceiling, follicular/ovulatory raise it). Renders a calm capacity bar with "gentle / steady / stretched / overflowing" labels.
- Computes **rhythm alignment**: compares each task's category/energy (via `src/lib/task-energy.ts` if available, else heuristics) against `getDailyEnergyGuidance(...)` focus words + `PHASE_META[...].planningHints`. Surfaces 1–3 "with the rhythm" items and 1–3 "consider reshaping" items.
- Calls a new edge function `ai-daily-debrief` (Lovable AI Gateway, model `google/gemini-3-flash-preview`, structured output via `Output.object`) with: date, moon phase + sign + element, cycle phase + day, capacity numbers, and the planned task titles/times/estimates. Returns:
  ```ts
  { summary: string;          // 1–2 sentence warm reflection
    honors: string[];         // up to 3 short bullets
    reshape: string[];        // up to 3 short bullets
    rhythmNote: string }      // one line tying moon + cycle to the day
  ```
- UI: glassmorphism card matching the triptych, with a "Refresh insight" chip, graceful fallback (uses local rhythm alignment only) on `402`/`429`/network errors, and a "Saved – view past debriefs" link stub disabled for now (out of scope).
- AI tone follows existing `_shared/cosmic-tone.ts` (warm, invitational, non-deterministic).

## 5. Edge function
Create `supabase/functions/ai-daily-debrief/index.ts`:
- CORS, JWT verify off by default, validates body with Zod.
- Uses shared `createLovableAiGatewayProvider` pattern (matches sibling functions like `ai-today-guidance`).
- Wraps `_shared/ai-meter.ts` for usage tracking.
- Returns `200` with a fallback payload on credit/rate errors so the UI never breaks (same pattern used in `ai-care-guide`).

## 6. Wiring
- No new routes.
- No schema changes.
- `Today.tsx`: render `<DailyDebrief date={day} />` between the controls slot and the 3-column grid by passing it through `RhythmDashboard` (extend the `slot` area or add a `debrief` slot — pick `debrief` to keep the controls visually grouped with the schedule).
- `Week.tsx` / `Month.tsx`: render `<PlanningHero scope="week|month" />`, `<PlanningTriptych />`, then `<DailyDebrief date={anchor} />` above current content.

## Technical notes
- All new components are presentation-only React + Tailwind, no business logic outside the debrief's helper (`computeCapacitySnapshot`, `computeRhythmAlignment`) which lives in `src/lib/daily-debrief.ts`.
- Reuses: `useStore`, `useCycle`, `getMoonPhase`, `getMoonSign`, `getDailyEnergyGuidance`, `PHASE_META`, `useWeatherSnapshot`.
- Debrief result cached in `localStorage` keyed by `daily-debrief:<isoDate>` so refresh is opt-in and credit usage stays low.
