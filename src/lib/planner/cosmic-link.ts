/**
 * Links a day's cosmic theme (moon phase + moon sign + element) to individual
 * tasks, so you can see which items were planned under which sky.
 *
 * The stamp is stored on `tasks.cosmic_tag` as a compact, parseable string:
 *   "waxing-crescent|Leo|Fire"
 */
import { format } from "date-fns";
import { getDayTheme, type DayTheme } from "@/lib/planner/day-theme";
import { MOON_INFO, type MoonPhase } from "@/lib/moon";
import type { ZodiacSign } from "@/lib/zodiac";

export type CosmicElement = "Fire" | "Earth" | "Air" | "Water";

export interface CosmicStamp {
  phase: MoonPhase;
  sign: ZodiacSign;
  element: CosmicElement;
  /** Moon glyph for the phase. */
  glyph: string;
  /** "Waxing Crescent · Leo" */
  label: string;
  /** Element accent color. */
  color: string;
  raw: string;
}

const ELEMENT_COLOR: Record<CosmicElement, string> = {
  Fire: "#e08a5f",
  Earth: "#8aa17a",
  Air: "#8fa8c4",
  Water: "#a493c4",
};

export const ELEMENTS: CosmicElement[] = ["Fire", "Earth", "Air", "Water"];

/** Encode a day theme into the compact tag stored on the task. */
export function encodeCosmicTag(theme: Pick<DayTheme, "moonPhase" | "sign" | "element">): string {
  return `${theme.moonPhase}|${theme.sign}|${theme.element}`;
}

/** Tag for a calendar date. */
export function cosmicTagForDate(date: Date): string {
  return encodeCosmicTag(getDayTheme(date));
}

/** Tag for an ISO yyyy-MM-dd string (noon-anchored so timezones can't shift it). */
export function cosmicTagForISO(iso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return cosmicTagForDate(d);
}

/** Parse a stored tag back into something renderable. */
export function decodeCosmicTag(raw?: string | null): CosmicStamp | null {
  if (!raw) return null;
  const [phase, sign, element] = raw.split("|");
  if (!phase || !sign) return null;
  const info = MOON_INFO[phase as MoonPhase];
  if (!info) return null;
  const el = (element as CosmicElement) ?? "Earth";
  return {
    phase: phase as MoonPhase,
    sign: sign as ZodiacSign,
    element: el,
    glyph: info.glyph,
    label: `${info.label} · ${sign}`,
    color: ELEMENT_COLOR[el] ?? ELEMENT_COLOR.Earth,
    raw,
  };
}

export const elementColor = (el: CosmicElement) => ELEMENT_COLOR[el] ?? ELEMENT_COLOR.Earth;

/** True when the stamp matches a phase and/or element filter. */
export function matchesCosmicFilter(
  raw: string | null | undefined,
  filter: { phase?: MoonPhase | null; element?: CosmicElement | null },
): boolean {
  const s = decodeCosmicTag(raw);
  if (!s) return false;
  if (filter.phase && s.phase !== filter.phase) return false;
  if (filter.element && s.element !== filter.element) return false;
  return true;
}

/** Short human line: "Planned under the Full Moon in Leo (Fire)". */
export function cosmicStampSentence(stamp: CosmicStamp): string {
  return `Planned under the ${stamp.label} (${stamp.element})`;
}

export const isoOf = (d: Date) => format(d, "yyyy-MM-dd");
