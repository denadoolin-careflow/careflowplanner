import { MOON_INFO, type MoonPhase } from "@/lib/moon";
import { getMoonData } from "@/lib/moon-providers";

export type Element = "fire" | "earth" | "air" | "water";

export interface MoonGuidance {
  short: string;       // 1-line label for widget ("Waxing Moon")
  keywords: string[];  // 3 energy keywords
  suggestion: string;  // short planning suggestion
  doMore: string[];
  doLess: string[];
  caregiverNote: string;
}

export const MOON_GUIDANCE: Record<MoonPhase, MoonGuidance> = {
  "new": {
    short: "New Moon",
    keywords: ["reset", "rest", "intend"],
    suggestion: "Pick one tiny intention. Let the day be quiet.",
    doMore: ["journaling", "resting", "naming one priority"],
    doLess: ["launching big projects", "back-to-back errands"],
    caregiverNote: "A soft starting line. You don't need a full plan today.",
  },
  "waxing-crescent": {
    short: "Waxing Crescent",
    keywords: ["build", "begin", "small steps"],
    suggestion: "Choose one small task that moves life forward.",
    doMore: ["light planning", "first drafts", "reaching out"],
    doLess: ["over-scheduling", "second-guessing"],
    caregiverNote: "Good for light progress — protect your pace.",
  },
  "first-quarter": {
    short: "First Quarter",
    keywords: ["decide", "act", "adjust"],
    suggestion: "Pick the one decision you've been avoiding.",
    doMore: ["follow-ups", "tidy decisions", "calls"],
    doLess: ["perfectionism", "saying yes out of guilt"],
    caregiverNote: "Friction is normal — choose what matters most.",
  },
  "waxing-gibbous": {
    short: "Waxing Gibbous",
    keywords: ["tend", "refine", "finish"],
    suggestion: "Tend what's growing — don't start anything new.",
    doMore: ["finishing", "tidying", "checking in on people"],
    doLess: ["adding new commitments"],
    caregiverNote: "Tending counts as progress.",
  },
  "full": {
    short: "Full Moon",
    keywords: ["clarity", "feel", "harvest"],
    suggestion: "Notice what's full and what's heavy — both are real.",
    doMore: ["reflection", "celebrating small wins", "gentle company"],
    doLess: ["confrontations", "overcommitting"],
    caregiverNote: "You can be full and tired at the same time.",
  },
  "waning-gibbous": {
    short: "Waning Gibbous",
    keywords: ["share", "thank", "exhale"],
    suggestion: "Share what you learned this week, then rest.",
    doMore: ["thank-yous", "handing off", "journaling"],
    doLess: ["taking on more", "self-criticism"],
    caregiverNote: "Releasing is a kind of caring.",
  },
  "last-quarter": {
    short: "Last Quarter",
    keywords: ["release", "clear", "edit"],
    suggestion: "Let one thing go without guilt.",
    doMore: ["decluttering", "closing tabs", "saying no kindly"],
    doLess: ["starting over", "spiraling on the past"],
    caregiverNote: "Clearing space is also progress.",
  },
  "waning-crescent": {
    short: "Waning Crescent",
    keywords: ["rest", "soften", "listen"],
    suggestion: "Rest is preparation. Be gentle.",
    doMore: ["sleep", "slow mornings", "quiet meals"],
    doLess: ["pushing through", "big plans"],
    caregiverNote: "Quiet is also productive.",
  },
};

/* --- Sun-sign by date (approximation, good enough for MVP) --- */
export type ZodiacSign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo"
  | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

interface ZodiacInfo {
  sign: ZodiacSign;
  element: Element;
  glyph: string;
  insight: string; // gentle, practical
}

const SIGN_TABLE: { sign: ZodiacSign; from: [number, number]; to: [number, number]; element: Element; glyph: string; insight: string }[] = [
  { sign: "Capricorn",   from: [12, 22], to: [1, 19],  element: "earth", glyph: "♑", insight: "Good for steady, ordinary work. Pace > pressure." },
  { sign: "Aquarius",    from: [1, 20],  to: [2, 18],  element: "air",   glyph: "♒", insight: "Good for thinking, planning, reaching out." },
  { sign: "Pisces",      from: [2, 19],  to: [3, 20],  element: "water", glyph: "♓", insight: "Good for reflection — soften the to-do list." },
  { sign: "Aries",       from: [3, 21],  to: [4, 19],  element: "fire",  glyph: "♈", insight: "Good for starting one thing — keep it small." },
  { sign: "Taurus",      from: [4, 20],  to: [5, 20],  element: "earth", glyph: "♉", insight: "Good for home, food, gentle routines." },
  { sign: "Gemini",      from: [5, 21],  to: [6, 20],  element: "air",   glyph: "♊", insight: "Good for messages, errands, light shifts." },
  { sign: "Cancer",      from: [6, 21],  to: [7, 22],  element: "water", glyph: "♋", insight: "Good for family, care, slow comforts." },
  { sign: "Leo",         from: [7, 23],  to: [8, 22],  element: "fire",  glyph: "♌", insight: "Good for visible progress — one bold kindness." },
  { sign: "Virgo",       from: [8, 23],  to: [9, 22],  element: "earth", glyph: "♍", insight: "Good for tidying, lists, follow-ups." },
  { sign: "Libra",       from: [9, 23],  to: [10, 22], element: "air",   glyph: "♎", insight: "Good for balance, asking for help, soft conversations." },
  { sign: "Scorpio",     from: [10, 23], to: [11, 21], element: "water", glyph: "♏", insight: "Good for honest journaling — protect your energy." },
  { sign: "Sagittarius", from: [11, 22], to: [12, 21], element: "fire",  glyph: "♐", insight: "Good for one hopeful step — leave room to breathe." },
];

export function getSunSign(date: Date = new Date()): ZodiacInfo {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  for (const row of SIGN_TABLE) {
    const [fm, fd] = row.from;
    const [tm, td] = row.to;
    // Handle Capricorn (Dec→Jan) wrap
    if (fm > tm) {
      if ((m === fm && d >= fd) || (m === tm && d <= td) || (m > fm) || (m < tm)) {
        return { sign: row.sign, element: row.element, glyph: row.glyph, insight: row.insight };
      }
    } else if ((m === fm && d >= fd) || (m === tm && d <= td) || (m > fm && m < tm)) {
      return { sign: row.sign, element: row.element, glyph: row.glyph, insight: row.insight };
    }
  }
  return { sign: "Aries", element: "fire", glyph: "♈", insight: "Good for starting one thing — keep it small." };
}

export const ELEMENT_LABEL: Record<Element, { verb: string; line: string }> = {
  fire:  { verb: "create",  line: "Fire — create. One small spark, not a bonfire." },
  earth: { verb: "conserve",line: "Earth — conserve. Tend home, body, routine." },
  air:   { verb: "connect", line: "Air — connect. Send the message, ask the question." },
  water: { verb: "cleanse", line: "Water — cleanse. Reflect, release, soften." },
};

/* --- Composed forecast helper --- */
export interface RhythmForecast {
  date: Date;
  phase: MoonPhase;
  phaseLabel: string;
  glyph: string;
  illumination: number;
  guidance: MoonGuidance;
  sign: ZodiacInfo;
  element: Element;
  elementLine: string;
}

export function getRhythmForecast(date: Date = new Date()): RhythmForecast {
  const m = getMoonData(date);
  const info = MOON_INFO[m.phase];
  const sign = getSunSign(date);
  return {
    date,
    phase: m.phase,
    phaseLabel: info.label,
    glyph: m.glyph,
    illumination: m.illumination,
    guidance: MOON_GUIDANCE[m.phase],
    sign,
    element: sign.element,
    elementLine: ELEMENT_LABEL[sign.element].line,
  };
}

/* --- Settings toggle (localStorage) --- */
import { useEffect, useState } from "react";
const KEY = "careflow:rhythm-forecast:enabled";

export function isRhythmForecastEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(KEY);
  return v === null ? true : v === "1";
}

export function useRhythmForecastEnabled(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState<boolean>(isRhythmForecastEnabled);
  useEffect(() => {
    const handler = () => setOn(isRhythmForecastEnabled());
    window.addEventListener("storage", handler);
    window.addEventListener("rhythm-forecast:change", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("rhythm-forecast:change", handler);
    };
  }, []);
  const set = (v: boolean) => {
    window.localStorage.setItem(KEY, v ? "1" : "0");
    setOn(v);
    window.dispatchEvent(new Event("rhythm-forecast:change"));
  };
  return [on, set];
}

/* --- Suggested tasks by phase --- */
export interface SuggestedTask {
  title: string;
  area: "Personal" | "Home" | "Caregiving";
  energy: "low" | "medium";
  kind: "low-energy" | "home-reset" | "personal-care";
}

export function getSuggestedTasks(forecast: RhythmForecast): SuggestedTask[] {
  const verb = ELEMENT_LABEL[forecast.element].verb;
  const base: Record<MoonPhase, SuggestedTask[]> = {
    "new":              [
      { title: "Sit quietly for 5 minutes and name one intention", area: "Personal", energy: "low", kind: "low-energy" },
      { title: "Wipe one surface in the kitchen", area: "Home", energy: "low", kind: "home-reset" },
      { title: "Drink a full glass of water", area: "Personal", energy: "low", kind: "personal-care" },
    ],
    "waxing-crescent":  [
      { title: `One small step to ${verb} something new`, area: "Personal", energy: "low", kind: "low-energy" },
      { title: "Reset one surface or shelf", area: "Home", energy: "low", kind: "home-reset" },
      { title: "Take a 10-minute walk", area: "Personal", energy: "medium", kind: "personal-care" },
    ],
    "first-quarter":    [
      { title: "Send one message you've been putting off", area: "Personal", energy: "low", kind: "low-energy" },
      { title: "Clear the entryway / one drop zone", area: "Home", energy: "medium", kind: "home-reset" },
      { title: "Schedule one care follow-up", area: "Caregiving", energy: "low", kind: "personal-care" },
    ],
    "waxing-gibbous":   [
      { title: "Finish one task already in progress", area: "Personal", energy: "low", kind: "low-energy" },
      { title: "Tidy a room you already started", area: "Home", energy: "medium", kind: "home-reset" },
      { title: "Check in on someone you love", area: "Caregiving", energy: "low", kind: "personal-care" },
    ],
    "full":             [
      { title: "Write down one win from this week", area: "Personal", energy: "low", kind: "low-energy" },
      { title: "Light reset of the main living space", area: "Home", energy: "medium", kind: "home-reset" },
      { title: "Take 10 quiet minutes for yourself", area: "Personal", energy: "low", kind: "personal-care" },
    ],
    "waning-gibbous":   [
      { title: "Say thank you to one person", area: "Personal", energy: "low", kind: "low-energy" },
      { title: "Empty one bag, basket, or inbox", area: "Home", energy: "low", kind: "home-reset" },
      { title: "Stretch for 5 minutes", area: "Personal", energy: "low", kind: "personal-care" },
    ],
    "last-quarter":     [
      { title: "Let one task go from your list, guilt-free", area: "Personal", energy: "low", kind: "low-energy" },
      { title: "Declutter one drawer or surface", area: "Home", energy: "medium", kind: "home-reset" },
      { title: "Say a kind no to one thing this week", area: "Personal", energy: "low", kind: "personal-care" },
    ],
    "waning-crescent":  [
      { title: "Pick one tiny rest ritual for today", area: "Personal", energy: "low", kind: "low-energy" },
      { title: "Make the bed or fluff the couch", area: "Home", energy: "low", kind: "home-reset" },
      { title: "Go to bed 15 minutes earlier", area: "Personal", energy: "low", kind: "personal-care" },
    ],
  };
  return base[forecast.phase];
}
