# Mobile Month clarity, monthly moonscape, and richer Week cards

## Direction
Simplify the phone Month experience into a calm planning surface with one clear hierarchy: monthly context and note first, a compact calendar second, and selected-day details/actions after it. Preserve the existing Botanical Warmth palette, Outfit/Figtree mobile typography, planner data, filters, drag-and-drop, capacity rules, side sheets, routes, and desktop layouts.

## Mobile Month structure
- Keep the existing Calendar, Agenda, and List choices, but reduce competing borders, labels, capacity marks, and item dots in the Calendar layout.
- Make the Calendar grid visually quieter: one-letter weekdays, stable square-like cells, a strong selected/today state, one restrained item-count or category signal, and only essential note, moon, and cycle markers.
- Keep the grid within the phone width with no page-level horizontal overflow; tapping a date continues to select it and open the existing day details flow.
- Consolidate filters and layout controls into one compact toolbar so the month itself appears sooner.
- Keep “Needs attention” and “Month at a glance” collapsed and secondary rather than competing with the calendar.

## Context above the grid
- Move the existing editable monthly note above the Month calendar/agenda/list content so reflection and intention are visible before scheduling.
- Add the existing zodiac Season banner directly above the note in a compact mobile treatment, linking to the full Month overview.
- Add a compact **Monthly moonscape** summary between the monthly note and calendar. It will show the four principal lunar moments occurring in the viewed month:
  - **Sow · New Moon**
  - **Grow · First Quarter**
  - **Glow · Full Moon**
  - **Let go · Last Quarter**
- Each lunar moment shows its date, moon sign, element, a short elemental planning guide, and a restrained phase marker that matches the calendar cell.
- Selecting a lunar moment reveals its phase, sign, and element journal prompts without navigating away.

## Journal, notes, and Cosmic Flow
- Let the user write a reflection from each lunar moment and save it to the existing Journal with the lunar phase, moon sign, element, and selected date attached.
- Offer a separate “Add to month note” action that appends the selected prompt/context to the existing monthly note rather than creating duplicate note systems.
- Record saved lunar journal entries through the existing Cosmic Flow journal linkage so the reflection can be followed from Cosmic Flow.
- Include a clear “Open in Cosmic Flow” action for deeper lunar context while keeping the Month screen concise.
- Show saved state and reopen existing reflections instead of creating duplicates when the same lunar moment is revisited.

## Moon and personal cycle overview
- Add a visible, horizontally readable timeline for the full month beneath the moonscape summary.
- The lunar rail marks Sow, Grow, Glow, and Let go on their calculated dates.
- The personal cycle rail uses the existing private cycle history/settings to show menstrual, follicular, ovulatory, and luteal spans, cycle-day context, and short planning guidance.
- Keep lunar and personal-cycle rows visually distinct, clearly labeled, and accessible without implying medical certainty.
- When cycle tracking is disabled or has insufficient history, show a quiet setup/empty state instead of inferred personal data.
- Selecting a day on either rail updates the selected Month day and its agenda/details.

## Selected-day quick add
- Replace the generic Month plus action with a bottom-sheet quick add locked to the currently selected date.
- Provide touch-friendly choices for Task, Appointment, Home, Cleaning, Caregiving, and Meal.
- Reuse the existing planner capture and store actions so each choice creates the correct record/category and immediately appears in Month, Week, Day, care, and meal views.
- Support title, time or day part, priority where relevant, and a fast save path; preserve the richer task tags and natural-language parsing already available.
- Fix the current selected-day mismatch by carrying the selected Month date into the shared capture flow rather than defaulting to the planner route date.

## Mobile Week event cards
- Refine the shared timed card used by both Week and 3 Day schedules rather than introducing a second card system.
- Give time the first readable line, keep the title dominant, and add compact category/area and priority indicators when space allows.
- Use responsive density states so short cards remain legible without overflowing; fuller metadata appears only in taller cards or the item editor.
- Keep tasks, appointments, notes/journals, care/home/cleaning, and meals visually distinguishable through existing semantic category tokens rather than adding more competing colors.
- Preserve tap-to-edit, task completion, resizing, long-press move, conflict handling, keyboard actions, and focus/Pomodoro state.

## Scroll and interaction safety
- Keep the Week/3 Day outer frame as the horizontal day scroller and the timeline as the sole vertical scroller; new card details must not create nested scroll regions.
- Preserve the pinned time gutter, day headers, meal/care visibility toggles, current-time positioning, and page-scroll handoff at the top and bottom of the timeline.
- Ensure vertical touch gestures scroll hours, horizontal gestures move between days, and long-press dragging does not activate during ordinary scrolling.
- Retain drag/drop across Month and Week with highlighted destinations, capacity/conflict confirmation, haptics, and Undo.

## Technical approach
- Refactor the existing Month experience and mobile Month CSS; do not create a parallel planner or duplicate its feed.
- Build a reusable month-rhythm summary from the existing lunar phase, moon sign, element, journal-prompt, zodiac-season, cycle-store, monthly-note, and Cosmic Flow helpers.
- Extend the shared planner quick-capture contract with selected date and item kind, using the existing task, appointment, and meal actions plus established Home/Cleaning/Caregiving categorization.
- Extend the current Week timeline card content with feed/task metadata while leaving its measured layout and scroll ownership intact.
- No new personal-health table is planned; existing private cycle and journal storage remain the source of truth.

## Verification
- Test Month Calendar, Agenda, and List at 393×712 and 360×740: compact controls, note/season placement, four lunar moments, moon signs/elements, cycle timeline, selected-day updates, and no horizontal page overflow.
- Verify each lunar prompt can save to Journal, append to the monthly note, reopen without duplication, and link into Cosmic Flow.
- Verify quick add for Task, Appointment, Home, Cleaning, Caregiving, and Meal lands on the selected day and appears in the appropriate planner lanes.
- Test Week and 3 Day at both phone widths for readable time/category/priority details, horizontal day scrolling, vertical hour scrolling, and page handoff at both boundaries.
- Recheck drag/drop, resize, tap editing, meals/care toggles, conflict/capacity confirmation, Undo, keyboard/focus states, reduced motion, and desktop Month/Week regressions.
- Run the TypeScript check and confirm there are no browser errors.
