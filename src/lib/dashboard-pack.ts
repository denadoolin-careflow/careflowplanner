import type { GridItem } from "@/lib/dashboard-layouts";

/**
 * Pack widgets left-to-right, top-to-bottom into a grid with the given column
 * count. Preserves the existing reading order (by y then x), clamps widths to
 * fit cols, and produces a tightly-packed layout with no gaps.
 */
export function compactLayout(items: GridItem[], cols: number): GridItem[] {
  if (items.length === 0) return [];
  const sorted = items.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
  // Row occupancy: for each column, the next free row.
  const colTops = new Array<number>(cols).fill(0);
  const out: GridItem[] = [];
  for (const it of sorted) {
    const w = Math.min(Math.max(1, it.w), cols);
    const h = Math.max(1, it.h);
    // Find the leftmost x where w consecutive columns share the lowest top.
    let bestX = 0;
    let bestY = Infinity;
    for (let x = 0; x <= cols - w; x++) {
      let y = 0;
      for (let dx = 0; dx < w; dx++) y = Math.max(y, colTops[x + dx]);
      if (y < bestY) { bestY = y; bestX = x; }
    }
    out.push({ ...it, x: bestX, y: bestY, w, h });
    for (let dx = 0; dx < w; dx++) colTops[bestX + dx] = bestY + h;
  }
  return out;
}
