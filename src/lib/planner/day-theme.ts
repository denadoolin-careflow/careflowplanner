/**
 * Day themes for the week planner headers.
 *
 * A theme is derived from the moon phase (the day's energy) and the moon's
 * zodiac sign (the day's flavour), so every day in the week reads differently
 * without any hardcoded sample data. Shaped so user overrides can be layered
 * on later without changing callers.
 */
import { getMoonPhase, getIllumination, MOON_INFO, type MoonPhase } from "@/lib/moon";
import { getMoonSign, type ZodiacSign } from "@/lib/zodiac";

export interface DayTheme {
  themeName: string;
  blurb: string;
  goodFor: string[];
  /** CSS color (hsl var or hex) used for the accent dot / tint. */
  color: string;
  icon: string;
  moonPhase: MoonPhase;
  moonLabel: string;
  illumination: number;
  /** 0 = new, 0.5 = full — matches MoonSVG's `fraction`. */
  fraction: number;
  sign: ZodiacSign;
  signSymbol: string;
  element: "Fire" | "Earth" | "Air" | "Water";
}

const PHASE_THEME: Record<MoonPhase, { name: string; blurb: string; goodFor: string[]; icon: string }> = {
  "new":             { name: "Quiet Beginnings", blurb: "A soft reset — start small and low-key.",        goodFor: ["planning", "journaling", "rest"],        icon: "🌱" },
  "waxing-crescent": { name: "First Steps",      blurb: "Momentum is building. One step is enough.",      goodFor: ["starting", "outreach", "errands"],       icon: "✨" },
  "first-quarter":   { name: "Steady Push",      blurb: "Friction shows up — choose what to keep.",       goodFor: ["deep work", "decisions", "admin"],       icon: "⛰️" },
  "waxing-gibbous":  { name: "Tending",          blurb: "Refine what's already growing.",                 goodFor: ["follow-ups", "tidying", "practice"],     icon: "🌿" },
  "full":            { name: "Full Expression",  blurb: "Everything is lit. Feel it without fixing it.",  goodFor: ["connection", "celebration", "creating"], icon: "🌟" },
  "waning-gibbous":  { name: "Sharing",          blurb: "Give back, say thanks, exhale.",                 goodFor: ["family time", "teaching", "gratitude"],  icon: "🤲" },
  "last-quarter":    { name: "Clearing",         blurb: "Let one thing go without guilt.",                goodFor: ["decluttering", "closing loops", "no's"], icon: "🧹" },
  "waning-crescent": { name: "Gentle Rest",      blurb: "Rest is preparation, not laziness.",             goodFor: ["rest", "reflection", "slow tasks"],      icon: "🌙" },
};

const SIGN_FLAVOUR: Record<ZodiacSign, { word: string; act: string }> = {
  Aries:       { word: "Bold Action",         act: "quick wins" },
  Taurus:      { word: "Grounded Comfort",    act: "comfort care" },
  Gemini:      { word: "Curious Exchange",    act: "messages" },
  Cancer:      { word: "Home & Nurture",      act: "home care" },
  Leo:         { word: "Creative Expression", act: "play" },
  Virgo:       { word: "Careful Order",       act: "organizing" },
  Libra:       { word: "Gentle Balance",      act: "relationships" },
  Scorpio:     { word: "Deep Focus",          act: "focus blocks" },
  Sagittarius: { word: "Open Horizons",       act: "learning" },
  Capricorn:   { word: "Quiet Discipline",    act: "long projects" },
  Aquarius:    { word: "Fresh Perspective",   act: "new systems" },
  Pisces:      { word: "Soft Imagination",    act: "creative rest" },
};

const ELEMENT_COLOR: Record<DayTheme["element"], string> = {
  Fire:  "#e08a5f", // warm terracotta
  Earth: "#8aa17a", // sage
  Air:   "#8fa8c4", // soft sky
  Water: "#a493c4", // lavender
};

export function getDayTheme(date: Date): DayTheme {
  const phase = getMoonPhase(date);
  const info = MOON_INFO[phase];
  const sign = getMoonSign(date);
  const p = PHASE_THEME[phase];
  const f = SIGN_FLAVOUR[sign.name];
  const illumination = getIllumination(date);
  // MoonSVG expects 0 (new) → 0.5 (full) → 1 (new again).
  const waning = phase.startsWith("waning") || phase === "last-quarter";
  const fraction = waning ? 1 - illumination / 200 : illumination / 200;

  return {
    themeName: f.word,
    blurb: p.blurb,
    goodFor: [...p.goodFor.slice(0, 2), f.act],
    color: ELEMENT_COLOR[sign.element],
    icon: p.icon,
    moonPhase: phase,
    moonLabel: info.label,
    illumination,
    fraction,
    sign: sign.name,
    signSymbol: sign.symbol,
    element: sign.element,
  };
}