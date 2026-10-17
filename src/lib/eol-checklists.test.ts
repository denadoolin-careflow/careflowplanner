import { describe, it, expect } from "vitest";
import { seedRows, progress, EOL_DEFAULTS } from "./eol-checklists";

describe("eol checklists", () => {
  it("seeds every default item unchecked for the person", () => {
    const rows = seedRows("p1");
    expect(rows).toHaveLength(EOL_DEFAULTS.length);
    expect(rows.every((r) => r.recipient_id === "p1" && !r.done)).toBe(true);
  });
  it("counts progress", () => {
    expect(progress([{ done: true }, { done: false }, { done: false }, { done: true }])).toEqual({ done: 2, total: 4, pct: 50 });
    expect(progress([]).pct).toBe(0);
  });
});
