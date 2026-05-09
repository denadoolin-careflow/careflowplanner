/** Simple moon phase model — adapted from Lunar Life. */
export type MoonPhase =
  | "new" | "waxing-crescent" | "first-quarter" | "waxing-gibbous"
  | "full" | "waning-gibbous" | "last-quarter" | "waning-crescent";

export interface MoonPhaseInfo {
  phase: MoonPhase;
  label: string;
  glyph: string;
  invitation: string;
  affirmation: string;
}

export const MOON_INFO: Record<MoonPhase, MoonPhaseInfo> = {
  "new":              { phase:"new",              label:"New Moon",         glyph:"🌑", invitation:"A soft reset. Notice one quiet wish.",        affirmation:"I am allowed to begin again, gently." },
  "waxing-crescent":  { phase:"waxing-crescent",  label:"Waxing Crescent",  glyph:"🌒", invitation:"Something is stirring. One small step.",     affirmation:"Small is still moving." },
  "first-quarter":    { phase:"first-quarter",    label:"First Quarter",    glyph:"🌓", invitation:"Friction is normal. Choose one to keep.",    affirmation:"I'm allowed to keep going slowly." },
  "waxing-gibbous":   { phase:"waxing-gibbous",   label:"Waxing Gibbous",   glyph:"🌔", invitation:"Tend what's growing. Don't start more.",     affirmation:"Tending counts as progress." },
  "full":             { phase:"full",             label:"Full Moon",        glyph:"🌕", invitation:"Everything is lit. Feel without fixing.",   affirmation:"I can be full and tired at the same time." },
  "waning-gibbous":   { phase:"waning-gibbous",   label:"Waning Gibbous",   glyph:"🌖", invitation:"Share, give thanks, exhale.",                affirmation:"Releasing is a kind of caring." },
  "last-quarter":     { phase:"last-quarter",     label:"Last Quarter",     glyph:"🌗", invitation:"Let one thing go without guilt.",            affirmation:"I can clear space for what matters." },
  "waning-crescent":  { phase:"waning-crescent",  label:"Waning Crescent",  glyph:"🌘", invitation:"Rest is preparation. Be gentle.",            affirmation:"Quiet is also productive." },
};

const SYNODIC = 29.53058867;
const REF = Date.UTC(2000, 0, 6, 18, 14, 0);

export function getMoonPhase(date: Date = new Date()): MoonPhase {
  const diffDays = (date.getTime() - REF) / 86400000;
  const age = ((diffDays % SYNODIC) + SYNODIC) % SYNODIC;
  const frac = age / SYNODIC;
  if (frac < 0.0303 || frac >= 0.9697) return "new";
  if (frac < 0.2197) return "waxing-crescent";
  if (frac < 0.2803) return "first-quarter";
  if (frac < 0.4697) return "waxing-gibbous";
  if (frac < 0.5303) return "full";
  if (frac < 0.7197) return "waning-gibbous";
  if (frac < 0.7803) return "last-quarter";
  return "waning-crescent";
}

export function getMoonAgeDays(date: Date = new Date()): number {
  const diffDays = (date.getTime() - REF) / 86400000;
  return ((diffDays % SYNODIC) + SYNODIC) % SYNODIC;
}

export function getIllumination(date: Date = new Date()): number {
  const age = getMoonAgeDays(date);
  // 0..1: 0 at new, 1 at full
  return Math.round((1 - Math.cos((age / SYNODIC) * 2 * Math.PI)) / 2 * 100);
}

/** Days until the next full moon (>=0 today). */
export function daysUntilFull(from: Date = new Date()): number {
  const age = getMoonAgeDays(from);
  const fullAge = SYNODIC / 2;
  let d = fullAge - age;
  if (d < 0) d += SYNODIC;
  return Math.round(d);
}

/** Days until the next new moon. */
export function daysUntilNew(from: Date = new Date()): number {
  const age = getMoonAgeDays(from);
  let d = SYNODIC - age;
  if (d >= SYNODIC) d -= SYNODIC;
  return Math.round(d);
}