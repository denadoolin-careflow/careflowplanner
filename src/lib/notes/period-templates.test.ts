import { describe, it, expect } from "vitest";
import { applyPeriodTemplate } from "./period-templates";

describe("applyPeriodTemplate", () => {
  it("adds only missing headings and keeps existing writing", () => {
    const out = applyPeriodTemplate({ body: "## Intention\nRest more", properties: [] }, { prompts: ["Intention", "Highlights"], properties: [] });
    expect(out.body).toContain("## Intention\nRest more");
    expect(out.body.match(/## Intention/g)?.length).toBe(1);
    expect(out.body).toContain("## Highlights");
  });
  it("never overwrites an existing property value", () => {
    const out = applyPeriodTemplate(
      { body: "", properties: [{ id: "m", name: "Mood", type: "select", value: "Calm" }] },
      { prompts: [], properties: [{ name: "mood", type: "select" }, { name: "Goal", type: "text" }] },
    );
    expect(out.properties.find(p => p.name === "Mood")?.value).toBe("Calm");
    expect(out.properties.map(p => p.name)).toEqual(["Mood", "Goal"]);
  });
  it("is idempotent", () => {
    const tpl = { prompts: ["Ideas"], properties: [{ name: "Goal", type: "text" as const }] };
    const once = applyPeriodTemplate({ body: "", properties: [] }, tpl);
    const twice = applyPeriodTemplate(once, tpl);
    expect(twice.changed).toBe(false);
  });
});
