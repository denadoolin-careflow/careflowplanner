# Food library: bulk import, smarter search, preferred store

Make the WellFlow food library faster to fill and easier to search: import shelves of popular foods in one pass, tune portions inline, get results as you type, sort them how you want, and default the store filter to your preferred grocer.

## 1. Bulk add from diet/store shelves

- New "Bulk add" mode in the food library. Turn it on and every shelf row (diet shelf, store shelf, and search results) gets a checkbox, plus "Select all" and a running count.
- Sticky bottom bar: "Add N to library" and "Clear".
- Before importing, a review step lists each picked food with an editable serving size and servings multiplier; changing servings scales calories and macros so the saved entry matches the portion you actually eat.
- Import writes all picks to your saved foods in one batch, skipping ones already in your library (same name + brand), and reports "Added 12, skipped 3 already saved".
- When no diet tag is picked but a store is, show that store's staple shelf so there is always something to import.

## 2. Inline portion editing in your library

- Each saved-food row gets a compact portion editor: tap the serving text to edit serving size, or use a small stepper (0.5x / 1x / 1.5x / 2x plus a free number) that rescales calories and macros and saves immediately.
- Full macro editing stays available through the existing edit dialog.

## 3. Search that loads correct foods while typing

- Live search: typing 2+ characters runs a debounced (~350 ms) search automatically — your library first, then the built-in grocery catalog, then Open Food Facts — with results merged and deduplicated. The manual search button stays for explicit re-runs.
- Stale-response guard so a slower earlier request can never overwrite newer results.
- Relevance ranking: exact name matches, then name-prefix, then word matches, then brand/category matches — so "yogurt" leads with yogurts instead of yogurt-flavored items.
- Loading skeleton rows, an empty state with next steps ("describe it instead", "add by hand"), and the existing offline notice when the online lookup is unavailable.

## 4. Sort filter for search results

- A sort control next to the filter chips, persisted per user in local settings: Best match (default), Name A–Z, Calories low→high, Calories high→low, Protein high→low, Fiber high→low, Carbs low→high.
- Sorting applies to search results, diet shelves, store shelves, and your saved library list.

## 5. Preferred store

- Reuse the existing grocery preference (Settings → Grocery preferences) as the default store filter in the food library: on load, the chip for your preferred store is selected when it maps to a catalog grocer.
- Add a "Set as preferred store" action on the store chip row so you can change it without leaving WellFlow; it writes back to the same shared preference.
- Stores in the catalog that have no matching retailer entry stay selectable but simply do not change the saved preference.

## Recommended food library improvements (included)

- Recents and Favorites tabs alongside search, with one-tap "Log again".
- Group your library by category (Produce, Dairy & eggs, Meat & seafood, Pantry, Snacks) with collapsible sections.
- Duplicate detection when saving a food that already exists, offering "Update existing" instead of a second copy.
- Per-food default serving so logging uses your normal portion without editing.
- Mobile polish: larger tap targets, sticky search bar, swipe-free explicit action buttons.

## Technical notes

- `src/lib/wellflow/food-catalog.ts`: add `rankCatalog` scoring, `storeShelf` usage for empty diet state, and a `SORT_OPTIONS` comparator map shared by shelves and results.
- `src/lib/wellflow/data.ts`: add `createSavedFoods(batch)` for one round-trip inserts into `custom_foods` plus an existing-name lookup for skip/update, and `setSavedFoodPortion(id, servingSize, scale)`.
- `src/components/wellflow/FoodLibrary.tsx`: bulk-select state, sticky action bar, review dialog, debounce + request-token search, sort select, tabs for Search / Recents / Favorites / My foods.
- Preferred store: read/write through `useGroceryPrefs` (`src/lib/grocery-prefs.ts`) with a mapping between `Retailer` ids and catalog `Store` names; no schema change needed.
- Sort choice persisted in `localStorage` under a `wellflow.library.sort` key.
- No new tables. All food data stays owner-scoped and private; nutrition figures remain editable estimates, not medical advice.
