# Log food on any day, a bigger food library, and a health journal

## What you'll get

**Log food from the calendar**
- Every day cell gets a "+" affordance, and the day sheet opens with a prominent **Log food** button that logs to that date (not today).
- Inside the day sheet, each section — Morning, Afternoon, Evening, No time set — has its own inline "Add food here" row. Choosing a section pre-fills a sensible time (Morning 08:00, Afternoon 13:00, Evening 18:30) and meal type, which you can still change before saving.
- A quick inline add bar at the top of the sheet logs to the whole day without a time, so entries land in "No time set".
- The inline add is a compact search field: type, pick a result, adjust servings, save — without leaving the day sheet. A "More options" link opens the full log sheet for that same date and section.

**A much bigger, more searchable ingredient library**
- Expand the built-in catalog from ~126 items to a broad ingredient-level set (roughly 450+): raw proteins, produce, grains, legumes, nuts/seeds, oils and fats, dairy, condiments, spices/sauces, baking staples, beverages, frozen and canned goods, plus common restaurant and store-brand items.
- Each entry keeps typical label values for one common serving, editable before logging.

**Better search results**
- Token-based matching (all typed words must match somewhere) instead of single-substring matching, so "chicken breast grilled" and "grill chicken" both work.
- Synonym and plural handling ("shrimp/prawn", "garbanzo/chickpea", "soda/pop", "yoghurt/yogurt", trailing "s"/"es").
- Ranking that favors exact name start, whole-word matches, shorter/simpler names, your own saved foods, and previously logged items — before generic packaged results.
- Catalog results appear instantly as you type, with Open Food Facts results merged in when they arrive; duplicates (same name+brand or same barcode) are collapsed.
- Applies in both the food library screen and the log-food search field.

**Health journal on the food calendar**
- A daily health journal entry: how you felt, energy, mood, symptoms noted in your own words, plus optional tags.
- Written and edited from the day sheet on the food calendar, and from Today.
- Days with a journal entry show a distinct dot in the calendar grid, with a legend item.
- Descriptive only — no diagnosis, no dose guidance, no outcome promises. Private to your account.

## Technical notes

- **New table `wellflow_journal`** (private, owner-scoped): `user_id`, `date` (unique per user), `entry` text, `mood` smallint, `energy` smallint, `tags` text[], timestamps + update trigger. Full grant block for `authenticated`/`service_role`, RLS enabled, all four policies scoped to `auth.uid()`. No `anon` grant.
- **`src/lib/wellflow/journal.ts`**: `useHealthJournal(date)`, `useJournalDates(from,to)` for calendar dots, `saveJournal`, `deleteJournal`; emits the existing `emitWellflow` channel so views refresh.
- **`src/lib/wellflow/food-catalog.ts`**: add the expanded `ROWS`, a `SYNONYMS` map, `normalizeTerm()`, and rewrite `searchCatalog`/`relevance`/`rankByRelevance` for token matching and the new ranking. Keep existing exports and signatures so `FoodLibrary` and `LogFoodSheet` keep working.
- **`src/lib/wellflow/data.ts`**: `searchFoods` gains a catalog-first merge + dedupe path; existing edge-function call stays as the remote source.
- **`FoodCalendar.tsx`**: day cells get an add affordance; `DaySheet` gains section-level `InlineAddFood` rows, a whole-day add bar, and a `HealthJournalBlock`; `useMonthData` also fetches journal dates for the new dot.
- **New components**: `src/components/wellflow/InlineAddFood.tsx`, `src/components/wellflow/HealthJournalCard.tsx`.
- `LogFoodSheet` already accepts a `date`; it will also accept optional `defaultTime`/`defaultMeal` for the section handoff.
- Verify with a type-check and an authenticated browser pass over `/wellflow/calendar` and `/wellflow/food`.
