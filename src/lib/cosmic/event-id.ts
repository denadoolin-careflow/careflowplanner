/**
 * Cosmic event ids are URL-safe synthetic strings — we don't store events,
 * we re-derive them from the date + kind on demand.
 *
 * Format:  <kind>:<date>[:<planet>][:<sign>][:<phase>]
 * Example: "ingress:2026-06-11:Mercury:Cancer", "phase:2026-06-15:full"
 */
export type CosmicEventKind =
  | "phase" | "ingress" | "retrograde" | "direct" | "voc" | "eclipse";

export interface CosmicEventRef {
  kind: CosmicEventKind;
  date: string;          // ISO yyyy-mm-dd
  planet?: string;
  sign?: string;
  phase?: string;        // 'new' | 'first-quarter' | 'full' | 'last-quarter'
}

export function encodeEventId(ref: CosmicEventRef): string {
  const parts = [ref.kind, ref.date];
  if (ref.planet) parts.push(ref.planet);
  if (ref.sign) parts.push(ref.sign);
  if (ref.phase) parts.push(ref.phase);
  return parts.join("~");
}

export function decodeEventId(id: string): CosmicEventRef | null {
  const [kind, date, a, b, c] = id.split("~");
  if (!kind || !date) return null;
  const ref: CosmicEventRef = { kind: kind as CosmicEventKind, date };
  // Heuristic: planet is capitalized like "Mercury", sign like "Cancer",
  // phase is one of the lower-case phase keys.
  const PHASES = new Set(["new", "first-quarter", "full", "last-quarter"]);
  for (const v of [a, b, c]) {
    if (!v) continue;
    if (PHASES.has(v)) ref.phase = v;
    else if (!ref.planet) ref.planet = v;
    else ref.sign = v;
  }
  return ref;
}