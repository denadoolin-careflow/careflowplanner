# WellFlow: store foods, food-feel tracking, cycle nutrition, and diet plans

Four additions to the existing WellFlow section, built mobile-first.

## 1. Bigger food inventory + editable calendar

- Expand the food search so results come from Open Food Facts filtered to US grocery brands and store labels (Walmart/Great Value, Kroger, Meijer, Aldi, Target/Good & Gather, Trader Joe's, Costco/Kirkland, Publix). Add a store filter row above results and show the store/brand badge on each result.
- Seed a starter catalog of ~120 common grocery staples (produce, dairy, meats, pantry, common store-brand packaged items) so search returns useful results instantly even offline from the API.
- Food calendar entries become editable: tap any logged item in the day sheet to change name, servings, macros, meal type, and time, or delete it. Changes update the day's totals and goal bars immediately.
- The day sheet groups entries into Morning / Afternoon / Evening (plus an "Untimed" group) using the logged time, matching how the planner's agenda already splits the day.

## 2. Food-feel and symptom tracking with patterns

- After logging a meal (and from any calendar entry) you can record how it felt: an energy rating, plus tags for bloating, nausea, heartburn, gas, sluggish, satisfied, focused, headache, cravings — with an optional note and a "how long after" timing.
- A "How foods feel" view lists your foods ranked by how they tend to feel: foods that consistently give energy vs. foods that consistently drain or upset you, with the number of observations so single bad days don't dominate.
- Pattern cards call out repeat offenders and reliable winners in plain descriptive language ("Dairy-heavy meals were followed by bloating 4 of 5 times"). No diagnoses — observations only.
- Feel data also feeds the Insights tab as a new section.

## 3. Cycle integrated into the nutrition profile

- Reuse the existing cycle engine (phase, cycle day, predicted next period) so WellFlow knows the current phase without duplicating any data entry.
- The Today tab shows a phase strip: current phase, day, and a short nourishment focus for that phase (for example iron-rich and warming foods during menstrual days, lighter fresh foods in follicular, magnesium and steady carbs in luteal).
- Phase-aware food suggestions appear in Suggested Meals, drawn from a curated food list per phase, with a one-tap add to the grocery list.
- Insights gains a by-phase breakdown: average calories, protein, water, energy check-ins, and the most common food-feel symptoms per cycle phase, so patterns across cycles become visible.
- Everything here is general nourishment information, not medical advice; the strip carries that note.

## 4. Diet-style plans and daily recommendations

- A new Plan screen at /wellflow/plan where you pick a style: Balanced, Keto, Low-carb / Atkins, GLP-1 friendly, Weight Watchers style (points-like portions), High protein, or Custom.
- Choosing a style proposes daily targets (calories and macro split) based on your current weight, goal weight, and a pace you choose (gentle / steady). You review and can edit every number before it is applied to your goals, so the rings and goal bars follow the plan.
- Each style gets a day-structure suggestion: sample meal shapes per slot, foods to lean on, foods that tend to fight the style, and a short list of gentle movement suggestions (walks, strength, mobility) with a weekly rhythm.
- A plan progress card shows adherence over the last 7 and 30 days: days targets were met, average macros vs. plan, and weight trend as a descriptive line.
- The plan never guarantees results, never touches medication dosing, and always presents targets as editable suggestions.

## Technical notes

- New private, owner-scoped tables: `food_feel_logs` (entry reference, rating, symptom tags, note, timing) and `wellflow_plans` (style, targets, pace, active flag). Both with row-level security limiting access to the owner, plus the standard grants and timestamps.
- New modules: `src/lib/wellflow/food-catalog.ts` (seeded staples + store brand tagging), `src/lib/wellflow/food-feel.ts`, `src/lib/wellflow/cycle-nutrition.ts`, `src/lib/wellflow/diet-plans.ts` (style definitions, target math, adherence).
- Edited: `food-search` edge function (store filter + brand normalization), `FoodCalendar.tsx` (edit + time-of-day grouping), `FoodLibrary.tsx` and `FoodDetailsSheet.tsx` (store filter/badges), `LogFoodSheet.tsx` (feel prompt), `TodayTab.tsx` (phase strip, plan card), `InsightsTab.tsx` + `InsightsCharts.tsx` (feel and phase sections), `SuggestedMeals.tsx` (phase suggestions), `WellFlow.tsx` and nav (Plan route).
- Mobile pass across WellFlow: larger tap targets, sheet-based editing instead of dialogs on small screens, horizontally scrollable tab and filter rows, sticky day-total header in the calendar sheet, and safe-area padding above the bottom bar.
