# Planner grid view mockup

Add a fourth concept, "4 · Phase Grid", to the existing /schedule-mockups page. It uses sample tasks only, so the real planner doesn't change.

## Day version
- A 2×2 grid of rounded cards, one per phase: Plan (morning), Grow (afternoon), Care (evening), Let go (night).
- Each card has the phase icon and name, its time window, a count of tasks done out of the total, task rows you can check off with a thin phase-colored edge, and an "Add" row.
- The current phase gets a colored outline and a "NOW" badge.
- On phones the cards stack into one column so nothing gets squeezed.

## Week version
- A grid with the 7 days across and the 4 phases down. Each cell is a tinted tile showing up to 2 task chips and "+N more".
- Today's column is highlighted, and the phase rows carry their icon and name.
- On phones it becomes one card per day with four small phase rows inside, swiped sideways like the Day Cards concept.

## Technical
- Edit only `src/pages/ScheduleMockups.tsx`: add the concept button and the `PhaseGridDay` and `PhaseGridWeek` components, reusing the existing sample data, the planner-card style, the rhythm color tokens and the phase icons.
- Check-offs are page state only.
- Check the page in the browser at 390px and 1280px.
