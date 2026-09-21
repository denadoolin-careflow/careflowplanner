# Mobile Month redesign and Week scrolling repair

## Direction
Use the selected **Botanical Warmth** palette, **Outfit + Figtree** typography, and an **agenda-first** phone layout. Preserve CareFlow’s calm family-care character, existing planner data, filters, priorities, notes, drag-and-drop, side sheets, routes, and desktop views.

## Mobile Month
- Replace the tall stack before the calendar with a compact month toolbar: month title, previous/next controls, Calendar/Agenda switch, filters, and Capture.
- Make **Agenda** the readable mobile-first presentation: a compact week strip for date selection followed by the selected day’s appointments, tasks, meals, care, capacity, and note marker.
- Keep a full **Calendar** option for orientation. Tighten the grid, preserve Monday-first ordering, and show date, today/selected state, capacity, note/cycle markers, category dots, and a count without squeezing text chips into narrow cells.
- Move the four month totals and “Needs attention” into compact collapsible summaries so plans appear within the first screen.
- Tapping a day opens the existing day details sheet; tapping an item opens its existing editor. Keep every day as a shared drop target with clear drop feedback.
- Retain List as a secondary month layout if useful, but present the three choices as Calendar, Agenda, and List rather than Dots/Chips/List.
- Keep the monthly note available below the active month content without forcing it ahead of the calendar or agenda.

## Mobile Week
- Make the active layout explicit and default the phone Week to a readable agenda/board presentation; Schedule remains available for time-grid planning.
- Repair Schedule as a genuinely bounded two-axis workspace: the outer frame owns horizontal scrolling, the timeline owns vertical scrolling, and normal page movement resumes at the top and bottom.
- Calculate the available schedule height from the real sticky planner header and bottom navigation instead of relying on a fixed minimum that can expand the page.
- Keep the day header, meals, care/home/cleaning, and all-day rows aligned with the horizontally scrolling day columns; keep the time gutter pinned.
- Prevent wheel/touch trapping by forwarding vertical gestures to the page at timeline boundaries and reserving horizontal gestures for moving between day columns.
- Keep the legend single-line and horizontally scrollable outside the vertical timeline so it cannot reduce the usable schedule area.
- On phones, scroll the selected/current day into view when Week Schedule opens. Preserve meal and care-row visibility preferences.

## Shared mobile polish
- Simplify the sticky planner controls to avoid three competing rows: date navigation first, range choices second, and only the current Month/Week layout controls directly below.
- Use Outfit for compact headings and Figtree for controls/content while applying the selected palette through semantic CareFlow design tokens.
- Maintain 44px touch targets, visible focus states, reduced-motion support, bottom-navigation clearance, and no horizontal page overflow.
- Preserve unified dragging: tap edits, long-press moves, highlighted destinations, conflict/full-capacity confirmation, haptic feedback, and Undo.

## Technical approach
- Update the existing Month experience/view instead of creating a second data path; add a selected-day agenda presentation using the current planner feed and item opener.
- Refactor the Week grid into coordinated horizontal and vertical scroll layers with measured mobile height and boundary scroll handoff.
- Keep desktop Month and Week structures unchanged except for shared fixes that improve scrolling safely.
- Keep persisted view choices compatible by mapping existing mobile Month values to the redesigned choices.

## Verification
- Test Month Calendar, Agenda, and List at 393×712 and a second narrow phone width.
- Test Week Schedule, Board, Overview, List, and Table; verify the Schedule can scroll horizontally across all days and vertically through all hours.
- Verify page scroll handoff at both timeline boundaries with wheel and touch-style gestures.
- Verify meals and care rows toggle without collapsing the schedule; selected day, today, notes, filters, day sheet, item editing, drag/drop, capacity confirmation, and Undo still work.
- Check desktop Month and Week for regressions, run the TypeScript check and focused tests, and confirm there are no browser errors or page-level horizontal overflow.
