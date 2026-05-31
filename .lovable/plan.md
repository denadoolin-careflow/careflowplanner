## Goal
Turn the existing Meals/Pantry/Grocery surface into one connected system: ingredients are first-class, every ingredient can deep-link out to a preferred grocery store, the pantry has its own page with Kanban, and the grocery list is smarter and pantry-aware.

This builds on what already exists (`pantry_items`, `grocery_items`, `meals_library`, `IngredientPopover`, `GroceryKanban`, `GroceryList`, `retailer-links.ts`, `ai-meal-plan` edge fn). No legacy data is wiped.

## Scope (phased)

### Phase 1 — Ingredient & store foundation
- Extend `pantry_items` with: `unit text`, `price numeric`, `store_pref text`, `category` widened to enum-style (Produce/Dairy/Meat/Frozen/Pantry/Bakery/Household/Personal Care/Pet/Other). Status options stay 4-state: `in_stock | low | out | need_soon` (add `need_soon`).
- Add `grocery_prefs` table: `user_id pk`, `preferred_store text`, `backup_store text`, `delivery_mode text` (`delivery|pickup`).
- Expand `src/lib/retailer-links.ts`: add `amazon_fresh`, `target`, `costco`, `sams_club` URL builders + labels + small icon map.
- New helper `src/lib/grocery-prefs.ts` (hook + upsert).

### Phase 2 — Shop menu everywhere
- New `<ShopMenu ingredient="…" qty?="…">` dropdown (in `src/components/meals/ShopMenu.tsx`): "Shop on {preferredStore}" primary button + "More stores" submenu over all 7 retailers. Opens deep-link in new tab.
- Wire `ShopMenu` into:
  - `IngredientPopover` (replaces today's plain "Used in" block bottom action).
  - `RecipeDrawer` / `LibraryRecipeViewer` ingredient rows.
  - `GroceryList` row action (per item).
  - `GroceryKanban` card menu.
- Each ingredient row shows live pantry-status pill (color via `pantry-colors.ts`, extended for `need_soon`).

### Phase 3 — Pantry page & Kanban
- Promote pantry from a sidebar panel to its own route `/pantry` (re-use `PantryPanel` for List view).
- Add `src/components/meals/PantryKanban.tsx` with 4 columns (In Stock / Low / Out / Need Soon), `@dnd-kit` drag-and-drop between columns (writes `stock_status`), inline qty/unit edit, quick-add input.
- Add view switcher: List · Grid · Kanban (persist in localStorage).
- Add nav entry + link from Meals page header.

### Phase 4 — Smarter grocery list
- Auto-group by ingredient category (already partially done) and surface category headers consistently between Kanban and List.
- Add second Kanban view mode for grocery: Need · Shopping · Purchased · Stocked (state stored in `grocery_items.tags` — values `shopping`, `purchased`, `stocked`; "Need" is default). Reuse existing `GroceryKanban` shell.
- Pantry awareness when generating from meals (`addLibraryMealsToWeek` already filters `in_stock`; extend filter to skip `in_stock` + `need_soon`, and mark `low` items with a "low — top up?" badge instead of silently adding).
- Per-row Shop button uses preferred store.

### Phase 5 — AI grocery assistant
- New edge function `supabase/functions/ai-grocery-assistant/index.ts` (Gemini 3 Flash, structured output). Inputs: prompt + scheduled meals (next N days) + pantry snapshot + grocery list. Outputs: ordered actions (add items, suggest substitutes, mark stocked).
- Surface as a small "Ask" panel above grocery list with chip prompts: "Generate from meal plan", "What's missing for tonight?", "Use what I have", "Suggest substitutes".

### Phase 6 — Settings & dashboard widgets
- New `Settings → Grocery Preferences` section: preferred store, backup store, delivery vs pickup.
- New dashboard widgets (registered in `WidgetRegistry.tsx`, added to `dashboard-layouts.ts`):
  - `pantry-status` (counts per status + quick link).
  - `grocery-list-mini` (top 6 unbought items + add).
  - `low-stock` (items where `stock_status in (low, need_soon)`).
  - Reuse existing dinner/meal-plan widget for "Meal Plan".

### Phase 7 — Mobile polish
- Long-press on grocery/pantry rows → edit sheet (extend existing `long-press-drag`).
- Swipe-right to mark bought / swipe-left to delete (in `GroceryList`).
- Floating "+ Ingredient" FAB on `/pantry`.
- Haptics via existing `haptics.ts` on swipe complete.

## Technical notes
- Provider abstraction: every shop link goes through `retailerSearchUrl(provider, items)` so swapping in real Instacart/Walmart/Kroger APIs later is a single-file change.
- Stable IDs already in place (`pantry_items.id`, `grocery_items.id`, `meals_library.id`); no schema redesign needed for future API work.
- All new colors / status pills via tokens in `index.css` (add `--status-need-soon`); no hard-coded hex.
- RLS: new `grocery_prefs` follows `auth.uid() = user_id` pattern with `GRANT` for `authenticated` + `service_role`.

## Out of scope (for this pass)
- Real OAuth integrations with Instacart/Walmart/Kroger APIs (links only).
- Price tracking / receipts OCR.
- Multi-household shared grocery lists beyond what `household_users` already supports.
- Migrating `MobileTodayCard`-era legacy components.

## Suggested rollout order
1. Migration + `retailer-links` expansion + `grocery-prefs` + `ShopMenu` (everything visible immediately).
2. Pantry page + Kanban.
3. Grocery Kanban "Need/Shopping/Purchased/Stocked" mode + pantry-aware generator tweak.
4. AI assistant edge fn + chips.
5. Settings panel + 3 new widgets.
6. Mobile gestures pass.

Want me to build all 7 phases, or start with Phase 1–3 (shop links + pantry page + Kanban) and iterate?