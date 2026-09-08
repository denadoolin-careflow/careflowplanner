# Prices on the grocery list

Show what each item is likely to cost at your preferred store, add a running trip total, and tell you whether your backup store would be cheaper.

## How prices work

Two layers, combined:

1. **Estimate (instant)** — a built-in table of typical US prices for common grocery items (produce, dairy, protein, pantry, etc.), matched by name with the same fuzzy matching the food library already uses. Each store gets a price factor (for example warehouse and supercenter stores lower, specialty stores higher), so the shown price reflects your preferred store.
2. **Your own price (wins)** — tap the price to type the real one. It is saved for that item at that store and reused from then on, replacing the estimate. Saved prices show plainly; estimates show with a "~".

Prices are always labeled as estimates until you confirm one, so nothing looks more precise than it is.

## What you'll see

- **Grocery list** — a small price on each item row, tappable to edit. Quantity is multiplied in when the item has one.
- **Trip total** — an estimated basket total for unbought items at your preferred store, in the list header, with a note of how many are estimates vs. your saved prices.
- **Store comparison** — a line comparing preferred vs. backup store totals ("Kroger ~$84 · Walmart ~$77 — about $7 less"), shown only when a backup store is set.
- **Today** — the grocery card on Today shows the same per-item price and a compact total.

## Technical notes

- New `src/lib/grocery-prices.ts`: a seeded price catalog (name/unit/base price/category), store price factors keyed by the existing `Retailer` type, name normalization + fuzzy match reusing the catalog matcher patterns in `src/lib/wellflow/food-catalog.ts`, and `estimatePrice(name, qty, store)` / `basketTotal(items, store)` helpers.
- New private table `grocery_price_overrides` (`user_id`, normalized `item_key`, `store`, `price_cents`, timestamps) with RLS owner policies, explicit GRANTs to `authenticated`/`service_role`, unique index on (`user_id`,`item_key`,`store`), and an update trigger. A `useGroceryPrices()` hook loads the user's overrides once and exposes an upsert.
- `src/components/meals/GroceryList.tsx`: price cell per row (inline edit like the existing name/qty edit pattern), header total and comparison line, reading the preferred/backup store from `useGroceryPrefs()`.
- `src/components/today/widgets/GroceryWidget.tsx` and the Today grocery card: per-item price plus a compact estimated total.
- No retailer APIs or scraping; no keys required.
