import { describe, expect, it } from "vitest";
import { phaseSignAdvice } from "./moon-energy";
import { PHASE_SIGN_GUIDE } from "./phase-sign-guide";
describe("phaseSignAdvice", () => {
  it("selects the guidance for every phase and sign without mixing pairs", () => {
    for (const phase of ["plan", "grow", "care", "letgo"] as const) {
      for (const [sign, guidance] of Object.entries(PHASE_SIGN_GUIDE[phase])) {
        expect(phaseSignAdvice(phase, sign)).toBe(guidance.line);
      }
    }
  });
});
