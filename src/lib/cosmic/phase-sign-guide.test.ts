import { describe, it, expect } from "vitest";
import { PHASE_SIGN_GUIDE } from "./phase-sign-guide";
const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
describe("phase × sign guidance", () => {
  const all = (["plan","grow","care","letgo"] as const).flatMap(p => SIGNS.map(s => PHASE_SIGN_GUIDE[p][s]));
  it("covers all 48 pairs", () => { expect(all.filter(Boolean)).toHaveLength(48); });
  it("never repeats a headline line", () => { expect(new Set(all.map(g => g.line)).size).toBe(48); });
  it("never repeats an action chip", () => { const a = all.flatMap(g => g.actions); expect(new Set(a).size).toBe(a.length); });
  it("chips differ from the headline", () => { all.forEach(g => g.actions.forEach(a => expect(g.line).not.toContain(a))); });
});
