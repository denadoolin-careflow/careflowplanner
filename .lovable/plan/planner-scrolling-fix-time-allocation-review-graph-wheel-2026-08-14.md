# Planner scrolling fix + Time-allocation review (graph & wheel)

## Part 1 — Make every planner page scroll and breathe

What's happening now: on desktop the planner is locked into a measured
full-height shell (`overflow-hidden` + a JS-measured `height`), and on mobile the
grid views are given `viewportHeight - header - 96px`. When the measurement is off
(or the app chrome/header is taller than assumed) content is clipped and the wheel
lands on an inner box that can't move, so the page feels stuck. Long views
(Overview, Board, Year, Day review) sit inside that same locked box.

Changes:

- Drop the JS height measurement (`useFillHeight`) and the fixed shell entirely.
  The planner becomes normal page content again — the app's main region is the
  single scroll owner, so the wheel/touch always works.
- Grid-style views (Day grid, 3-day, Week grid, Month calendar) keep their own
  internal hour scroll but get a **bounded, responsive height** (a clamp such as
  `min(70vh, ...)` with a sensible floor) instead of "fill the viewport". They stay
  usable and the page can still scroll past them.
- Side columns (task panel, focus panel, context panel) become sticky columns with
  their own max-height and scroll, so they no longer stretch the row or get cut off.
- Day review, Week overview, Month overview and Year always render in the page
  flow below the view at natural height.
- Mobile: header stays sticky but slimmer padding; grid gets the bounded height and
  `overscroll-contain` so a drag inside the grid doesn't dead-end; extra bottom
  padding so the last card clears the nav bar.

Result: one predictable scrollbar, nothing clipped, no view "stuck".

## Part 2 — Time allocation review (end of day / week / month)

A new **Time review** panel that answers "where did my planned time actually go?"

- **Donut wheel** — planned minutes split by category, center shows total planned
  hours and % of the day/week/month accounted for. Hover/tap a slice to see the
  category, hours and share.
- **Bar graph** — hours per category, with a planned vs completed pair so you can
  see follow-through, not just intent.
- **Balance line** — a short, plain-language read ("Care took 42% of your planned
  week; Rest got 4%").
- **Category source toggle** — group by **Type** (task, appointment, care, meal,
  calendar event) or by **Area/Project** (your own areas). Uses existing calendar
  kind colors so the wheel matches the rest of the planner.
- **Range follows the planner**: on Day view it reviews the day, Week view the
  week, Month view the month. Untimed items count their estimated duration;
  all-day items are excluded from the time math and shown as a small side count.

Where it appears:

- Day view: inside the existing collapsible **Day review** card, above the
  reflection prompt.
- Week Overview and Month Overview: as a card at the top of the overview.
- Year view: a compact month-by-month version of the bar graph.

## Technical notes

- `src/pages/Planner.tsx`: remove `useFillHeight` + shell `style={{height}}` and the
  `scrollModeFor` fixed/flowing split; replace with a single `GRID_VIEW_HEIGHT`
  clamp class applied to grid wrappers, and `sticky top-*` + `max-h` on the panel
  columns. No changes to view switching, shortcuts, or drag handlers.
- `src/components/today/TodayPlanView.tsx`: same bounded-height treatment for its
  timeline block.
- New `src/lib/planner/time-allocation.ts`: pure aggregation over
  `usePlannerFeed(from, days)` returning `{ category, plannedMin, doneMin, color }[]`
  plus totals; duration = end−start, else `estMinutes`, else a 30-min default.
- New `src/components/planner/PlannerTimeReview.tsx`: recharts `PieChart` (donut) +
  `BarChart`, category-source toggle, empty state. recharts is already a dependency.
- Mounted from `PlannerDayReview.tsx`, `PlannerMonthOverview.tsx`,
  `PlannerWeekBoard.tsx` and `PlannerYearView.tsx`.
- No schema, store, or mutation changes — read-only over the existing feed.
