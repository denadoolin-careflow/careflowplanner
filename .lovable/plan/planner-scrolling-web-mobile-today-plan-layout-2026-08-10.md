# Planner scrolling (web) + mobile Today plan layout

## 1. Fix scrolling on the Planner page (desktop/web)

Today the page scrolls as a normal document, but the main view is wrapped in fixed boxes sized with `calc(100vh - 260px)` (grid, 3-day, week, month). That creates two competing scroll areas: the page scrolls, and the timeline scrolls inside it, so the grid can be half off-screen, the sidebars scroll away, and the wheel often "sticks" on the wrong region.

Changes:
- Turn the desktop planner into a proper app shell: one full-height column (`h-[100dvh]` minus the app chrome) with a non-scrolling header area (rhythm header, view pills, filters, segments) and a single scrollable body below it.
- Remove the `calc(100vh - Npx)` magic numbers. The timeline/week/month areas fill the remaining space via flex (`min-h-0 flex-1`), so only one element owns the scroll.
- Left task panel, focus panel, and context panel each become independently scrollable columns (`overflow-y-auto`, sticky to the shell height) so the grid no longer pushes them off screen.
- Views that are naturally long (Schedule list, Time-of-day lists, Week board, Month overview, Day review) scroll inside the same body region instead of extending the page.
- Keep the timeline's own hour scroll and its auto-scroll-to-now behavior; only the outer container changes.
- Preserve the sticky mobile header; mobile keeps document scrolling.

## 2. Mobile Today page: Planned + Time blocking sections

On mobile, the Today page's Plan tab currently shows one period tab strip plus a single tall view. Restructure it into two clearly labeled, stacked sections:

1. **Planned** — a compact, scannable list of what is committed today (scheduled tasks, appointments, meals, anchors) with counts, wrapped titles, checkboxes with the existing completion animation, and tap-to-quick-edit. Collapsible, expanded by default.
2. **Time blocking** — the hourly timeline grid with the unscheduled/tray rail directly above it so tasks can be dragged into slots. Fixed comfortable height with internal scrolling, collapsible.

Other mobile details:
- Section headers get an eyebrow + count and a chevron; collapsed state persists per user.
- The existing period tabs (Schedule / Time of day) move into the Planned section as a small selector, so the top of the page is not a wall of controls.
- Tray and Tasks buttons stay in a single compact action row.

## Technical notes

- `src/pages/Planner.tsx`: replace fixed-height wrappers with a flex shell (`flex h-[100dvh] min-h-0 flex-col` on desktop), give the body `min-h-0 flex-1 overflow-hidden`, and make each panel column `overflow-y-auto`.
- `src/components/today/TodayPlanView.tsx`: split into `Planned` and `Time blocking` sections on mobile using the existing `CollapsibleSection` pattern; desktop layout unchanged.
- Reuse `PlannerScheduleList`, `PlannerPeriodList`, `PlannerTimeline`, and the existing mobile inbox rail — no new data logic.
- No design-token or business-logic changes; presentation only.
