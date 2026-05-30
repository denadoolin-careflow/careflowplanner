/**
 * Stub deep-links for grocery retailers. These do not require API keys —
 * they simply open the retailer's website with a pre-filled search query.
 */
export type Retailer = "instacart" | "walmart" | "kroger";

const URLS: Record<Retailer, (q: string) => string> = {
  instacart: (q) => `https://www.instacart.com/store/s?k=${encodeURIComponent(q)}`,
  walmart:   (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
  kroger:    (q) => `https://www.kroger.com/search?query=${encodeURIComponent(q)}`,
};

export const RETAILER_LABEL: Record<Retailer, string> = {
  instacart: "Instacart",
  walmart: "Walmart",
  kroger: "Kroger",
};

export function retailerSearchUrl(r: Retailer, items: string[]): string {
  const q = items.slice(0, 8).join(" ");
  return URLS[r](q || "groceries");
}