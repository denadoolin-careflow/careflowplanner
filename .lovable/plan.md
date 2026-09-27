# Day-part habits and routines on the planner

## What changes

- Replace the separate Habits and Routines groups with chronological sections: **Morning**, **Afternoon**, and **Evening**.
- Place habits using their saved time-of-day setting. Treat Midday as Afternoon, and place Anytime habits in Morning so every due habit appears once.
- Place routines by their saved slot/time. Treat Nap time as Afternoon and Night as Evening.
- Within each day part, show habits first, then group routines by person. Keep existing habit and routine-step check-offs unchanged.

## Compact weekly view

- Each day starts as a single compact summary button showing a small combined progress ring plus habit and routine totals.
- Tapping one day expands only that day’s chronological checklist; tapping again collapses it.
- Add an **Expand all / Collapse all** control in the sticky Rhythm gutter.
- Remember each day’s expanded state and the overall choice on this device, so the weekly grid stays at the preferred density.
- Keep the Day view expanded by default, using the same chronological grouping without the weekly summary-only state.

## Technical details

- Refactor `PlannerRhythmRow` around a shared day-part model used by both the week row and Day card.
- Add an accessible compact progress ring built from existing semantic color tokens.
- Keep habits editable on any date and routines editable only today, matching current completion behavior and storage.
- Use existing planner controls, haptics, popovers, colors, and horizontal scrolling; no database changes.

## Verification

- Confirm Morning, Afternoon, and Evening ordering and person labels with mixed habits and routines.
- Toggle one day, then Expand all and Collapse all; reload and confirm the density choice persists.
- Check a habit, a whole routine, and an individual routine step; confirm progress updates immediately.
- Check Day, 3 Day, and Week layouts at desktop and phone widths, then run the project checks.
