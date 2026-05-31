## Problem

The "Shop" buttons next to grocery items (and the bulk Shop button) currently do nothing for most users. Two underlying causes:

1. **Pop-up blocked by browser.** The dropdown items in `ShopMenu` call `window.open(...)` from inside a Radix `DropdownMenuItem` `onClick`. Radix dispatches selection asynchronously, so Chrome/Safari frequently treat the call as non–user-initiated and silently block it. This is the most common reason "none of the links work".
2. **A few retailer search URLs are wrong or unreliable**, so even when the tab opens it lands on a homepage or 404 instead of the searched item.

Both issues live in two files:
- `src/lib/retailer-links.ts` — URL builders per retailer
- `src/components/meals/ShopMenu.tsx` — the dropdown / compact button used by `GroceryKanban`, `GroceryListMiniWidget`, and `WhatsForDinnerWidget`

## Fix

### 1. Render real anchor tags instead of `window.open`

Rewrite `ShopMenu` so every clickable shop target is an `<a href target="_blank" rel="noopener noreferrer">`:
- **Compact variant**: render the `Button` with `asChild` wrapping an `<a>` whose `href` is the preferred retailer URL.
- **Dropdown variant**: render each `DropdownMenuItem` with `asChild` wrapping an `<a>`. Keep `onClick` only for `stopPropagation` so parent rows don't toggle.

This guarantees the browser treats the click as a real user navigation and bypasses pop-up blockers.

### 2. Correct the retailer URL templates

Update `URLS` in `src/lib/retailer-links.ts` to known-good search endpoints:

| Retailer | New URL pattern |
|---|---|
| Instacart | `https://www.instacart.com/store/s?k={q}` (kept, but encode + sign as `%20`, not `+`) |
| Walmart | `https://www.walmart.com/search?q={q}` (unchanged) |
| Kroger | `https://www.kroger.com/search?query={q}` (unchanged) |
| Amazon Fresh | `https://www.amazon.com/s?k={q}&i=amazonfresh` (unchanged) |
| Target | `https://www.target.com/s?searchTerm={q}` (unchanged) |
| Costco | `https://www.costco.com/CatalogSearch?dept=All&keyword={q}` (fix — current `/s?keyword=` 404s) |
| Sam's Club | `https://www.samsclub.com/s/{q}` (fix — current `/search?q=` redirects to home) |

Keep the `retailerSearchUrl(r, items)` signature so call sites don't change.

### 3. Defensive cleanup

- When `items` is an array, still search just the first item (multi-item URLs are unsupported by every retailer above). Also trim trailing parenthetical notes like "(2 lbs)" before searching so the query matches product names better.
- Add `title` tooltips on all links so users see the destination.

## Out of scope

- No real API integrations (Instacart Connect, Kroger Partner API) — still URL-search deep links.
- No changes to retailer preferences UI in Settings or to grocery list data model.

## Verification

After the change, on `/index` and the Meals page:
1. Click the compact "Shop" button on a single grocery item → new tab opens on the preferred retailer's search results for that item.
2. Open the "Shop" dropdown on the bulk action → both the preferred store and every "More stores" entry open the correct retailer search in a new tab.
3. Costco and Sam's Club specifically land on a populated results page, not the homepage.
