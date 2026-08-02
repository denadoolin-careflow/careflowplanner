# Planner + Inbox: recommended UI/UX adjustments

Based on a live pass of `/planner` and `/inbox` at mobile (707px) and desktop (1440px).

## What's wrong today

**Planner (mobile)** — three stacked control rows (view pills, date nav + actions, period pills + Tray) plus the page hero consume roughly the top half of the screen before a single grid hour is visible. The grid also opens parked near 5 AM at 7 PM local time, a "Weather unavailable" chip advertises a failure, and the FAB sits on top of the grid's drop area.

**Planner (desktop)** — the floating Pomodoro timer overlaps the weather/moon chips in the top-right, the left Tasks panel shows four empty groups with "Nothing here." repeated, and the right context column stacks four cards with no priority.

**Inbox (mobile)** — the capture box, the primary action of the page, starts around 600px down. Above it are a page title, two subtitle lines, and an empty-state card that repeats the same message a third time.

## Recommended changes

### 1. Collapse planner chrome to one row on mobile
Merge the view pills, date nav, and period pills into a single sticky row: `‹ date ›` + a single "View" menu (Grid, Schedule, Time of day, Morning, Afternoon, Evening) + overflow menu for Focus / Plan my day / Templates / Auto-schedule. Capture stays in the FAB. Desktop keeps the current two rows.

### 2. Merge the two scope concepts
"Time of day" and the separate Morning/Afternoon/Evening pills are the same idea at two depths. Keep one control: Grid · Schedule · Time of day, and let Time of day show three focusable columns with a segment picker inside it.

### 3. Open the grid where the user is
Auto-scroll the timeline to the current hour (or the day's first block) on mount, with a persistent "now" line and a "Jump to now" chip when scrolled away.

### 4. Hide failed states instead of announcing them
Drop the "Weather unavailable" chip entirely when there's no data; keep the moon/cycle dots. Same for any empty atmosphere metric.

### 5. Mobile inbox rail above the grid
Restore a compact horizontal rail of unscheduled inbox tasks pinned directly above the grid so tasks can be dragged down into it without opening the tray. Tray toggle moves into the overflow menu.

### 6. Fix overlap collisions
Offset the Pomodoro mini-widget below the header chip row on desktop; on mobile shift the FAB up above the bottom nav and fade it while dragging, matching the tray's existing drag-fade behaviour.

### 7. Quieter empty groups in the Tasks panel
Collapse zero-count groups by default and show the count inline instead of a "Nothing here." line per group. Only Inbox and Today stay expanded.

### 8. Prioritise the desktop context column
Day Pulse and the intention line stay pinned; calendar and Moon & Energy move into a collapsible "More context" section so the column doesn't scroll past the grid.

### 9. Inbox: capture first
Reorder to: compact one-line header → Quick Capture (auto-focused on desktop) → List/Schedule toggle → items. The illustration/empty-state card renders only when the list is empty *and* moves below the capture box. Cut the duplicated subtitle lines down to one.

### 10. Inbox action bar
Move "Plan my day" out from under the FAB into the List/Schedule row as a right-aligned button, and keep the row sticky while scrolling long inbox lists.

## Technical notes

- Planner chrome: `src/pages/Planner.tsx`, `src/components/planner/PlannerRhythmHeader.tsx`, `PlannerPeriodTabs.tsx`, `PlannerViewToggle.tsx`.
- Scroll-to-now and now-line: `src/components/planner/PlannerTimeline.tsx` (uses `ROW_PX`/`HOUR_PX` from `src/lib/planner-metrics.ts`).
- Atmosphere chip: `src/components/planner/PlannerAtmosphereStrip.tsx`.
- Mobile rail: `src/components/planner/PlannerMobileInboxRail.tsx` (exists, currently not mounted on `/planner`).
- Tasks panel groups: `src/components/planner/TaskSourcePanel.tsx`.
- Context column: `src/components/planner/PlannerContextPanel.tsx`.
- Inbox order: `src/pages/Inbox.tsx`, `src/components/inbox/InboxIllustration.tsx`, `NlpHighlightedInput.tsx`.
- FAB/Pomodoro stacking: `src/components/quick-add/CombinedFab.tsx` and the Pomodoro floating widget.
- No schema or business-logic changes; all edits are layout, ordering, and conditional rendering.
