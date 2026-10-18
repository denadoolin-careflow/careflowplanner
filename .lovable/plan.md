# Better Agenda and List views

Applies to the calendar Agenda view, the Planner day "Schedule" list, and the week List layout.

## 1. Easier to scan
- Sticky day headers ("Today", "Tomorrow", "Sun Oct 18") with a count of items and an open/done tally.
- A clear "Today" marker and a thin "now" line between past and upcoming items on today.
- A fixed time column (start–end, e.g. "9:00–9:45a"), with all-day items grouped at the top.
- A colored left edge per item type (task, appointment, family, reminder, meal, medicine, habit) using the existing event-type colors.
- Finished items fade and move below open ones; empty days collapse to one quiet line.

## 2. Everything in one place
- Show tasks, appointments, Google Calendar events, meals (including recurring meals), Bedside medicine reminders, and habits/routines due that day.
- An "Overdue" group at the top of today for unfinished past tasks.
- An "Unscheduled" group at the bottom of each day.
- A small filter row (All / Tasks / Events / Care / Meals) remembered on this device.

## 3. Act right in the list
- Open checkbox on every checkable item (tasks, meals, medicine doses, habits), with the selected atmosphere's completion feedback.
- Tap an item's title to edit it inline; a time chip opens a quick time/date picker.
- Quick actions: Tomorrow, Next week, Remove time.
- An "Add to this day…" line under each day header that understands typed times ("call mom 3pm").

## 4. Mobile feel
- Rows at least 44px tall with bigger checkboxes.
- Swipe right to complete, swipe left for reschedule options (reusing existing swipe actions).
- Day headers stay pinned while scrolling; a floating "Jump to today" button.

## Technical details
- New shared `AgendaRows` builder (`src/lib/planner/agenda-rows.ts`) that merges tasks, time blocks, appointments, meals (expanded via the existing recurrence helpers), medicine schedule, and habits into one typed list per day; used by `AgendaView`, `PlannerScheduleList`, and the week List layout so they stay consistent.
- New `AgendaItemRow` component reusing `PlannerTaskRow` behaviors, the shared completion visuals, and `meal_completion_logs` / medication dose logs for check-offs. No database changes.
- Filter choice stored device-locally.
- Unit tests for the builder: ordering (all-day → timed → unscheduled), overdue grouping, recurring meal on a given date, and done items sorting after open ones.
- Record the shared builder decision in `AGENTS.md`.
