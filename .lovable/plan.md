
## Goal

Turn the existing pantry into a full **Home Inventory** organized by storage location (Fridge, Freezer, Pantry, Cabinets, Other), seed it with typical staples, add a **Weekly Restock** list of items you always rebuy, fix mobile wrapping on the grocery list, and wire everything into the Meals plan + Weekly Reset.

## What you get

1. **Inventory by location** — Fridge / Freezer / Pantry / Cabinets / Other tabs. Each item has stock status (In / Low / Need soon / Out), qty, and notes. DnD between locations and between status columns; click any item to edit inline (name, qty, location, status, restock toggle).
2. **Static starter library** — one-tap "Seed common items" populates each location with typical staples (eggs, milk, butter in Fridge; frozen veg in Freezer; rice/pasta/canned beans in Pantry; oil/spices in Cabinets). Editable afterward; nothing is locked.
3. **Weekly Restock list** — mark any inventory item as "Restock weekly" (or bi-weekly). Every Monday (or on reset), items marked restock that are Low/Out are auto-added to the grocery list with a `restock` tag. A dedicated **Restock** panel in Meals shows what's queued for the week with one-click "Add all to grocery list".
4. **Meal plan connection** — when a meal is planned, ingredients already In-stock in Inventory are skipped on the grocery list (existing behavior, kept). Newly bought grocery items can be "Send to Inventory" → moves to the right location with In-stock status.
5. **Mobile grocery list polish** — wrap long item names instead of truncating, larger tap targets (44px), full-width chips, status pill below name on narrow screens, swipe-to-delete preserved.
6. **Weekly Reset hook** — the existing Reset section gets an "Inventory check" step: opens a quick sweep of Restock items to mark Low/Out before generating the new grocery list.

## Where it lives

- **Pantry page** (`/pantry`) becomes **Inventory** with 5 location tabs + a Restock tab. Existing Kanban/List toggle stays.
- **Meals page** grocery section gets a small "Restock this week" strip above the Kanban.
- **Reset page** gets a new "Inventory check" checklist item.
- Sidebar entry renamed Pantry → **Inventory**.

## Technical notes

- Migration on `pantry_items`: add `location text` (Fridge|Freezer|Pantry|Cabinets|Other, default 'Pantry'), `restock_cadence text` (none|weekly|biweekly, default 'none'), `last_restocked_at timestamptz`, `notes text`. Backfill existing rows: map current `category` → `location` heuristically (Fridge/Dairy/Meat → Fridge; Frozen → Freezer; everything else → Pantry).
- New `src/lib/inventory-seed.ts` with the static starter lists per location.
- New `src/lib/inventory-restock.ts`:
  - `getDueRestockItems(userId)` — restock items that are Low/Out and not already on grocery list.
  - `addRestockToGrocery(userId)` — bulk insert into `grocery_items` with `tags: ['restock']`, dedupe by name.
  - `runWeeklyRestock(userId)` — called from Reset and from a "Run now" button.
- Refactor `PantryPanel` / `PantryKanban` to read/write `location` and `restock_cadence`. Add a `LocationTabs` wrapper component.
- New `RestockPanel.tsx` component used in both Inventory page and Meals grocery section.
- `GroceryList.tsx` + `GroceryKanban.tsx` mobile pass: replace `truncate` with `break-words` + `whitespace-normal` on item names, bump row min-height to `min-h-11`, stack metadata on `<sm` screens, ensure ShopMenu button hits 44px.
- Add `restock` chip styling in `pantry-colors.ts`.
- Reset checklist: add a new built-in item "Inventory check" that deep-links to `/pantry?tab=restock`.

## Out of scope (call out if you want these)

- Barcode scanning, expiry-date tracking, receipts OCR.
- Household-shared inventory sync (currently per-user).
- Smart suggestions ("you usually buy X every 9 days") — could be a v2.

## Open question

Do you want **one global restock list** (simplest) or **per-location restock sub-lists** (Fridge restock vs Pantry restock)? I'll default to one global list grouped by location unless you say otherwise.
