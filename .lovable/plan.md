# Planner scanning, priorities, activities, and daily care checklist

## What will change

### Clearer rhythm hierarchy across Month, Week, and Day
- Create one compact visual language for moon phase, moon sign, cycle phase, habits, routines, and goals.
- Give primary daily signals (moon and cycle) stronger icons and labels, while habits, routines, and goal progress use quieter secondary markers.
- Apply the same ordering and labels in Month cells, Week/3 Day headers and rhythm rows, and the Day overview so the views scan consistently.
- Preserve compact mobile layouts, accessible labels, and existing show/hide controls.

### Search existing plans from Top Priorities
- Replace the simple add field with a searchable picker that lists tasks already scheduled within the current day, week, or month.
- Exclude tasks already pinned, show date/time and priority for quick recognition, and pin a selected task without duplicating it.
- Keep “create new priority” available from the same field and preserve the three-item period limit and live synchronization.

### Priority and activity on scheduled tasks
- Add the shared priority flag to timed schedule cards in every size, including compact cards.
- Add an Activity selector to the task editor using the existing Cleaning, Commuting, Cooking, Caregiving, Errands, Admin, Focus work, Rest, and Other activity system.
- Suggest an activity automatically from task title, notes, area, zone, or linked care recipient. Explicit user selection always wins.
- Show the activity icon consistently on schedule cards and task rows, with readable hover/touch labels.

### Medicine and meal check-offs
- Keep both medicine and meal markers on the time grid.
- Change a medicine marker tap to toggle Taken directly instead of opening WellFlow, with immediate checked styling and feedback.
- Add a compact daily “Meds & meals” checklist above the Day schedule and above each Week/3 Day grid, using the same medicine logs and meal completion state.
- Keep edit/open actions separate from completion controls so checking an item never unexpectedly navigates away.

### Cosmic event guidance
- Add a rich hover card to cosmic events such as “Mercury sextile Jupiter.”
- Show the plain-language astrology meaning, what to expect, a practical “work with it” suggestion, and a gentle “avoid” suggestion using the existing transit guidance library.
- Make the same information available by tap/focus for mobile and keyboard users.

## Technical details
- Extend normalized cosmic planner feed items with their event metadata rather than recomputing descriptions in each view.
- Reuse `PriorityFlag`, `ActivityChip`, task activity tags, medication logs, and a shared meal-completion hook.
- Introduce a reusable daily care checklist for Day and multi-day layouts; no duplicate medicine records or meal plans.
- Use existing design tokens and UI primitives; retain drag-and-drop and two-axis scrolling behavior.

## Verification
- Confirm Month, Day, Week, and 3 Day indicator hierarchy at desktop and phone widths.
- Search and pin an existing scheduled task for day, week, and month; create a new priority from the same control.
- Edit activity manually, confirm inferred activity for untagged tasks, and verify priority/activity markers at compact and normal schedule sizes.
- Toggle medicine and meals from both grid/checklist surfaces and confirm synchronized checked state after reload.
- Hover, focus, and tap a cosmic event and verify its guidance appears without blocking planner scrolling.
- Run the full type check and authenticated browser checks for Day, Week, 3 Day, and Month.
