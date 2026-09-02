# WellFlow: charts, goals, food database and a food calendar

## 1. Interactive Insights charts

Replace the static number tiles in the Insights tab with charts you can explore.

- Range control: 30 / 60 / 90 days (existing) plus a custom start/end date picker.
- Chart 1 — daily line/area of calories, protein and water over the range, with injection days marked; tap or hover a point to see that day's exact values.
- Chart 2 — grouped bars comparing injection days vs other days for calories, protein, water, fiber and energy, with the exact averages and the day counts labelled.
- Chart 3 — "days since injection" curve (day 0 through day 6) with a tooltip showing the average and how many days went into it.
- A metric toggle so one chart can be focused on a single measure.
- All wording stays descriptive: patterns from your own log, no diagnosis, no dose guidance, no outcome promises.

## 2. Nutrition goal settings screen

A goals editor already exists for calories, protein, carbs, fat, fiber and water, but every target is currently empty, so the goal bars have nothing to fill against.

- Promote it into a proper full screen at `/wellflow/goals`, reachable from the tab bar overflow and from a "Set goals" button anywhere a goal bar has no target.
- Add starting weight / goal weight alongside the macros, plus quick presets (e.g. a balanced or higher-protein split) that fill the fields for you and can then be edited.
- Live validation per field, save on blur, and instant refresh of every ring and goal bar across Today, Food and Progress.
- Keep the note that these targets are yours to choose and that dose or medical questions belong with your care team.

## 3. Inline editing for logged meals

- Each logged meal row in the food library and in the Today/Food timelines gets an inline expand: change servings, portion text and each macro without leaving the list.
- A servings stepper rescales macros automatically; any macro can still be overridden by hand.
- Saving updates the day's totals, rings and goal bars immediately.
- Swipe/overflow actions for duplicate to another meal slot and delete.

## 4. Full food database and library

- A single search surface across your saved foods, Open Food Facts and AI description parsing, with brand, serving size and full macros on every result.
- Barcode scanning stays available and now saves the scanned item into your library with its barcode.
- Each packaged item gets a details view: full nutrition, serving options, the Open Food Facts source link, and "buy at" links built from your existing grocery store preference (preferred and backup retailer) so you can jump to that item at your store.
- Add-to-grocery-list from any food, reusing the existing pantry/list de-duplication.
- Library management: favorites, recently logged, edit, delete, and manual "create a food" entry.
- Note: the food search function is currently returning a network error in the preview. Diagnosing and redeploying it is the first step of this section, before the new UI is built on top.

## 5. Food calendar

- New `/wellflow/calendar` view: a month grid where each day shows what was logged — a small macro dot/bar plus totals, and markers for injection, water and weight entries.
- Tap a day to open a sheet with that day's meals by slot, totals against your goals, and edit/delete on each entry.
- Week strip on mobile for quick scrolling, and a "jump to today" control.
- Days with no logs read as calm and empty rather than as failures.

## Technical notes

- Charts use Recharts (already used in ProgressTab) inside a new `InsightsCharts` component fed by the existing `fetchInsights` / `useInsights` module; `insights.ts` gains an explicit date-range variant alongside the 30/60/90 windows.
- Goals screen reuses `GoalsEditor` and the `nutrition_goals` table plus the existing WellFlow event bus so rings and bars re-render on save.
- Inline meal editing uses `updateFoodEntry`; library editing uses `updateSavedFood` / `createSavedFood`. No new tables are required for sections 1-3.
- Store links reuse `src/lib/retailer-links.ts` and `grocery_prefs`; grocery pushes reuse the meal-plan/pantry de-duplication helpers.
- `custom_foods` gains optional columns for source URL, image and last-used serving so library items can round-trip; a migration will be proposed for approval when that step is reached.
- Calendar reads `food_entries`, `water_entries`, `weight_logs` and `glp1_injections` for the visible month in one batched fetch.
- Everything stays owner-scoped and private under existing row-level rules.
