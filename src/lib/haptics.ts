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
  snap: () => vibrate(6),
  delete: () => vibrate([10, 30, 10, 30]),
  magnet: () => vibrate([4, 16]),
  // Stronger, distinctive pulse to confirm a long-press has armed drag mode.
  longPress: () => vibrate([12, 40, 28]),
  // Confirms a successful drop after dragging — chunky and satisfying.
  drop: () => vibrate([18, 40, 24]),
};