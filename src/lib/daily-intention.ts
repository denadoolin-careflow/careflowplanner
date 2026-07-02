/**
 * Local (per-device) daily intention persistence.
 * A single line of intent per calendar day for the Today dashboard.
 */
const KEY = (iso: string) => `careflow:intention:${iso}`;

export function getIntention(iso: string): string {
  try { return localStorage.getItem(KEY(iso)) ?? ""; } catch { return ""; }
}

export function setIntention(iso: string, text: string) {
  try {
    if (text.trim()) localStorage.setItem(KEY(iso), text);
    else localStorage.removeItem(KEY(iso));
    window.dispatchEvent(new CustomEvent("careflow:intention", { detail: { iso } }));
  } catch {/* noop */}
}