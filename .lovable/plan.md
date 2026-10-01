# Notebook previews, inline planning, and year summaries

## What will change
- Add consistent hover previews on desktop and first-tap previews on touch for linked daily, weekly, and monthly notebook dates. A second tap opens the note.
- Let notebook planner tasks open an inline editor inside the note for title, date, time, duration, area, notes, completion, and save/cancel actions.
- Present monthly notebooks in the Notebook view as a compact notebook-cover gallery, while preserving the month → week → day hierarchy beneath each month.
- Add a quick day card to every active date in the Planner year view, showing that date’s cosmic events, appointments, tasks, and meals. Hover opens it on desktop; first tap opens it on touch, and the card links into the day.

## Technical details
- Reuse the existing note preview presentation and period-note lookup instead of creating duplicate note data.
- Add a shared date-note preview trigger that supports mouse hover, keyboard focus, and touch tap without breaking task drops or note navigation.
- Keep task edits in the existing task store and render the editor within the notebook planner section rather than navigating away.
- Build year summaries from the existing day-plan adapter so ordering and content match the Planner’s other views.
- Keep month gallery cards compact and responsive, using existing note icons, titles, covers, and written/empty states.

## Verification
- Check daily, weekly, and monthly notebook date previews with mouse and touch behavior.
- Edit a task’s time and details from inside a note and confirm the planner reflects the saved changes.
- Check the notebook gallery across mobile and desktop widths.
- Check year-view day summaries for days containing each supported item type, plus empty days.
- Confirm a clean build and no new runtime or console errors.
