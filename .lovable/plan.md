# One planner, one calendar

Today the app has two overlapping surfaces: `/planner` (day timeline, task tray, focus timer, day review) and `/calendar` (day/week/month/year, Google Calendar events, widget rail, agenda), plus `/week` and `/month` pages with their own logic. Same data, four different renderings.

The plan: make the Planner the single planning surface with Day / Week / Month / Year ranges, fold the calendar's event feed and views into it, and give Week and Month two toggleable modes each.

## What you'll see

**One page, one header**
- `/planner` gains a range switcher: Day · Week · Month · Year, plus a view pill row that changes per range.
- Date navigation, scope pills, tray toggle, templates, and settings all live in the existing shared `PlanHeader`.
- `/calendar`, `/week`, `/month` keep working as URLs but land on the planner at the matching range and date, so bookmarks and links don't break.

**Everything on one timeline**
- Google Calendar events, appointments, scheduled tasks, meals, check-ins, birthdays/holidays and cosmic events all flow from one shared feed instead of each page building its own.
- One legend/filter control (the calendar's kind filters and colors) applies to every range.
- Drag, resize, quick-edit and undo/redo behave the same in every range.

**Week: Grid ↔ Board**
- *Grid* — 7-column hour timeline with events and scheduled tasks, drag between days, resize to change duration, all-day row on top.
- *Board* — 7 day columns of tasks and meals with a capacity bar per day, an unscheduled rail you drag from, and a week review at the bottom (planned vs completed, meals covered, groceries, habits).
- Both share the week's header, filters and rhythm/atmosphere strip.

**Month: Calendar ↔ Overview**
- *Calendar* — real event chips per day instead of count dots, up to ~3 with "+N more", drag an item to another day, subtle capacity shading, day click opens the existing day brief.
- *Overview* — goals and milestones for the month, recurring commitments, appointments-at-a-glance, month capacity trend, and a month review card.

**Shared improvements across ranges**
- Consistent quick-add: click/drag any empty slot or day to create, with destination chips (task / appointment / meal).
- Keyboard: `d w m y` for range, `[` `]` to page, `t` for today, `⌘K` command bar — extended to the new ranges.
- Tray works everywhere: drag from tray or unscheduled rail into any range.

## Technical notes

- New `src/lib/planner/feed.ts`: one hook returning normalized items (`kind`, `id`, `start`, `end`, `allDay`, `color`, `sourceRef`) for a date range, composed from the store (tasks, appointments, meals, birthdays, holidays), `useGCalEvents`, check-ins and cosmic feed. Week/Month/Day all read this; per-page assembly in `CalendarPage.tsx`, `Week.tsx`, `Month.tsx` is removed.
- `Planner.tsx` becomes range-aware: `usePlannerRange()` persisted in `planner-prefs`, with per-range view pills persisted in `usePlannerPanels`-style prefs. `/planner/:date` gains an optional `?range=` param.
- Week Grid extends `PlannerMultiDayView` + `PlannerTimeline` (already 7-day capable) with an all-day row and cross-day drag via existing `planner-touch-drag` / `long-press-drag`; keeps `planner-metrics` slot math so alignment stays consistent.
- Week Board reuses `WeekPlanningDashboard`, `UnscheduledTasksRail` and `PlannerCapacityBar` per column.
- Month Calendar replaces the dot logic in `PlannerMonthView.tsx` with chip rendering off the shared feed; Overview reuses `MonthPlanningDashboard` and `MonthOverview.tsx` content.
- `Week.tsx`, `Month.tsx`, `MonthOverview.tsx`, `CalendarPage.tsx` become thin redirects to the planner; their unique widgets (`WidgetRail`, `AgendaRail`, `SummaryStrip`, rhythm strips) move into the planner's right-hand context panel and are kept.
- Kind filters/colors keep using `calendar-prefs` and `calendar-colors` so existing user settings carry over.
- Mutations continue to go through the store + `planner-history`, so undo/redo covers drags in every range.

## Rollout

1. Shared feed + range-aware Planner shell (Day unchanged visually).
2. Week Grid + Board.
3. Month Calendar + Overview, Year range.
4. Redirect legacy routes, move calendar widgets into the context panel, delete dead code.
