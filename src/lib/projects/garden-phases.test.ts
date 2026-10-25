import { describe, it, expect } from "vitest";
import { groupTasksByPhase } from "./garden-phases";

const t = (id: string, sectionId?: string) => ({ id, title: id, sectionId } as any);
const sections = [{ id: "s1", name: "grow" }, { id: "s2", name: "Let go" }, { id: "s3", name: "Misc" }] as any;

describe("groupTasksByPhase", () => {
  it("places tasks in their phase section, others in Plan", () => {
    const g = groupTasksByPhase([t("a", "s1"), t("b", "s2"), t("c", "s3"), t("d")], sections);
    expect(g.Grow.map(x => x.id)).toEqual(["a"]);
    expect(g["Let go"].map(x => x.id)).toEqual(["b"]);
    expect(g.Plan.map(x => x.id)).toEqual(["c", "d"]);
  });
});
