import { describe, it, expect } from "vitest";
import { groupTasksByPhase, isActionable, moveGarden, validNextStep, phaseOfTask } from "./garden-phases";

const t = (id: string, extra: any = {}) => ({ id, title: id, ...extra } as any);
const sections = [{ id: "s1", name: "grow" }, { id: "s2", name: "Let go" }, { id: "s3", name: "Misc" }] as any;

describe("garden phases", () => {
  it("places tasks by explicit phase, then section name, else Plan", () => {
    const g = groupTasksByPhase([t("a", { sectionId: "s1" }), t("b", { sectionId: "s2" }), t("c", { sectionId: "s3" }), t("d"), t("e", { garden: { phase: "Care" } })], sections);
    expect(g.Grow.map(x => x.id)).toEqual(["a"]);
    expect(g["Let go"].map(x => x.id)).toEqual(["b"]);
    expect(g.Plan.map(x => x.id)).toEqual(["c", "d"]);
    expect(g.Care.map(x => x.id)).toEqual(["e"]);
  });
  it("completed and let-go tasks are not actionable", () => {
    expect(isActionable(t("a", { done: true }))).toBe(false);
    expect(isActionable(t("b", { garden: { phase: "Let go", letGo: "later" } }))).toBe(false);
    expect(isActionable(t("c", { garden: { phase: "Grow" } }))).toBe(true);
  });
  it("restoring from Let go clears the disposition", () => {
    const lg = moveGarden({}, "Let go", { kind: "later", reason: "busy", reviewDate: "2026-11-01" });
    expect(lg).toMatchObject({ letGo: "later", reviewDate: "2026-11-01" });
    const back = moveGarden(lg, "Grow");
    expect(back).toEqual({ phase: "Grow" });
    expect(phaseOfTask(t("x", { garden: back }))).toBe("Grow");
  });
  it("next step clears when task is done, let go or deleted", () => {
    const tasks = [t("a"), t("b", { done: true }), t("c", { garden: { letGo: "released" } })];
    expect(validNextStep("a", tasks)).toBe("a");
    expect(validNextStep("b", tasks)).toBeNull();
    expect(validNextStep("c", tasks)).toBeNull();
    expect(validNextStep("zz", tasks)).toBeNull();
  });
});
