/**
 * Shared planner grid metrics.
 *
 * Both the timeline blocks and the unscheduled task rows/rails use these so a
 * scheduled block always snaps onto the same baseline grid as an unscheduled
 * row — alignment stays consistent while dragging.
 */
export const PLANNER_START_H = 5;
export const PLANNER_END_H = 22;
/** Pixel height of one hour on the grid. */
export const HOUR_PX = 80;
/** Snap granularity in minutes. */
export const SNAP_MIN = 15;
/** Pixel height of a single snap slot (15 min → 20px). */
export const SLOT_PX = (HOUR_PX * SNAP_MIN) / 60;
/** Height of one unscheduled task row — exactly two snap slots. */
export const ROW_PX = SLOT_PX * 2;

export const PX_PER_MIN = HOUR_PX / 60;

/** Minutes (relative to grid start) → pixels. */
export const minToPx = (min: number) => min * PX_PER_MIN;

/** Snap an arbitrary minute value onto the shared slot grid. */
export const snapMinutes = (min: number) => Math.round(min / SNAP_MIN) * SNAP_MIN;

/** Snap a pixel offset onto the shared row baseline. */
export const snapPx = (px: number) => Math.round(px / SLOT_PX) * SLOT_PX;