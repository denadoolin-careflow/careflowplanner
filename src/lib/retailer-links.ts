/**
 * Stub deep-links for grocery retailers. These do not require API keys —
 * they simply open the retailer's website with a pre-filled search query.
 * Designed as a provider abstraction so real API integrations
 * (Instacart/Walmart/Kroger) can swap in without touching call sites.
 */
export type Retailer =
  | "instacart"
  | "walmart"
  | "kroger"
  | "amazon_fresh"
  | "target"
  | "costco"
  | "sams_club";

const URLS: Record<Retailer, (q: string) => string> = {
  instacart:    (q) => `https://www.instacart.com/store/s?k=${encodeURIComponent(q)}`,
  walmart:      (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
  kroger:       (q) => `https://www.kroger.com/search?query=${encodeURIComponent(q)}`,
  // Amazon Fresh: scope a normal product search to the Fresh storefront.
  amazon_fresh: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=amazonfresh`,
  target:       (q) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
  costco:       (q) => `https://www.costco.com/s?keyword=${encodeURIComponent(q)}`,
  sams_club:    (q) => `https://www.samsclub.com/search?q=${encodeURIComponent(q)}`,
};

export const RETAILER_LABEL: Record<Retailer, string> = {
  instacart:    "Instacart",
  walmart:      "Walmart",
  kroger:       "Kroger",
  amazon_fresh: "Amazon Fresh",
  target:       "Target",
  costco:       "Costco",
  sams_club:    "Sam's Club",
};

export const RETAILERS: Retailer[] = [
  "instacart", "walmart", "kroger", "amazon_fresh", "target", "costco", "sams_club",
];

/**
 * Build a retailer search URL.
 * - Single item → search that exact item.
 * - Multiple items → search the first item (most retailers don't support
 *   multi-item queries in a single URL; joining with spaces returns no results).
 */
export function retailerSearchUrl(r: Retailer, items: string[] | string): string {
  const arr = Array.isArray(items) ? items : [items];
  const cleaned = arr.map(s => String(s ?? "").trim()).filter(Boolean);
  const q = cleaned[0] || "groceries";
  return URLS[r](q);
}