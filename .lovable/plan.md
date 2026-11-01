# Twin Rings cycle & Moon widget

Turn the Twin Rings design into the real widget on your day page, with phase icons and a date scroller.

## What you'll see
- **Two rings**: Moon on the outside, your menstrual cycle inside, each split into four colored segments.
- **Phase icons on the rings**: the Plan leaf, Grow sprout, Care heart and Let go crescent sit on each segment of both rings, so you can tell the parts apart at a glance. The current phase's icon is larger.
- **Date scroller** under the rings: a swipeable strip of days (about two weeks back and six weeks ahead) with arrows and a "Today" button. Picking a day moves both markers on the rings and updates the labels: Moon phase and sign, cycle phase and cycle day. Each date chip shows small dots in that day's Moon and cycle phase colors.
- **Labels beside the rings**: the Moon phase and cycle phase for the chosen day, each with its icon and a one-line suggestion.
- If you haven't logged a cycle, the inner ring stays faded and shows a "Log cycle" link instead.
- Placement: on the day page, inside the rhythm area near the top. The mockups page is then removed.

## Technical details
- New `src/components/cycle/TwinRingsWidget.tsx`, built from the mockup's `TwinRings`/`Ring`. It takes a `selectedDate` and computes `MoonPhase(date)`, `lunarRhythmAt(date)` and `getPhaseInfo(date, periods, settings)` (future dates use predicted cycles).
- Icons are SVG `foreignObject` (or positioned overlay) `PhaseIcon` at each segment's midpoint angle. The menstrual→Plan, follicular→Grow, ovulatory→Care, luteal→Let go pairing stays the same.
- Scroller: horizontal snap list of 56 days, 44px tap targets, keyboard arrow support and `aria-pressed` on the selected day. The chosen date resets to the page's date when you change days.
- Render it in `Today.tsx` beside `RhythmTodayCard`; delete `CycleWidgetMockups.tsx` and its route.
- Add a unit test checking that the selected date maps to the expected cycle phase and Moon phase.
