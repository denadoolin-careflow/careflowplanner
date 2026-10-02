# Refine the notebook planner details and touch interactions

## What will change
- Make cosmic events in the notebook open a richer astrological detail panel on click, while retaining a useful hover preview.
- Add long-press task dragging on phones and tablets between Morning, Afternoon, and Evening.
- Reorganize task rows so time and estimated length sit together on the left, with the checkbox and task markers grouped beside the title.
- Give Morning, Afternoon, and Evening distinct, restrained colors and clearer drop feedback.
- Upgrade notebook date previews to preserve readable note formatting and scroll when the glimpse is longer.

## Technical details
- Reuse the existing cosmic detail/copy utilities and Cosmic Flow event link rather than creating a second astrology data model.
- Extend the notebook task rows with the existing pointer-drag event and mark each day-part section as a compatible touch drop target.
- Keep task completion and scheduling in the existing planner store; dropping changes only the task date/time bucket.
- Render note glimpses with the existing markdown preview styles inside a height-limited scroll area.
- Preserve desktop dragging, task quick edit, meal planning, and period-note navigation.

## Verification
- Check a daily notebook note on desktop and a phone-sized viewport.
- Verify cosmic hover and click details, mouse drag, long-press drag, task completion/opening, day-part colors, and scrollable formatted date previews.
- Confirm a clean build with no notebook runtime errors.