# Mobile planner refresh

## Goal
Refresh every mobile planner range—Day, 3 Day, Week, Month, Year, and Overview—so the schedule is immediately visible, controls are easier to understand, scrolling never traps the user, and planning items are comfortable to read, move, and edit by touch.

The existing CareFlow identity, routes, planning data, period preferences, priority sync, meal/care visibility settings, and scheduling rules will remain intact.

## 1. One compact mobile planner shell
- Rework the sticky mobile header into two stable rows: date navigation and a compact range switcher.
- Keep the primary range choices visible; move view-specific layouts, filters, meals/care toggles, tray, and secondary actions into one clearly grouped menu or compact control row.
- Show the active Week and Month layout without requiring users to remember a hidden menu state.
- Reduce stacked controls and decorative content before the schedule so each view begins within the first screen.
- Give the sticky header safe-area spacing and ensure it does not overlap planner content or the bottom navigation.

## 2. Reliable scrolling and visibility
- Replace fixed phone-height assumptions with a mobile planner viewport that accounts for the actual sticky header and bottom navigation.
- Give each screen one clear vertical scroll owner; keep horizontal scrolling only where multi-day columns require it.
- Preserve natural page scrolling at the top and bottom of inner grids so wheel, trackpad, and touch gestures do not become trapped.
- Keep time gutters and day labels visible while the Week and 3 Day schedules scroll.
- Retain the single-line, horizontally scrollable legend and ensure optional meals/care rows cannot squeeze the hourly grid away.

## 3. Day view: execution first
- Condense moon, season, cycle, capacity, assistant, empty-day, references, and priorities into a compact summary area with expandable details.
- Keep the selected Day layout—Grid, Schedule, Capacity, or Time of day—prominent and easy to switch.
- Make the timeline occupy a useful phone-height workspace with stable hour labels and unobstructed blocks.
- Standardize task, appointment, meal, and care rows for wrapped titles, readable times, and touch-sized completion/edit actions.

## 4. 3 Day and Week: legible rhythm views
- Keep 3 Day as a readable horizontal schedule rather than compressed columns; use a stable minimum day width and a pinned time gutter.
- Make Week’s active layout visible through a compact selector for Schedule, Board, Overview, List, and Table.
- Keep Schedule horizontally scrollable with a clear visual cue, while preserving vertical time scrolling and scroll handoff to the page.
- Refine the Board into phone-width day sections with compact Morning, Afternoon, Evening, and meal areas rather than three squeezed columns.
- Carry the meals and Caregiving/Home/Cleaning visibility toggles consistently across 3 Day and Week layouts.
- Improve empty and loading states so a valid but quiet week never appears broken or missing.

## 5. Month: quick orientation and detail
- Keep Dots, Chips, and List choices, but present them as an obvious compact layout switch.
- Tighten the month introduction and summary so the calendar remains visible near the top.
- Preserve full-month orientation with stable cells, clear selected/today states, readable counts, note/cycle markers, and stronger capacity cues.
- Open a polished bottom day sheet for details and editing without forcing a range change.
- Keep day cells as shared drop targets and provide clear touch feedback when moving items.

## 6. Year and Overview: scan without long, wasteful scrolling
- Make the Year a dense two-column mini-month grid with stable tap targets, stronger load shading, and clear current-month/today treatment.
- Let month headings open the selected month while individual dates continue to open Day.
- Reorder Week and Month Overview content for mobile: summary first, then needs attention/review, then deeper planning sections.
- Collapse secondary dashboard sections by default where necessary so useful content remains discoverable without creating a very long first screen.

## 7. Touch editing and drag-and-drop
- Use one interaction contract everywhere: tap opens quick edit; press and hold starts moving; visible ghost and highlighted destination confirm the action.
- Prevent normal vertical or horizontal scrolling from accidentally starting a drag.
- Add edge auto-scroll inside the active schedule/calendar while dragging.
- Keep conflict and full-capacity confirmations, haptic feedback, and Undo after successful moves.
- Ensure tasks, appointments, and meals land on the correct date and time/day-part in Day, 3 Day, Week, and Month views.
- Provide an accessible non-drag alternative through quick-edit actions for every movable item.

## 8. Responsive and accessibility polish
- Use existing semantic design tokens and CareFlow typography while simplifying surfaces, borders, and spacing for a noticeable refresh.
- Keep controls at least touch-sized, labels readable, focus states visible, and icon-only controls named for assistive technology.
- Respect reduced-motion preferences and avoid layout shifts when filters, summaries, optional rows, or sheets open.
- Preserve user choices for active range, layout, filters, meals/care rows, priorities, and collapsed sections.

## Technical approach
- Refactor `Planner.tsx` into focused mobile header, control, and range-shell pieces while preserving the existing desktop branch.
- Introduce shared mobile viewport/scroll primitives instead of the current fixed mobile grid height.
- Update the existing Day timeline/list components, `PlannerWeekGrid`, `PlannerWeekBoard`, Month experience/view, Year view, and Week/Month overview sections rather than creating parallel data paths.
- Extend the existing unified planner drag layer and scheduling hook; do not add a second drag implementation.
- Keep all changes in presentation and interaction code unless a small preference field is needed for an explicitly persistent mobile setting.

## Verification
- Run the TypeScript check and focused planner tests.
- Test Day, 3 Day, all five Week layouts, both Month modes plus Dots/Chips/List, Year, and Overview at phone widths and desktop.
- Verify touch-style vertical/horizontal scrolling, boundary scroll handoff, sticky labels, bottom-nav clearance, tap editing, long-press drag, edge auto-scroll, capacity confirmation, and Undo.
- Confirm no horizontal page overflow, overlapping controls, clipped titles, hidden schedule area, or browser errors.
