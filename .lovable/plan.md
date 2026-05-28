## Goal

Show the user's current menstrual phase alongside today's energy on Today, and make the whole card a tap-through into a new combined Rhythm Overview that surfaces both lunar and menstrual phases and deep-links into the existing Lunar Living and Cyclical Living tabs.

## Behavior

### 1. Today's energy card (enhanced)
In `EnergyCheckIn` (rendered on `/today`):
- After the three energy buttons, append two compact "phase chips":
  - **Moon chip** — `{glyph} {phase label}` (e.g. 🌒 Waxing crescent), uses `getMoonPhase(new Date())`.
  - **Cycle chip** — `{glyph} {phase label} · day {cycleDay}` from `getPhaseInfo(today, periods, settings)`. Only shown when `settings.enabled` and history exists; otherwise a muted "Log cycle" chip.
- The whole row becomes wrapped in a clickable container that navigates to `/rhythm`. Energy buttons keep their own click handlers (stopPropagation) so picking energy doesn't navigate. A small chevron + "Open rhythm" affordance appears on hover/right side.

### 2. New page: Rhythm Overview (`/rhythm`)
A single, calm page with two side-by-side cards (stack on mobile):
- **Moon today** card — large glyph, phase name, illumination %, next major phase + date, one-line invitation from existing lunar copy. CTA button **"Open Lunar Living"** → `/health?tab=lunar`.
- **Cycle today** card — large glyph, phase name, cycle day / cycle length, days until next period, archetype + affirmation + invitation from `PHASE_META`. CTA button **"Open Cyclical Living"** → `/health?tab=cycle`. If cycle disabled or no periods logged: show a gentle empty state with a CTA to enable in Settings or log a period.
- Below: a "How they align today" strip showing `getMoonAlignment(...)` label (White/Red/Pink/Purple Moon) when both data sets exist.

Page header: "Your rhythm today · {today's date}" with a back button to `/today`.

### 3. Routing
Add `/rhythm` route in `App.tsx` (inside `RequireAuth`/`AppLayout` block, same pattern as `/today`).

## Technical Notes

**New files**
- `src/pages/RhythmOverview.tsx` — composes data from `useCycle`, `getPhaseInfo`, `getMoonPhase` (from `src/lib/moon.ts`), `getMoonAlignment`, `PHASE_META`. Uses `SectionCard` + `Button` + existing `MoonGlyph` if useful. Two `<Link>` CTAs to `/health?tab=lunar` and `/health?tab=cycle`.

**Edits**
- `src/components/cards/EnergyCheckIn.tsx` — import `useCycle`, `getPhaseInfo`, `getMoonPhase`, `MOON_PHASE_META` (or inline glyph), `useNavigate`. Wrap the existing row in a clickable container; render two chips after the buttons. Keep energy buttons working via `stopPropagation`. Add a small "Open rhythm →" affordance.
- `src/App.tsx` — add `<Route path="/rhythm" element={<RhythmOverview />} />` and the import.

**Reuse**
- `getPhaseInfo`, `PHASE_META`, `getMoonAlignment`, `MOON_ALIGNMENT_LABEL` from `src/lib/cycle.ts`.
- Moon helpers from `src/lib/moon.ts` (phase + label + illumination + next phase date).
- `useCycle` from `src/lib/cycle-store`.

**Edge cases**
- Cycle tracking disabled → chip renders as "Cycle off" muted; Rhythm page shows enable hint.
- No period history → chip shows "Log period"; Rhythm page shows log-period CTA.
- No moon provider data → fall back to `getMoonPhase()` astronomical calc (already used elsewhere).

## Out of scope
- No changes to the existing Lunar Living or Cyclical Living tab contents.
- No new DB/schema changes.
- No animation/visual redesign of Today beyond appending the two chips and making the card clickable.
