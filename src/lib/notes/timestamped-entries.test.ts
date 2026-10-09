import { describe, it, expect } from "vitest";
import { appendTimestampedEntry, timestampedEntries, moveTimestampedEntry, editEntryTimestamp } from "./timestamped-entries";

describe("daily notebook timestamp entries", () => {
  const body = "# Daily reflection\n\n- 8:30 AM — First **thought**\n\n### 9:45 PM\n\nSecond thought\n\n- Nested detail\n";
  it("recognises old captures and rich new sections", () => {
    expect(timestampedEntries(body).map(e => e.time)).toEqual(["8:30 AM", "9:45 PM"]);
  });
  it("moves complete entries including rich content without losing the preamble", () => {
    const moved = moveTimestampedEntry(body, 1, -1);
    expect(moved.startsWith("# Daily reflection\n\n### 9:45 PM")).toBe(true);
    expect(moved).toContain("Second thought\n\n- Nested detail");
    expect(moved).toContain("First **thought**");
    expect(moveTimestampedEntry(body, 0, -1)).toBe(body);
  });
  it("edits only the timestamp", () => {
    expect(editEntryTimestamp(body, 0, "10:15 AM")).toContain("- 10:15 AM — First **thought**");
    expect(editEntryTimestamp(body, 0, "bad")).toBe(body);
  });
  it("appends formatted multiline reflections", () => {
    const next = appendTimestampedEntry(body, "A reflection\n\n**Grateful** today", "10:00 PM");
    expect(timestampedEntries(next)).toHaveLength(3);
    expect(next).toContain("### 10:00 PM\n\nA reflection\n\n**Grateful** today");
  });
});