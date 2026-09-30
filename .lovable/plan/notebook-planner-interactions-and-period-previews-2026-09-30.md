# Notebook planner interactions and period previews

## What will change
- Rebuild each notebook day plan so cosmic events appear first, followed by All day, Morning, Afternoon, and Evening sections.
- Make notebook task rows behave like planner tasks: checkbox completion, task opening/editing, time aligned on the left, no completed-title strikethrough, and mouse or touch dragging between Morning, Afternoon, and Evening.
- Put Breakfast under Morning, Lunch under Afternoon, and Dinner under Evening, with an always-visible meal planning control for empty or filled slots.
- Add note glimpses when hovering notebook day, week, or month date controls. Existing notes show a short readable excerpt; unwritten periods retain their current create-note behavior.

## Technical details
- Reuse the existing task update store so a day-part drop changes the task start time to that section’s default while preserving the date and other task fields.
- Support desktop drag events and the existing long-press planner drag event for touch devices, with visible drop-zone feedback.
- Reuse the existing meal slot card and meal library flow rather than creating a separate notebook meal store.
- Load the existing period notes once in the context panel, index them by kind and period key, and wrap month/week/day controls in a shared hover preview.
- Preserve cross-day dragging, period-note navigation, events, note/task linking, and responsive notebook layouts.

## Verification
- Check the authenticated daily, weekly, and monthly notebook pages on desktop and mobile.
- Verify task completion and opening, drag across day parts, meal add/edit, cosmic ordering, date-note previews, and a clean build without console errors.
