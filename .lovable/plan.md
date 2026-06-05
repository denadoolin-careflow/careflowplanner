## Phase 1: Quick Fixes + Ecosystem Shell

Three fixes the user asked for now, plus the agreed Phase 1 ecosystem shell (rename + 6 dashboard cards).

---

### 1. Wrap text on inventory items

Today, `PantryKanban` and `PantryPanel` use `truncate` on the item name (e.g. `src/components/meals/PantryKanban.tsx:409, 411, 462` and `src/components/meals/PantryPanel.tsx:279, 359`), so long names like "Frozen Veggies, mixed family pack" get cut off.

- Replace `truncate` on the name span with wrap classes (`break-words leading-snug whitespace-normal`) and remove fixed widths on the row so the card grows in height instead of clipping.
- Keep the row's right-side action cluster aligned to the top so the wrapped title flows underneath.
- Same treatment on the subtitle line (qty + unit).

### 2. Save Kroger as preferred store (global default)

- Change `DEFAULT_GROCERY_PREFS.preferred_store` from `"instacart"` to `"kroger"` in `src/lib/grocery-prefs.ts` so new users default to Kroger.
- For the current user, set their saved preference to `kroger` (data update via insert/upsert into `grocery_prefs`).
- Add a "Preferred store" selector in Settings → Household/Grocery (uses `RETAILERS` from `src/lib/retailer-links.ts`), so the user can change it later.
- `ShopMenu` and `RestockPanel` already read `useGroceryPrefs()`, so they will automatically prefer Kroger links once this lands. No per-item override in this phase.

### 3. Full-page Grocery List under HomeFlow

- Add a new route `/home/groceries` in `src/App.tsx` rendering a new page `src/pages/HomeGroceries.tsx`.
- The page reuses the existing `GroceryList` component (`src/components/meals/GroceryList.tsx`) but as the primary surface — full width, sections (Produce / Dairy / Frozen / Pantry / Household / Pets), header with item counts and "Open in Kroger" action sourced from `useGroceryPrefs`.
- Fix wrap on grocery rows: in `GroceryList.tsx` the item name span currently relies on default flex behavior and uses `truncate` on adjacent badges (line 201). Update the name to `break-words whitespace-normal leading-snug` and remove flex `min-w-0`/truncate that clips it; keep checkbox + actions top-aligned.
- Add a HomeHub entry point: a "Groceries" tile/link in the HomeHub dashboard that navigates to `/home/groceries`. (Not adding it as a HomeHub tab yet — keeping HomeHub tabs untouched.)

### 4. Ecosystem Phase 1 shell (no data wiring yet)

- Rename the existing Inventory page header to "Home Inventory" with subtitle "Know what you have, what you need, and what you can make." in `src/pages/Pantry.tsx`.
- Add an "Ecosystem health" row above the existing tabs, with 6 cards reading from already-available data where possible, placeholders otherwise:
  - Pantry Health (% in_stock from `pantry_items`)
  - Inventory Value (placeholder "—" for now)
  - Meals Available (count from `meals_library` matching pantry; placeholder "—" if too slow)
  - Restock Soon (count of `pantry_items` with `stock_status='low'`)
  - Expiring This Week (count of `pantry_items.expires_at` in next 7 days, if column exists; else hidden)
  - Grocery Budget (placeholder until budget wiring lands)
- Cards use existing atmosphere/semantic tokens (no new colors), live as a new `src/components/meals/EcosystemHealthCards.tsx`.

Explicitly **not** in this phase: ecosystem-wide tabs, automatic ingredient reservation, Dinner Tonight AI, Pantry Coach, budget projections, mobile bottom nav, recipe ↔ inventory linking. Those become later phases.

---

### Technical details

**Files to edit**
- `src/components/meals/PantryKanban.tsx` — replace `truncate` on name/subtitle with `break-words whitespace-normal leading-snug`; align actions `items-start`.
- `src/components/meals/PantryPanel.tsx` — same wrap treatment on item rows.
- `src/components/meals/GroceryList.tsx` — same wrap treatment on item name; keep badge truncation as-is.
- `src/lib/grocery-prefs.ts` — `DEFAULT_GROCERY_PREFS.preferred_store = "kroger"`.
- `src/pages/Settings.tsx` — add Preferred Store select bound to `useGroceryPrefs`.
- `src/pages/Pantry.tsx` — title/subtitle change + render `EcosystemHealthCards`.
- `src/pages/HomeHub.tsx` — add a Groceries link/tile in the dashboard view that routes to `/home/groceries`.
- `src/App.tsx` — register `/home/groceries`.

**Files to create**
- `src/pages/HomeGroceries.tsx` — full-page grocery list shell.
- `src/components/meals/EcosystemHealthCards.tsx` — 6-card health strip.

**Data**
- One-time upsert into `grocery_prefs` for the current user to set `preferred_store='kroger'`. No schema migration required (`grocery_prefs` already has those columns).

**Out of scope for this plan**
- The broader unified ecosystem rebuild (Meals ↔ Inventory ↔ Recipes ↔ Budget auto-flow, Kitchen Flow AI, mobile bottom nav). Tracked for a future phase.
