# Plan a meal from Tonight's dinner

## What you'll get
1. **Plan a meal opens a sheet right on the Meals page** (no more jumping to the library), with two tabs:
   - **Write it in** — meal name, prep time, ingredients (one per line), notes.
   - **Choose from library** — the same searchable meal library picker used on the planner; picking one fills in name, prep, and ingredients.
   - Optional "Add ingredients to shopping list" checkbox on save.
2. **The header updates right away.** Saving creates tonight's Dinner, so the card switches from "Nothing planned" to the meal name, prep time, "Start at…" time, and steps — and the same meal appears on the planner and Today's dinner card (they all read from the same meal list).
3. **Different meals for different people.** In the sheet, a "Different meals for different people" toggle lets you add extra plates: each plate has a meal (write in or library) and who it's for (picked from your care recipients / loved ones). The header then shows the main meal plus small chips like "Mom · Soup", "Kids · Pasta". If a dinner is already planned, the button reads **Edit dinner** and opens the same sheet pre-filled; the shopping-list ingredient picker stays available from there.

## Technical details
- New `src/components/meals/PlanDinnerSheet.tsx` (bottom sheet on mobile, dialog on desktop), reusing `MealPickerPopover` for the library tab and `addMeal` / `updateMeal` / `addGrocery` from the store.
- Per-person plates: each extra plate is its own Dinner meal row for today, linked to a person via the existing `meal_people` table (`linkMealPerson` in `src/lib/meal-people.ts`). The main dinner = the Dinner row with no person link (or the first one). No schema change.
- `TonightDinnerHero.tsx`: replace the `/meals/library` link with the sheet; load people links for today's Dinner rows and render chips; listen to `careflow:meal-people-changed` to refresh.
- Warm Kitchen styling kept. Verify at phone size: plan a write-in meal, a library meal, and a two-person dinner; confirm the header and planner update.
