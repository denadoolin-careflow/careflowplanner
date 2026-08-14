# Planner: breathing room, week overview, month clarity, overdue rescue

## 1. Bugs and layout fixes

- **Grid feels crammed.** Every grid view (day timeline, 3-day, week grid, month calendar) is squeezed into the same bounded box `clamp(380px, 68vh, 880px)`. Month especially suffers: six week-rows inside ~500px means each day cell is under 90px. Fix by giving each view its own height: day/3-day/week grid get a taller clamp (`min(78vh, 1000px)` with a 520px floor), month calendar gets a natural height based on row count (min 120px per week row) and scrolls with the page instead of inside a short box.
- **Sticky side columns can outgrow the viewport.** Task, focus, and context columns use `max-h-[calc(100dvh-6rem)]`, which ignores the app header, so their bottom content can sit under the viewport edge. Switch to a shared offset that accounts for the sticky header.
- **Time-of-day and schedule lists have no minimum height**, so a near-empty day collapses to a thin strip. Give each period list a comfortable minimum and consistent internal spacing.
- **Month "+N more" only opens the day** rather than expanding in place; day cells hide most of the day. Handled by the taller month rows (4 chips visible) plus a hover/tap popover listing the rest.

## 2. Week Overview (board) sections

Underneath the week board, the unscheduled rail and week planning dashboard are locked into a narrow `320px / rest` split on desktop, which makes both feel cramped.

- Give the week board section full page width and stack the review blocks as generous, full-width cards: Time review, then Week planning dashboard, then the Unscheduled rail as a multi-column grid (2-3 columns on wide screens) instead of a skinny sidebar.
- Raise the per-day column minimum height so day columns don't look like slivers, and let day columns scroll internally past ~8 items.
- Keep all existing drag-and-drop, capacity bars, and data untouched.

## 3. Month view clarity

- Taller day cells with up to 4 item chips plus a "+N" affordance.
- Completion at a glance: each day cell shows a small `done / total` progress pill and completed chips render with a check icon and muted style; days where everything is done get a subtle success ring.
- Overdue days (past days with incomplete tasks) get a warning-toned marker so gaps are obvious.
- Today's cell stays highlighted; other-month days stay dimmed.

## 4. Overdue section

A new **Overdue** block that surfaces every task with a due date before today that isn't done and isn't snoozed.

- Appears at the top of the planner task panel (desktop) and as a collapsible section above the plan on mobile, plus inside the Inbox task sources.
- Each row shows title, how many days late, and quick actions:
  - **Today** / **Tomorrow** / pick a date — reschedules the due date
  - **Snooze** (3 days, next week, custom) — uses the existing park + snooze-until behaviour so it disappears until that date, then returns automatically
  - **Complete** and **Open** for the full editor
- Bulk actions in the header: "Move all to today" and "Snooze all to next week", each undoable through the existing planner history.
- Section hides itself entirely when nothing is overdue.

## Technical notes

- `src/pages/Planner.tsx`: replace the single `GRID_BOX` constant with per-view height classes; add the overdue section into the task column; adjust `SIDE_COL` offset.
- `src/components/planner/PlannerMonthView.tsx`: row height, 4-chip limit, done/total pill, completed chip styling, overdue marker, overflow popover.
- `src/components/planner/PlannerWeekBoard.tsx`: restructure the section below the board into stacked full-width blocks; taller day columns.
- New `src/components/planner/PlannerOverdueSection.tsx` plus a small `useOverdueTasks` selector over the existing store; reuses `TaskQuickActions`, `updateTask`, and the existing `status: "parked"` + `snoozedUntil` snooze path (already auto-unparks on the due date).
- `src/components/today/TodayPlanView.tsx`: mount the overdue section above the Planned section on mobile.
- No schema changes, no new data fetching; presentation plus existing task mutations only.
