# Monthly Planner: phone view polish

Nothing about your plans, notes or data changes. This only changes how the month looks and feels on a phone.

## What changes
1. **Calendar first.** Right now the season banner, the monthly note, the moonscape and "Needs attention" all sit above the calendar, so you scroll before seeing your days. On phones the calendar or agenda moves to the top, right under the month controls.
2. **One slim month header.** Month name, previous/next arrows, a "Today" button and Add sit in one row that stays visible while you scroll.
3. **Easier day picking.** Bigger day cells (at least 44px tall), a clear ring on today, a filled circle on the selected day, and up to 3 colored dots per day instead of cramped text.
4. **Selected day underneath.** Tapping a day shows its plans right below the calendar (appointments, tasks, meals, care) with a + Add button for that day, so no extra pop-up is needed.
5. **Swipe between months.** Swipe left or right on the calendar to change month.
6. **Extras tucked below.** "Needs attention", the moonscape (Plan · Grow · Care · Let go), the season banner and the monthly note move under the day list as tidy fold-out cards with matching headings and spacing.
7. **Bottom clearance.** The last card never hides behind the bottom bar or the floating add button.

Desktop and tablet layouts stay as they are.

## Check
- Look at 360px and 384px wide: no sideways scrolling, all buttons easy to tap.
- Tap a day, add an item, swipe months, open each fold-out card.

## Technical details
- Reorder sections in `PlannerMonthExperience` for `isMobile`; wrap extras in a shared collapsible card.
- Tighten `PlannerMonthView` mobile grid/agenda; reuse `MobileWeekAgendaStrip`-style swipe handling and the existing item opener and `MonthQuickAddSheet`.
- Sticky header uses existing planner tokens; presentation-only.
