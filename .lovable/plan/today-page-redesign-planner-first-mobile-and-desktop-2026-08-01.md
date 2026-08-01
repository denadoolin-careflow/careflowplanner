# Today page redesign — planner-first, mobile and desktop

## Where things stand (verified)

- `src/pages/Today.tsx` (369 lines) holds six competing layouts behind a "Plan with" switcher: `dashboard`, `rhythm`, `timeofday`, `plan`, `schedule`, `custom` (`src/lib/today-view.ts`). There is no single Today experience.
- The page also stacks a `ScopeHero`, a preferences popover (Carey nudges, quick add, pinned route, pinned view, templates), three collapsible sections, a quick-add bar, and a bottom exhale card — before any actual plan is visible.
- `src/components/today/dashboard/` already has a clean card system (`DashCard`, `GreetingBlock`, `ScopeSegmented`, `CapacityCard`, `CareLoopRow`, `AnchorTodayCard`, `PlanColumn`, `CareColumn`, `GrowColumn`, `RoutinesHabitsRow`).
- `src/components/planner/` has the strongest scheduling surface in the app: `PlannerTimeline`, `PlannerMealLane`, `PlannerMobileInboxRail`, `PlannerTaskPanel`, `PlannerPeriodTabs`, `PlannerAtmosphereStrip`, `PlannerCommandBar`, plus conflict, duration and auto-schedule helpers. Today duplicates weaker versions of this instead of using it.

## The core recommendation

Make Today **one page with one layout**, and make the **planner timeline the center of it**. Views become density options, not six different pages.

```text
DESKTOP (>=1024px)                              MOBILE
+----------------+--------------------------+   +------------------------+
| Focus rail     | PLANNER TIMELINE         |   | Compact header         |
|  greeting      |  day-part bands          |   | Now / next up          |
|  capacity      |  meals lane              |   | [Plan][Care][Grow]     |
|  anchor task   |  drag from inbox         |   |------------------------|
|  top 3         |  conflicts / durations   |   | PLANNER TIMELINE       |
|  atmosphere    |                          |   |  (default tab = Plan)  |
+----------------+--------------------------+   |------------------------|
| Care · Grow · Routines (collapsed strip)  |   | Inbox rail (drag up)   |
+-------------------------------------------+   +------------------------+
```

## Recommendations, in priority order

**1. Collapse six views into two.** Keep `Plan` (timeline, default) and `Board` (card dashboard). Migrate stored values: `schedule` / `timeofday` / `plan` / `rhythm` -> `plan`; `dashboard` / `custom` -> `board`. Templates and the custom grid move behind the Board view's own menu rather than being top-level page modes.

**2. Put the real planner timeline on Today.** Replace `ScheduleBoard`, `TimeOfDayBoard` and `DayPlanBoard` with the `PlannerTimeline` + `PlannerMealLane` + day-part bands already used on `/planner`, scoped to the selected day. One scheduling engine, one set of conflict and duration behaviors, one drag model.

**3. One header, not three.** A single sticky bar: date with prev/today/next, Today/Week/Month scope, Plan/Board toggle, and one overflow menu holding everything currently in the preferences popover. Removes roughly 120 lines of inline popover markup from the page.

**4. Add a "Now" band.** A live current-time marker plus a small "now / next up" card at the top of the timeline — the most useful mid-day glance for a caregiver.

**5. Mobile: bottom-anchored planning.** Sheet-based `PlannerMobileInboxRail` pinned above the timeline for drag-to-schedule; day-part tabs (`PlannerPeriodTabs`) instead of a long scroll; Plan / Care / Grow segmented tabs so the page is one screen deep. Keep swipe-left to Week, add swipe-right to the previous day.

**6. Desktop: left focus rail + wide timeline.** `lg:grid-cols-[320px_1fr]`. Rail holds greeting, capacity, anchor, Top 3, atmosphere. Right side is the timeline at full width. Care / Grow / Routines become a collapsible strip below rather than equal-weight columns.

**7. Capacity drives the timeline.** Reuse `capacity-context`: on `tender` / `depleted` the timeline dims optional blocks and offers "lighten today"; on `spacious` it surfaces stretch suggestions. Display filtering only — no task mutation.

**8. Progressive disclosure.** Everything that is not the plan (debrief, exhale, routines, habits, grow) collapses by default, with state remembered.

**9. Accessibility and motion.** Keyboard move/resize on timeline blocks (already in planner), visible focus rings, aria-labels on every day-part region, `prefers-reduced-motion` respected, 44px minimum touch targets.

## Implementation phases

- **Phase 1 — Shell.** New `TodayShell` (sticky header, rail/main grid, mobile tabs). `today-view.ts` reduced to `plan | board` with legacy migration.
- **Phase 2 — Planner core.** Extract a reusable `<DayTimeline date … />` from the `/planner` internals and mount it as Today's Plan view; `/planner` keeps using the same component.
- **Phase 3 — Rail and secondary content.** Move existing dashboard cards into the rail and the collapsible strip; retire `ScheduleBoard`, `TimeOfDayBoard`, `DayPlanBoard`.
- **Phase 4 — Mobile pass.** Inbox sheet, period tabs, tab bar, swipe, touch-target audit.
- **Phase 5 — Polish and cleanup.** Capacity-adaptive timeline, now marker, accessibility pass, delete dead view code.

## Technical notes

- No schema changes. All frontend composition over existing stores (`useStore`, `burnout-checkin`, `capacity-sync`, `weather-store`, planner libs).
- `TodayView` shrinks, so `TODAY_VIEW_LABELS`, the pinned-default-view control, and stored localStorage values need the migration mapping above.
- Keep the `--care-*` tokens and `DashCard`; no new colors or fonts.
- Extracting the timeline from `/planner` is the only risky step — do it as a pure move so `/planner` renders identically.

## Out of scope

Week, Month, Calendar, Notes and Meals pages; bottom nav; any data model change.