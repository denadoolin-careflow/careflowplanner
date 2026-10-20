import type { NoteProperty } from "@/lib/notes";
import type { RhythmPhase } from "./rhythm-phase";

export const MONTHLY_PHASES: RhythmPhase[] = ["plan", "grow", "care", "letgo"];
export type PhaseIntentions = Record<RhythmPhase, string>;
export const emptyPhaseIntentions = (): PhaseIntentions => ({ plan: "", grow: "", care: "", letgo: "" });
const propertyId = (phase: RhythmPhase) => `careflow-monthly-intention-${phase}`;

export function readPhaseIntentions(properties: NoteProperty[] = []): PhaseIntentions {
  const result = emptyPhaseIntentions();
  for (const phase of MONTHLY_PHASES) {
    const value = properties.find(property => property.id === propertyId(phase))?.value;
    result[phase] = typeof value === "string" ? value : "";
  }
  return result;
}

export function writePhaseIntentions(properties: NoteProperty[], intentions: PhaseIntentions): NoteProperty[] {
  return [
    ...properties.filter(property => !MONTHLY_PHASES.some(phase => property.id === propertyId(phase))),
    ...MONTHLY_PHASES.map(phase => ({ id: propertyId(phase), name: `${phase === "letgo" ? "Let go" : phase[0].toUpperCase() + phase.slice(1)} intention`, type: "text" as const, value: intentions[phase].trim() })),
  ];
}