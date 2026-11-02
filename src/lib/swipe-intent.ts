/**
 * One rule for every "flick to move" gesture in the app (week strip, month
 * grid, bottom bar): a sideways thumb-drag made while typing or scrolling must
 * NOT change the date or the page. Only a long, flat, quick flick counts.
 *
 * A gesture is deliberate when it is:
 *  - long enough horizontally (minPx),
 *  - clearly sideways rather than up/down (horizontal dominance + maxVertical),
 *  - and quick (a press-and-drag or a slow thumb-slide is not a flick).
 */
export type SwipeIntentOptions = {
  /** Minimum horizontal travel in CSS pixels. */
  minPx?: number;
  /** How much wider than tall the drag must be (e.g. 3 = at most 1/3 vertical). */
  ratio?: number;
  /** Hard cap on vertical drift — anything steeper reads as scrolling. */
  maxVertical?: number;
  /** A gesture held longer than this is a press, not a flick. */
  maxMs?: number;
};

const DEFAULTS: Required<SwipeIntentOptions> = {
  minPx: 100,
  ratio: 3,
  maxVertical: 30,
  maxMs: 700,
};

export function isDeliberateSwipe(
  dx: number,
  dy: number,
  elapsedMs: number,
  options: SwipeIntentOptions = {},
): boolean {
  const { minPx, ratio, maxVertical, maxMs } = { ...DEFAULTS, ...options };
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (elapsedMs > maxMs) return false;
  if (ax < minPx) return false;
  if (ay > maxVertical) return false;
  if (ax < ay * ratio) return false;
  return true;
}

/**
 * Axis lock for the middle of a gesture: once a drag has clearly gone
 * up/down first, it is a scroll or a typo and must never be revived as a
 * swipe at the end.
 */
export function swipeAxisCancelled(dx: number, dy: number, lockPx = 18): boolean {
  const ay = Math.abs(dy);
  return ay > lockPx && ay > Math.abs(dx);
}
