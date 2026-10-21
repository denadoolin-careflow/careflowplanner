import { describe, expect, it } from "vitest";
import { taskPatchTo } from "@/lib/store";

describe("task goal links", () => {
  it("saves the selected goal without changing other task fields", () => {
    expect(taskPatchTo({ goalId: "life-area-goal" })).toEqual({ goal_id: "life-area-goal" });
  });
  it("clears an explicitly removed goal", () => {
    expect(taskPatchTo({ goalId: undefined })).toEqual({ goal_id: null });
  });
  it("preserves the goal when editing an unrelated field", () => {
    expect(taskPatchTo({ title: "Updated task" })).toEqual({ title: "Updated task" });
  });
});