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
  amazon_fresh: (q) => `https://www.amazon.com/alm/storefront?almBrandId=QW1hem9uIEZyZXNo&fs=true&k=${encodeURIComponent(q)}`,
  target:       (q) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
  costco:       (q) => `https://www.costco.com/CatalogSearch?dept=All&keyword=${encodeURIComponent(q)}`,
  sams_club:    (q) => `https://www.samsclub.com/s/${encodeURIComponent(q)}`,
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

export function retailerSearchUrl(r: Retailer, items: string[]): string {
  const q = items.slice(0, 8).join(" ");
  return URLS[r](q || "groceries");
}