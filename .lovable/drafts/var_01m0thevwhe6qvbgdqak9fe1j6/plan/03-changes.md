## The changes

### 1. Calm the top of the page
Fold the quick-add bar, capacity hints, overdue count and habit nudge into a single **Arrive band**: greeting + weather/moon glance on the left, capacity chip + one-line intention on the right. Overdue and nudges become small inline chips inside that band rather than stacked cards. One capture button, not three.

### 2. Timeline becomes the hero, meals included
- Mount the planner's meal lane on Today so breakfast / lunch / dinner sit in the morning, afternoon and evening bands with a tap to plan or mark eaten.
- Add a live **now marker** with a soft accent line, and auto-scroll to it on load.
- Keep every existing behaviour: drag from inbox, resize duration, conflicts, day-part colors, zoom.

### 3. Per-person care cards
Replace the People list with one small card per family member showing, for the selected day: their tasks, appointments, meds/health habits, and last care note — each tappable to complete or open. A "+" adds a task already assigned to that person. Falls back to the current list when no one is added yet.

### 4. Self-care and journal come up the page
- A **Self-care** card in the circle zone: one suggested restorative habit, a breathing/exhale button, and the water/rest habits already tracked.
- A **Journal** card with today's prompt (moon/cycle aware, already built) and an inline one-tap "write a line" that saves straight into today's entry.

### 5. Every card becomes interactive
Checkboxes with the existing haptic animation on chores, habits, meds and person tasks; inline rename on task lines (already in `PlanColumn` — extend to Care and Routines); inline add inside each card; long-press/right-click nothing new, just tap targets at 44px.

### 6. Mobile: one scroller
Day / Care / Grow tabs stay, but the Day tab drops the two nested collapsible sections and their inner scrollers — Arrive band, planned strip, inbox rail, then the timeline in the page scroll. Swipe left/right moves a day.

### 7. Quiet motion and colour
Soft fade/rise on card mount, `prefers-reduced-motion` respected, accent used once per zone (the now marker, the anchor, the current day part). No new palette — existing `--care-*` tokens and `DashCard` only.

## Technical notes

- Frontend only. No schema change, no new tables, no data-model change.
- `TodayPlanView` keeps using `PlannerTimeline`; the meal lane is the existing `PlannerMealLane` passed the same date, so `/planner` and Today stay in sync automatically.
- New components: `ArriveBand`, `PersonCareCard`, `SelfCareCard`, `JournalCard`, plus a `NowMarker` if the timeline doesn't already expose one.
- Retired: the current People card body inside `CareColumn`, the standalone bottom exhale strip (moves into Self-care), the mobile nested `CollapsibleSection` wrappers in `TodayPlanView`.
- Collapse state for the circle zone persists per section, as today.

## Out of scope

Week / Month / Calendar pages, the planner page itself, bottom nav, notifications, and anything backend.
