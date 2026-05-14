## 1. Make time blocks fill the full hour width (Day & Week)

`src/components/calendar/TimeGrid.tsx`
- Time blocks currently render `left-1/2 right-0.5` and appointments render `left-0 right-1/2`, so each only uses half the column — labels get clipped.
- Change both to occupy the **full width** of the column with a small inset (`left-0.5 right-0.5`). When an appointment and a block overlap on the same hour, stack the appointment chip above the block (z-order) instead of side-by-side, since collisions are rare and full-width text is the priority.
- Bump `PX_PER_HOUR` from `56` → `64` so each hour row is taller and labels (title + time range) breathe. Block height calc already uses `PX_PER_HOUR`, so it follows automatically.
- Tighten interior layout: title on line 1 (truncate w/ `truncate`), time range on line 2 in `text-[10px]`, ensures legibility down to 30‑min blocks.

## 2. Drag-anywhere + snap-to-grid + haptic feedback

`src/components/calendar/TimeGrid.tsx`
- Hover affordance: on `onPointerEnter` of a block, fire `haptics.magnet()` once per enter (track via `lastHoverIdRef`) so users feel the block "wake up" when their finger/cursor lands on it.
- Click affordance: on initial `onPointerDown` of a block (before drag threshold), fire `haptics.tap()` so taps are confirmed even when no drag follows.
- Drag-anywhere: the existing `beginDrag` already attaches `pointermove`/`pointerup` to `window`, so cross-day drag works. Reinforce by:
  - Removing the `HOUR_END - dur` ceiling clamp so a block can be dragged into the last hour without snapping back, and allow `nextStart` to snap below `HOUR_START` only as far as `HOUR_START` (current behavior is correct, just verify after PX change).
  - Keep snap step at 15 min via `snap()`; add a stronger `haptics.snap()` only when the snapped slot **changes** (already implemented — keep).
  - On successful drop (`endDrag` with `moved`), upgrade `haptics.tap()` → `haptics.pickup()` so the "landed" feel is distinct from in-flight snaps.
- Drop indicator: keep the dashed primary outline; widen it to match new full-width inset.

## 3. Year page heatmap

`src/pages/Year.tsx` (+ small helper)
- Add a new "Activity heatmap" `SectionCard` above the months grid.
- Compute a per-day count for the current year by combining:
  - `state.tasks.filter(t => t.done && t.completedAt)` bucketed by date
  - `state.appointments` bucketed by `date`
  - Optionally `time_blocks` via a lightweight `supabase.from("time_blocks").select("date").gte/lte` for the year (single query).
- Render a GitHub-style 53×7 grid of squares (weeks × weekdays). Each cell is a `div` with size `w-3 h-3 rounded-sm` and a background using `hsl(var(--primary) / X)` where X scales with count (0/0.08/0.2/0.4/0.7). Month labels along the top, weekday labels (M, W, F) along the left.
- Hover tooltip via `title` attribute: `"{date}: N items"`. Click a cell → navigate to `/today?date=YYYY-MM-DD` (Today already accepts current date; deep-link is a nice-to-have, can be added later).
- Pure presentational — no schema changes.

## 4. AI checklist button per zone

`src/pages/HomeAreas.tsx` → `ZonesPanel`
- Next to each zone header (right of the count badge, before the rename area) add a small `Button` with `Sparkles` icon labeled "AI tasks".
- On click: open a tiny popover with a textarea (optional focus, e.g. "deep clean", "guests coming") and a "Generate" action. Default behavior with no input still works.
- Calls `supabase.functions.invoke("ai-cleaning-checklist-zone", { body: { zone, focus, energy: "medium", minutes: 30 } })`.
- New edge function `supabase/functions/ai-cleaning-checklist-zone/index.ts` (modeled on the existing `ai-cleaning-checklist`):
  - Validates JWT, takes `{ zone, focus?, energy?, minutes? }`.
  - Prompts Gemini for **5–8 short tasks specific to that zone**, returned via tool call (`{ tasks: [{ title, cadence }] }` where `cadence ∈ {daily, weekly, monthly, quarterly}`).
  - Inserts each into `cleaning_tasks` with `zone`, `cadence`, `done=false`, `user_id`.
  - Returns `{ inserted: N }`.
- After success, `ZonesPanel.load()` is re-run and a toast `Added N tasks to {zone}` appears.

## Technical notes

- No DB migrations needed — `cleaning_tasks` already has the columns we use.
- Edge function follows the same pattern as `ai-cleaning-checklist` (tool-calling, 429/402 handling, `LOVABLE_API_KEY`, model `google/gemini-3-flash-preview`).
- Year heatmap reads existing in-memory store; the optional `time_blocks` fetch is a one-shot effect on mount.
- Haptics calls are already a no-op on unsupported devices via `src/lib/haptics.ts`.

## Out of scope

- Conflict layout (overlapping blocks side-by-side) — left full-width as a deliberate trade-off for legibility per the user's request.
- Persistent heatmap drilldown / range picker — current year only.
