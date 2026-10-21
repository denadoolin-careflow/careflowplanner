# New-moon goal suggestion on Today

## What you'll get
- From each new moon until two days after it, Today shows a "New moon intention" card with:
  - the life area this new moon lights up (for example "4 · Home & family"), with the moon's sign
  - a suggested goal written for that area (for example "Create a calmer home base this cycle")
  - one small first step (for example "Clear one surface that drains you"), due today
- **Add with one tap:** saves the goal in that life area and creates the first step as a task for today, already linked to the goal. The card then shows "Added", with links to open the goal or the task.
- **Swap** shows a different suggestion for the same area. **Not this time** hides the card until the next new moon.
- If you already have an active goal in that area, the card offers the first step for that goal instead of a new goal, so goals don't pile up.

## How the life area is chosen
- If your birth chart is saved, the area is the house where the new moon falls in your chart.
- Otherwise it uses the house that naturally matches the moon's sign (Aries is 1, Taurus is 2, through Pisces is 12).

## Where it appears
- On Today, right below the moon card, on phone, tablet and desktop.

## Verification
- With the date set to a new moon: check the card at phone and tablet widths, tap Add, confirm the goal and linked task show on Today and in the Life areas tab, then remove the test goal and task.
- Tests for: the area choice (sign fallback and natal house), the window from the new moon to two days after, and swapping suggestions.

## Technical details
- New `src/lib/goals/new-moon-suggestion.ts`:
  - finds the latest new moon on or before the date using `monthRhythmMoments` (the same source as the new-moon reminder)
  - picks the house: natal house from the existing chart helpers when a birth chart is saved, otherwise the sign's natural house
  - picks from a small set of goal and first-step pairs for each house; Swap moves to the next pair
- New `NewMoonGoalCard` on Today:
  - Add calls the existing `addGoal` with `lifeHouse` set, then `addTask` with `goalId` and today's due date, so it uses the existing goal and task saving with no database change
  - "Not this time" and the shown pair are saved on this device, keyed by the new moon's date
- AGENTS.md gets one rule about the suggestion source and its storage on this device.
