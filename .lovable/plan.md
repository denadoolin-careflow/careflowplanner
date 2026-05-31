Redesign Routines page around the CareFlow garden metaphor — compact cards, growth states, today's garden summary, and grouping by attention.

## New visual model — Garden states

Add a `getRoutineState(routine)` helper that returns one of:
- `seedling` 🌱 — `doneCount === 0` ("Needs Care") · accent `--sage-soft`
- `growing` 🌿 — `0 < doneCount < total` ("Growing") · accent `--sage`
- `blooming` 🌸 — `doneCount === total && total > 0` ("Blooming") · accent `--plum`
- `resting` 🍂 — `total === 0` or `meta.lastMissedAt` recent ("Resting / Needs Care") · accent `--cream-warm`

Each state ships with: emoji, label, accent color token, contextual CTA label (`Start` / `Continue` / `Blooming 🌸` / `Restart`).

## New page structure (`src/pages/Routines.tsx`)

1. **Header** (kept slim): `🌿 Routines` title + Add person button.
2. **Today's Garden summary card** (new component `TodaysGarden`):
   - 3 stat tiles: `🌸 Blooming`, `🌿 Growing`, `🌱 Need Care` (only counts daily routines or those scheduled today).
   - Soft sage→cream gradient background using existing atmosphere tokens.
   - Tapping a tile filters the list below to that state.
3. **NowNextBanner + RitualStrip** kept.
4. **Filter row**: simplified — keep Group/Person/Tag selects, add **View toggle** (List ↔ Garden grid) and a **State filter chip row** synced with the summary tiles.
5. **Smart-sorted groups** in this order:
   - `🌱 Needs Care` (seedling)
   - `🌿 Growing`
   - `Upcoming` (scheduled later today, currently seedling but with `time_of_day` in the future)
   - `🌸 Blooming` — collapsed by default
   - `🍂 Resting` — collapsed by default
   The existing `groupBy` selector becomes secondary ("Group within state by person/timeframe/cadence/tag") and only shown in List view.

## Compact RoutineCard

New component `CompactRoutineCard` replaces inline `RoutineCard` rendering in the main list (existing `RoutineCard` stays exported for `PersonRoutinesPanel` / Caregiving but is also slimmed). Layout (~40–50% shorter):

```
┌─────────────────────────────────────────┐
│ 🌿  Aerie · Morning             7:30 AM │  ← row 1: state pill + identity + time
│ 🪥 Next: Brush teeth                    │  ← row 2: next step preview
│ ▓▓▓▓▓░░░░ 1 of 2                [Continue] │ ← row 3: progress bar + CTA
└─────────────────────────────────────────┘
```

- Card height target: ~96–108px (vs current ~260px+).
- Tapping the card body opens Focus mode (existing `RoutineFocusMode`).
- CTA button is contextual per state.
- Long-press / `…` button opens a popover with the existing controls (time picker, cadence, AI ideas, breakdown, pomodoro, tags, link recipient, delete). No inline toolbars on the card itself.
- Steps list, tag editor, recipient/prep selectors move into the popover/edit sheet.
- Garden View: same card but in a 2-col grid (`grid-cols-2`) with vertical stack — emoji on top, name + next step, mini progress dots, CTA.

## Copy / language

Centralize garden language in a `GARDEN_STATE` map: labels, accents, CTAs, accessible aria-labels. Replace any "Completed / In Progress / Missed / Tend" strings on the page with this map.

## Files to add / edit

- **edit** `src/pages/Routines.tsx`:
  - Rewrite list rendering to use state-grouped sections + view toggle.
  - Add `TodaysGarden` summary inline (or extracted).
  - Slim existing `RoutineCard` to the compact layout; move advanced controls into a `RoutineActionsPopover`.
- **add** `src/lib/routine-garden.ts`: `GardenState` enum, `getRoutineState(routine)`, `GARDEN_STATE` map (label, emoji, accent CSS var, cta).
- **add** `src/components/routines/TodaysGarden.tsx`: summary card with 3 tappable tiles.
- **add** `src/components/routines/CompactRoutineCard.tsx`: new compact card.
- **add** `src/components/routines/RoutineActionsPopover.tsx`: houses time/cadence/AI/breakdown/pomodoro/recipient/prep/tags/delete.
- **edit** `src/index.css`: add `--garden-seedling`, `--garden-growing`, `--garden-blooming`, `--garden-resting` HSL tokens (mapped to existing sage/plum/cream palette).
- **keep** `RoutineFocusMode`, `NowNextBanner`, `RitualStrip`, `RoutineItemRow`, `PomodoroDialog`, `AIBreakdownDialog`, `PersonRoutinesPanel` API unchanged.

## Out of scope

- Data model changes (no new fields on `routines` table).
- Changes to `Caregiving` page beyond the slimmer card it inherits.
- Backend / sync logic.

## Verification

- At 390px viewport: at least **4 routine cards** visible above the fold including the Today's Garden summary.
- Each state group renders with correct emoji, accent, and CTA.
- View toggle swaps between list and 2-col garden grid without losing scroll.
- All existing actions (focus, AI ideas, breakdown, pomodoro, tag edit, time/cadence change, recipient link, delete) reachable via the actions popover.
- Reduced-motion respected; no horizontal overflow.