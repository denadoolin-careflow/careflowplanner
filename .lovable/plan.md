# Planner task display and interaction consistency

## What will change
- Add a remembered planner display option to show or hide strikethrough on completed tasks.
- Expand truncated planner task titles while hovering or focusing, without shifting neighboring columns unnecessarily.
- Show complete meal names in planner grid meal markers instead of truncating them.
- Render task-type all-day items with the same checkbox, visual treatment, opening behavior, and drag support as scheduled tasks; keep non-task all-day events in their existing event style.

## Technical details
- Extend the existing device-local planner preferences and expose the option through the planner’s existing view/settings controls.
- Reuse the shared planner task row where layout permits, and share completion/drag semantics where compact all-day constraints require a variant.
- Preserve current calendar and cosmic event behavior.
- Verify type checks, current build health, desktop planner interactions, and a narrow viewport.
