## Goal

Give the Today page multiple "plan with" layouts, restore the side-by-side morning/afternoon/evening view, slim the Top 3 strip into a single horizontal row, and let the sidebar widgets collapse to free up space.

## 1. Today view switcher

Add a persisted view selector ("How you plan today") to the `RhythmHeader` greeting card, next to the date controls.

Views (renamed for clarity):

- **Rhythm** — current stacked layout (default).
- **Time of day** — restored horizontal morning/afternoon/evening layout (details below).
- **Day plan** — a single condensed planner card: Top 3 → Meals → All today's tasks grouped by day part, no routines/weather inline.
- **Schedule** — appointment-first vertical timeline using the existing `DailySnapshotRow` + `WhatFitsNow` + agenda list (no rhythm sections).

Storage: `careflow:today-view:v1` in localStorage via a small `useTodayView()` hook (mirrors `useCalView` pattern in `CalendarViewToggle.tsx`). The selector is a pill toggle in `RhythmHeader` and the active view is read in `Today.tsx` to swap the middle of the main column.

## 2. Time-of-day view (restored)

New component `TimeOfDayBoard.tsx` rendered when view = "Time of day":

```text
┌─────────── Morning ──────┬── Afternoon ──┬── Evening ──┐
│ slot header + weather    │   …           │   …         │
│ Breakfast meal card      │ Lunch         │ Dinner      │
│ Routine progress (mini)  │   …           │   …         │
└──────────────────────────┴───────────────┴─────────────┘
   ── All tasks planned for the day (grouped by day part) ──
```

Implementation: reuse pieces from `RhythmSection` (slot header, `SlotWeather`, `MealSlotCard`, routine block) but render the three slots inside a single `md:grid-cols-3` card with no per-slot collapsibles. Underneath the three columns, render a single tasks panel that lists all tasks with `dueDate === today`, grouped by `dayPart` (Morning / Afternoon / Evening / Anytime), reusing the task row markup from `RhythmSection`. Drag-to-reschedule and inline add are preserved per group.

On mobile the three columns stack; the tasks panel stays full-width.

## 3. Horizontal Top 3 strip

Update `TopThreeStrip.tsx` so the three pinned tasks render as a single horizontal row (chips) instead of 3 equal columns:

- Replace `grid sm:grid-cols-3` with `flex flex-wrap items-center gap-2` (or `overflow-x-auto` on narrow screens).
- Each task becomes a pill: number badge · checkbox · title (truncate) · star.
- Header ("Top 3 today · 1/3 done") stays inline on the left, "Pin tasks" CTA on the right when empty.

This applies in every view so the strip reads as one calm row above the day.

## 4. Collapsible sidebar widgets

Two layers of collapse, both persisted:

1. **Per-widget collapse** — wrap each widget in `Today.tsx` with a `<CollapsibleWidget id="…" title="…">` shell that shows a small chevron in the top-right corner. State stored in `careflow:today-sidebar-collapsed:v1` (Set of widget ids). Collapsing keeps the title bar visible but hides the body.
2. **Collapse the whole rail** — add a "Hide widgets" toggle next to the existing Reorder button. When hidden, the main column expands to full width (drop the `md:grid-cols-[…_280px]` track). State stored in `careflow:today-sidebar-hidden:v1`.

The existing reorder mode is unchanged; collapse chevrons are visible in normal mode too.

## Files touched

- `src/pages/Today.tsx` — view switcher wiring, conditional main-column render, sidebar hide toggle, grid track switch.
- `src/components/today/rhythm/RhythmHeader.tsx` — add view pill selector.
- `src/components/today/TopThreeStrip.tsx` — horizontal pill row.
- New `src/components/today/TimeOfDayBoard.tsx` — restored layout.
- New `src/components/today/DayPlanBoard.tsx` — condensed planner.
- New `src/components/today/ScheduleBoard.tsx` — schedule view (composes existing snapshot/agenda).
- New `src/components/today/CollapsibleWidget.tsx` — per-widget shell.
- New `src/lib/today-view.ts` — `useTodayView()` + storage keys.
- Touch `src/lib/today-sidebar-order.ts` if a shared collapsed-state helper fits there; otherwise keep it in `today-view.ts`.

No backend, schema, or business-logic changes — all presentation + local state.

## Out of scope

- Editing what widgets exist (the registry stays the same).
- Changing the underlying Rhythm sections used by the default view.
- Touching the Carey icon/halo work.
