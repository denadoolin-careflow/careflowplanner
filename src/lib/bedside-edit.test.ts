import { describe, it, expect } from "vitest";
import { fromLocalInput, toLocalInput } from "./bedside-edit";

describe("bedside edit times", () => {
  const now = new Date(2026, 9, 17, 12, 0);
  it("round-trips a local time", () => {
    const iso = new Date(2026, 9, 17, 8, 30).toISOString();
    expect(fromLocalInput(toLocalInput(iso), now)).toBe(iso);
  });
  it("rejects future times", () => {
    expect(fromLocalInput("2026-10-18T09:00", now)).toBeNull();
  });
  it("rejects empty values", () => {
    expect(fromLocalInput("", now)).toBeNull();
  });
});
