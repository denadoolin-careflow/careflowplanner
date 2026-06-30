# Planning header + burnout-aware debrief

Goal: every planning page (Today, Week, Month) shows the same calming header bundle, and the Daily Debrief adapts to a quick burnout check-in plus a tone preference.

## 1. Shared `PlanningHeader` bundle
Wrap the current scattered pieces into one component used by Today, Week, and Month so the experience is identical:

- `PlanningHero` (greeting + date + clock + live weather temperature)
- `Triptych` (Moon · Daily Energy · Cycle)
- New `SlotWeatherStrip` — morning / afternoon / evening forecast cards (reuse existing `SlotWeather`) shown directly under the triptych
- `BurnoutCheckIn` card (see §2)
- `DailyDebrief` (see §3)
- `QuickAddBar` (currently Today-only) + Today "Plan with" toggle slot

On Week the bundle uses the focused day (`selectedDate`); on Month the focused day is `cursor` or the last clicked day in the day sheet. Today keeps its bigger hero, but we extract `PlanningHero` so it's the same component with a `variant="hero"|"compact"` prop. Removes the current duplication where Week/Month each manually compose `PlanningHero` + `Triptych` + `DailyDebrief`.

## 2. Burnout check-in card (new)
New file `src/components/today/BurnoutCheckIn.tsx` + `src/lib/burnout-checkin.ts` (localStorage-backed, keyed per ISO date).

Card sits above the debrief and asks: "How is your capacity for the rest of the day?"

Four soft chip options:
- **Spacious** — boost ceiling x1.15
- **Steady** — keep ceiling
- **Tender** — reduce ceiling x0.7, suggest reshape
- **Depleted** — minimum-viable-day mode

Extra row:
- **Minimum Viable Day** toggle — debrief reframes around the user's single top task; everything else surfaces as "could wait"
- **Reset after a hard day** button — clears today's check-in, archives a snapshot to `burnout_history` (local), opens a 3-tap soft reset (breathe / forgive / pick one thing). The "one thing" picker is fed by remaining tasks and writes it back as the MVD task.

State is exposed via `useBurnoutCheckIn(date)` hook so capacity, debrief, and triptych can react.

## 3. Debrief upgrades
Update `src/lib/daily-debrief.ts` + `DailyDebrief.tsx`:

- Pass the burnout multiplier into `computeCapacitySnapshot` so the capacity bar/label recomputes.
- When **Minimum Viable Day** is on, the debrief shows only the chosen MVD task in "With the rhythm" and routes everything else to "Could wait" (renamed reshape column).
- **Tone selector** — small popover on the debrief header: *Gentle · Encouraging · Direct · Cosmic · Playful*. Persisted in `localStorage` (`debrief-tone`). Sent to `ai-daily-debrief` edge function as `tone`. Local fallback templates have one phrasing per tone.
- **Tasks are clickable** — `honors` / `reshape` items become buttons that open the existing `TaskEditor` via the page-level `onTaskClick` setter (debrief gains an optional `onTaskClick` prop, wired from each page). The debrief payload now carries `{ id, title, reason }` instead of pre-joined strings; the edge function returns the same shape (fallback already has the ids).
- Capacity bar gets a thin overlay marker showing the burnout-adjusted ceiling vs base ceiling.

Edge function `supabase/functions/ai-daily-debrief/index.ts` learns two new context fields (`tone`, `burnout`, `mvdTaskId`) and returns task ids when possible. Falls back gracefully when AI is offline.

## 4. Interactive weather strip on the triptych
New `SlotWeatherStrip` placed directly under `Triptych`:

- Three cards (Morning / Afternoon / Evening) rendered with the existing `SlotWeather` component so we reuse hourly samples and rain percent.
- Each card is clickable → opens a small popover with the full hourly grid for that slot and a "Plan around weather" link that scrolls to that slot section on Today (`#slot-morning|afternoon|evening`).
- Persisted across pages because it lives inside `PlanningHeader` and reads from the global `useWeatherSnapshot()` store (already shared).

## 5. Page wiring
- `src/pages/Today.tsx` — replace the current ad-hoc Hero/Triptych/QuickAdd/debrief composition with `<PlanningHeader date={day} variant="hero" onTaskClick={setEditTaskId} />`. Remove duplicated controls.
- `src/pages/Week.tsx` — replace the manual `PlanningHero + Triptych + DailyDebrief` lines with `<PlanningHeader date={selectedDate} variant="compact" onTaskClick={setEditTaskId} />`.
- `src/pages/Month.tsx` — same swap, using the clicked day (fallback to today) and wiring `onTaskClick`.

## Technical notes

```
src/components/today/
  PlanningHeader.tsx          (new — orchestrator)
  BurnoutCheckIn.tsx          (new)
  SlotWeatherStrip.tsx        (new — wraps 3x SlotWeather)
  DailyDebrief.tsx            (extend: tone, onTaskClick, MVD)
  RhythmDashboard.tsx         (export Hero, reuse inside PlanningHeader)

src/lib/
  burnout-checkin.ts          (new — store + hook + multipliers)
  daily-debrief.ts            (extend: burnout multiplier, tone copy, task-id payload)
  debrief-tone.ts             (new — tone enum + persisted hook + tone-aware fallback copy)

supabase/functions/ai-daily-debrief/index.ts  (accept tone + burnout, return ids)
```

No DB migrations — burnout check-in and tone live in `localStorage` (cheap, per-device, matches existing debrief cache).

Out of scope: redesigning the Today schedule columns, changing existing cycle/moon logic, or touching unrelated pages.
