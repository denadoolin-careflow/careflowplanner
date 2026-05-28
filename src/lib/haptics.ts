// Tiny wrapper around the Vibration API. No-op on unsupported devices.
const PREF_KEY = "careflow:haptics";

export function isHapticsEnabled(): boolean {
  try {
    const v = localStorage.getItem(PREF_KEY);
    return v === null ? true : v === "1";
  } catch { return true; }
}
export function setHapticsEnabled(on: boolean) {
  try { localStorage.setItem(PREF_KEY, on ? "1" : "0"); } catch { /* */ }
  try { window.dispatchEvent(new CustomEvent("careflow:haptics-change")); } catch { /* */ }
}

function vibrate(pattern: number | number[]) {
  try {
    if (!isHapticsEnabled()) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      (navigator as any).vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

export const haptics = {
  tap: () => vibrate(8),
  pickup: () => vibrate(14),
  snap: () => vibrate(6),
  delete: () => vibrate([10, 30, 10, 30]),
  magnet: () => vibrate([4, 16]),
  // Stronger, distinctive pulse to confirm a long-press has armed drag mode.
  longPress: () => vibrate([12, 40, 28]),
  // Confirms a successful drop after dragging — chunky and satisfying.
  drop: () => vibrate([18, 40, 24]),
  // Soft three-tap success bloom (e.g. completed task, AI generated).
  success: () => vibrate([10, 30, 10, 30, 18]),
  // Two short bursts to signal a soft warning / undo.
  warning: () => vibrate([24, 50, 24]),
  // A featherlight tick for swipe gestures and tab switches.
  swipe: () => vibrate(4),
};

/**
 * Install a global, low-cost haptic on tap for common interactive elements.
 * Fires once per gesture (pointerup), respects the user pref, and is throttled
 * so rapid taps don't stack into a buzz.
 */
const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "[role=button]",
  "[role=tab]",
  "[role=menuitem]",
  "[role=option]",
  "[role=switch]",
  "[role=checkbox]",
  "[role=radio]",
  "input[type=checkbox]",
  "input[type=radio]",
  "summary",
  "label",
  "[data-haptic]",
].join(",");

let installed = false;
let lastTs = 0;
export function installGlobalHaptics() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const handler = (e: Event) => {
    if (!isHapticsEnabled()) return;
    const target = e.target as Element | null;
    if (!target || target.nodeType !== 1) return;
    // Skip disabled controls
    const closest = target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
    if (!closest) return;
    if (closest.matches?.("[disabled], [aria-disabled=true]")) return;
    // Skip if author already opted out
    if (closest.dataset.noHaptic !== undefined) return;
    const now = performance.now();
    if (now - lastTs < 40) return; // throttle bursts
    lastTs = now;
    // Use the variant specified, default to tap
    const variant = closest.dataset.haptic as keyof typeof haptics | undefined;
    const fn = (variant && haptics[variant]) || haptics.tap;
    try { (fn as () => void)(); } catch { /* */ }
  };
  // pointerup fires on both touch and mouse, after the gesture, so it feels
  // tactile without firing on every move.
  window.addEventListener("pointerup", handler, { passive: true, capture: true });
}