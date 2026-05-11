// Tiny wrapper around the Vibration API. No-op on unsupported devices.
function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

export const haptics = {
  tap: () => vibrate(8),
  pickup: () => vibrate(14),
  snap: () => vibrate([6, 24, 10]),
  delete: () => vibrate([10, 30, 10, 30]),
};