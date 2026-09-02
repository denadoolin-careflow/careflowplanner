# WellFlow round two — reminders, timing, meal planning, trends, export

Six upgrades to the WellFlow section, all built on the tables and hooks already in place.

## 1. Reminder scheduling UI

A new "Reminders" panel (reachable from the WellFlow header and from the GLP-1 tab) where you set:

- **Water** — on/off, a start and end time, and how often to nudge (e.g. every 2 hours).
- **Weight check-in** — on/off, days of the week, and a time.
- **Daily wellness check-in** — on/off and a time.
- **GLP-1 dose** — on/off, day of week (from your GLP-1 profile's injection day), time, and an optional "day before" heads-up.

Notifications use the app's existing reminder system, including its quiet-hours and permission handling. A single "Turn on notifications" button appears if permission hasn't been granted. Settings are per-user and saved to the backend so they follow you across devices. GLP-1 reminders only remind you of the schedule you entered — no dose is suggested or changed.

## 2. Time on food and injection logs

- The log-food sheet gains a time field (defaults to now, editable) so a meal can be logged later at the time you actually ate.
- The injection sheet gains a time field alongside the date.
- The Today timeline sorts by these real times and shows them.

## 3. Meals from the planner and meal plan

- In the log-food sheet, a new **From my plan** tab lists today's planned meals (from the meal planner) plus your meal library favorites. One tap logs a planned meal as a food entry, using saved nutrition when available, or an AI estimate you can review and edit before saving.
- Logging from a planned meal remembers the nutrition against that meal name, so the next time it's one tap with no estimating.

## 4. Meal recommendations and groceries

- A **Suggested meals** block in the Food tab recommends meals from your library and recent logs that fit the day's remaining calories and protein, with a short reason ("about 30g protein left today").
- Each suggestion can be **added to the meal plan** (picks a date and slot) or **logged now**.
- An **Add ingredients to groceries** action pushes a meal's ingredients onto your grocery list, skipping anything already in the pantry or already on the list — reusing the same rules the meal planner uses today.

## 5. Better food search and selection

- Debounced search that queries Open Food Facts, your custom foods, and your recent entries at once, with clearly labelled result groups and a "no results — describe it instead" path into the AI estimator.
- Results show calories and protein up front, remember the last serving you used for that food, and support quick serving multipliers (½, 1, 2).
- Multi-select: tick several foods and log them all at once to the same meal.

## 6. Goals editor: inline editing and live updates

- Goals become editable inline in the dialog with immediate validation (numeric, non-negative, sensible ranges) and per-field error text instead of a single toast.
- Saving updates the rings on Today, the goal bar on Progress, and the totals on Food instantly, without a reload — through the existing WellFlow event bus.
- A "reset field" control and clear "leave blank to skip" wording stay, along with the note that these are your own targets.

## 7. Trend summaries on Today

A compact strip under the rings with **7d / 30d** toggles showing:

- Average calories, protein, fiber, water per day.
- Days logged in the window.
- Weight change over the window with a small direction arrow.
- Injections logged in the window.

Each stat links into the matching tab. Copy stays neutral and descriptive.

## 8. Export for your care team

An **Export** button on the Progress tab offering:

- **CSV** — one file per data type (food, water, weight, injections, check-ins) or a combined zip-free multi-section CSV, over a chosen range (30d / 90d / all).
- **PDF report** — a clean one-to-two-page summary: date range, goals, average daily nutrition, weight start/current/change with the chart values as a table, injection history, and check-in averages. Footer notes it's a personal log, not a medical record.

## Technical notes

- New table `wellflow_reminders` (one row per user) holding the water/weight/check-in/GLP-1 schedule fields, with row-level security scoped to the owner and grants for authenticated. A small scheduler in `src/lib/wellflow/reminders.ts` computes the next fire times and hands them to `notifyReminder` from `src/lib/reminders.ts`, respecting quiet hours; it re-arms on load and after any settings change.
- `food_entries.logged_at` and `glp1_injections.time_of_day` already exist — the UI just needs to expose and use them.
- Planner meals come from the `meals` table (date + slot) and `meals_library`; grocery pushes reuse the pantry/dedupe logic in `addLibraryMealsToWeek` in `src/lib/meals-library.ts`, extracted into a shared helper.
- Remembered nutrition per meal name is stored in `custom_foods` (name + macros + serving), so no new table is needed.
- Goal reactivity uses the existing `emitWellflow` bus in `src/lib/wellflow/data.ts`; `useGoals` re-reads on that event.
- Trend math lives in `src/lib/wellflow/trends.ts` (pure functions over already-fetched entries) so it's testable and cheap.
- Export lives in `src/lib/wellflow/export.ts`: CSV via a small string builder and blob download (same pattern as `memories-export.ts`), PDF via the `jspdf` dependency already in the project.
- Search improvements are client-side plus the existing `food-search` edge function; AI estimation continues through `ai-food-parse` with review before save.
