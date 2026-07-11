
## Goal

Ship a **/today-v2** prototype that renders the mockup you shared — hero, capacity check-in, moon/debrief/cycle row, timeline + priorities + self-care, tasks today, today's flow, HomeFlow, my people, care reminders, bottom quad, affirmation footer — as a fully draggable/resizable dashboard, running alongside the current /today.

Every section is a widget in `CustomizableGrid` so the user can rearrange, resize, hide, save presets, undo/redo, kanban/timeline modes, and AI-suggest layouts — all reusing the existing engine.

Copy will use **deterministic heuristics** (rhythm/cycle/moon helpers already in the app). Live AI wiring is deferred.

## Route & shell

- New route `/today-v2` inside the authed `AppLayout` block in `src/App.tsx`.
- New page `src/pages/TodayV2.tsx` — mirrors `Today.tsx` scaffolding (task selection provider, day nav, weather ensure, exhale flow, task/appt editors) but drops the view switcher and renders `CustomizableGrid pageKey="today-v2"` with the new hero as its `hero` slot.
- Add a small "New" pill on the current `/today` view switcher linking to `/today-v2` so it's discoverable without changing the default.

## New page key

- Extend `PAGE_KEYS` in `src/lib/dashboard-layouts.ts` with `"today-v2"` and add a `defaultLayout("today-v2")` block that packs the new widgets to match the mockup rows on a 12-col grid.

## New widgets (files under `src/components/today-v2/widgets/`)

Each widget renders its own card chrome (`bare: true`) with sage/cream/gold tokens, 20–24px radius, subtle botanical accent, drag handle on hover.

1. `HeroGreetingWidget` — "Good Morning, {name}", big date, time, weather chip, prev/next day arrows, botanical illustration right.
2. `CapacityCheckInWidget` — 4 capacity chips (Spacious / Steady / Tender / Depleted) + Minimum Viable Day toggle. Persists to a new `today_capacity` row keyed by date (localStorage-backed first pass; DB row optional).
3. `MoonSummaryWidget` — moon phase, % illuminated, sign, element, tag chips. Wraps existing moon helpers.
4. `DailyDebriefWidget` — heuristic paragraph blending capacity + cycle + moon + weather + today's task categories. Two sub-cards: "With the Rhythm" (categories that fit) and "Consider Reshaping" (rule-based suggestions: reschedule flagged, add break before longest appt, shed evening load).
5. `CycleSummaryWidget` — day, phase, guidance verbs, suggested activity chips.
6. `TodaysTimelineWidget` — vertical scrollable timeline of the day's blocks/appointments with time gutter, checkbox, "Add Time Block" button.
7. `TopPrioritiesWidget` — 5-slot priority list with favorite + priority indicator.
8. `SelfCareCheckInWidget` — 5 rows (Body/Mind/Heart/Energy/Mood) each with a 5-dot rating; persists per-day.
9. `TasksTodayWidget` — auto-imports tasks due today, sort by time/priority/category/project, checkbox + inline add.
10. `TodaysFlowWidget` — intentions checklist ("Be present", "Stay flexible" …) + add intention.
11. `HomeFlowWidget` — "Home & Cleaning" card: left filter tabs (Today/Overdue/Weekly/Monthly/Seasonal), cleaning checklist rows (room tag, duration, recurring, priority), right-side circular home progress ring + per-room bars, Smart Suggestion strip, Quick Add panel.
12. `MyPeopleWidget` — cards per care recipient (Isaac / Aerie / Nana) with quick note, med, appt, checklist buttons; pulls from existing care recipients if present, otherwise seeded static.
13. `CareRemindersWidget` — checkbox list of today's caregiving reminders.
14. `WhatsForDinnerV2Widget` — meal image + name + ingredients + View Meal Plan.
15. `HydrationWidget` — glasses/goal + quick add water.
16. `MovementWidget` — steps, active minutes, log button.
17. `GratitudeNotesWidget` — gratitude + note field + Open Journal.
18. `AffirmationFooterWidget` — full-width, centered "Breathe. You're doing better than you think."

Where a good equivalent exists (weather, moon, cycle, task-progress, home-reset) the widget composes it with new chrome instead of duplicating logic.

## Widget registry

- Register all 18 in `src/components/dashboard/WidgetRegistry.tsx` with `bare: true`, proper icons, `pageHref` for deep-links, and `quickAddEvent` where relevant.
- Extend the `WidgetType` union in `dashboard-layouts.ts` with the new ids: `hero-greeting`, `capacity-checkin`, `moon-summary`, `daily-debrief-v2`, `cycle-summary`, `todays-timeline`, `top-priorities`, `self-care-checkin`, `tasks-today-v2`, `todays-flow`, `homeflow`, `my-people-v2`, `care-reminders-v2`, `whats-for-dinner-v2`, `hydration`, `movement`, `gratitude-notes`, `affirmation-footer`.

## Default layout (12-col, matches mockup)

```text
row 1:  hero-greeting (7) | capacity-checkin (5)
row 2:  moon-summary (4)  | daily-debrief-v2 (4)  | cycle-summary (4)
row 3:  todays-timeline (4) | top-priorities (4) | self-care-checkin (4)
row 4:  tasks-today-v2 (8) | todays-flow (4)
row 5:  homeflow (12)
row 6:  my-people-v2 (8)  | care-reminders-v2 (4)
row 7:  whats-for-dinner-v2 (3) | hydration (3) | movement (3) | gratitude-notes (3)
row 8:  affirmation-footer (12)
```

Because the layout runs on `CustomizableGrid`, every card is draggable, resizable, hideable, and reflows on tablet/mobile via the existing responsive breakpoints and the mobile section pills.

## Design tokens

Reuse the sage/cream/gold palette already added for Home Reset (`src/index.css`). Add a small `.today-v2-card` utility if needed for consistent 20–24px radius, botanical corner accent, and slightly warmer surface tone. No hardcoded hex values in components.

## Deferred (explicit)

- Live AI daily debrief / smart suggestion (heuristics only for now).
- New capacity/self-care/intentions tables in the DB (localStorage first pass, migration in a follow-up).
- Sharing/import/export of layouts.

## Files touched

- `src/App.tsx` — add `/today-v2` route.
- `src/lib/dashboard-layouts.ts` — extend page keys, widget types, add default layout.
- `src/components/dashboard/WidgetRegistry.tsx` — register 18 widgets.
- `src/components/today-v2/widgets/*.tsx` — new widget components.
- `src/components/today-v2/HeroGreeting.tsx` — hero (rendered as widget content).
- `src/pages/TodayV2.tsx` — new page.
- `src/pages/Today.tsx` — small "Try new layout" link to `/today-v2`.
- `src/index.css` — optional `.today-v2-card` utility.

## Acceptance

- Visiting `/today-v2` shows the mockup layout end-to-end with real data where wired.
- Every card can be dragged, resized, hidden, and restored via Edit layout.
- Presets, undo/redo, kanban/timeline, AI-suggest, page theme all work (inherited from `CustomizableGrid`).
- Old `/today` is unchanged and remains the default route.
