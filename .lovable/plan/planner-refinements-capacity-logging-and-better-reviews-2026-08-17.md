# Planner refinements, capacity logging, and better reviews

## 1. Quick-add on the grid keeps its duration picker
Tapping the grid opens the anchored composer with duration chips (15/30/45/60...). Right now the composer can close before a duration is chosen.
- Keep the composer open on any interaction inside it; only close on explicit save, Escape, or an outside click that is not a duration chip.
- Make the chosen duration visible as a live preview block on the grid while the composer is open.
- Save writes `startTime` + `estMinutes` together, then the block stays selected (no editor popup).

## 2. Sidebar: drag-to-resize instead of floating window
- Remove the pop-out/floating mode for the task sidebar (delete `FloatingPanelFrame` usage and its Move button).
- Keep and strengthen the existing drag handle: wider hit area, hover/active highlight, double-click to reset, arrow-key resize, width persisted per user.
- Collapse/expand toggle stays; collapsed keeps a slim icon rail.

## 3. Capacity logs flow into Capacity Insights
- Every planner capacity reading (planned vs. completed minutes, day-part load, burnout/capacity level) is saved for the day to the existing daily check-in capacity record instead of being computed and discarded.
- Capacity Insights reads those saved days so its 30-day trends reflect planner activity, not just manual energy entries.
- Insights gains a "from your planner" section: average planned vs. completed hours, most-overloaded day part, and best-performing capacity level.

## 4. No editor popup after completing or moving a task
- Completing a checkbox: haptic + strike-through only, with an Undo toast.
- Drag/drop or reschedule: block settles into its new slot with an Undo toast; the quick-edit sheet no longer auto-opens.
- Editing stays available on an explicit tap of the block body or its "edit" action.

## 5. Mobile: remove the horizontal inbox rail, add drag-out-of-panel
- Delete `PlannerMobileInboxRail` from the timeline.
- The task panel (opened from the button next to the date) becomes the single mobile task source.
- Long-press a task in that panel to start a drag: the panel fades to near-transparent and stops capturing touches so the grid underneath is visible.
- While dragging, the grid highlights the target slot and snaps to 15-minute increments; releasing schedules the task, closes the panel, and shows an Undo toast. Dragging back over the panel edge or pressing Escape cancels.

## 6. Daily / weekly / monthly review and reset improvements
- Shared review shell so day, week, and month reviews look and behave the same: header with period navigation, stats row (planned vs. completed, capacity, streaks), AI summary, wins/releases, and next-period intentions.
- Daily review gains carry-over actions (move unfinished to tomorrow, park, drop) in one tap.
- Weekly and monthly reset pages get the same stat strip plus a checklist of what the reset covers, and previous entries are browsable in a timeline.
- Notifications: reminders for daily review (evening), weekly reset (Sunday), and monthly reset (last day), each with times configurable in settings and a single "reviews & resets" toggle.

## 7. Mobile planner polish
- Sticky compact header (date, view pills, today button) with the atmosphere/moon strip collapsed to one tappable line.
- Timeline gets larger touch targets, clearer day-part bands, and smooth scroll to now.
- Segmented Morning/Afternoon/Evening jump bar for fast navigation.
- Week and month views wrap text properly and use compact chips sized for narrow screens.

## Technical notes
- Files touched: `src/pages/Planner.tsx`, `src/components/planner/PlannerTimeline.tsx`, `TaskSourcePanel.tsx`, `PlannerCapacityBar.tsx`, `PlannerDayReview.tsx`, `src/components/capacity/CapacityInsights.tsx`, `src/lib/capacity-sync.ts`, `src/pages/Review.tsx`, `src/pages/Reset.tsx`, plus removal of `PlannerMobileInboxRail.tsx` and the floating-panel wiring.
- Capacity persistence extends the existing daily check-in capacity write path with planned/completed minute fields; a migration adds those columns if they are not already present (verified during build).
- Mobile drag uses the existing pointer-drag helper with a new "panel transparent while dragging" state rather than a new drag library.
