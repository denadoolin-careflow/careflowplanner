import { MOON_INFO, type MoonPhase } from "@/lib/moon";
import { getMoonData } from "@/lib/moon-providers";
import type { Task } from "@/lib/types";

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

/* --- Element visual + planning meta (icons resolved in components) --- */
export interface ElementMeta {
  id: Element;
  label: string;          // "Fire"
  verb: string;           // "create"
  iconName: "Flame" | "Wind" | "Droplet" | "Mountain";
  /** Tailwind text/bg accent classes — pulled from semantic tokens. */
  accent: { text: string; bg: string; ring: string; glow: string };
  recommendation: string; // 1-line caregiver-friendly planning tip
  focusAreas: string[];   // 2-3 keywords
}

export const ELEMENT_META: Record<Element, ElementMeta> = {
  fire: {
    id: "fire", label: "Fire", verb: "create", iconName: "Flame",
    accent: { text: "text-warm-foreground", bg: "bg-warm-soft", ring: "ring-warm/40", glow: "hsl(20 80% 60% / 0.18)" },
    recommendation: "Pick one small spark — momentum beats a long list.",
    focusAreas: ["create", "start", "act"],
  },
  earth: {
    id: "earth", label: "Earth", verb: "conserve", iconName: "Mountain",
    accent: { text: "text-secondary-foreground", bg: "bg-secondary-soft", ring: "ring-secondary/40", glow: "hsl(35 50% 55% / 0.18)" },
    recommendation: "Tend home, body, routine. Steady wins today.",
    focusAreas: ["home", "body", "routine"],
  },
  air: {
    id: "air", label: "Air", verb: "connect", iconName: "Wind",
    accent: { text: "text-primary-foreground", bg: "bg-primary-soft", ring: "ring-primary/40", glow: "hsl(205 65% 60% / 0.18)" },
    recommendation: "Send the message, ask the question, write the list.",
    focusAreas: ["connect", "plan", "share"],
  },
  water: {
    id: "water", label: "Water", verb: "cleanse", iconName: "Droplet",
    accent: { text: "text-accent-foreground", bg: "bg-accent-soft", ring: "ring-accent/40", glow: "hsl(250 60% 65% / 0.18)" },
    recommendation: "Reflect, release, soften. Rest counts as progress.",
    focusAreas: ["reflect", "release", "soften"],
  },
};

export function getElementMeta(date: Date = new Date()): ElementMeta {
  return ELEMENT_META[getSunSign(date).element];
}

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

/* ====================================================================== */
/* Weekly Rhythm overview                                                 */
/* ====================================================================== */

export type PhaseDirection = "waxing" | "waning" | "balanced";
export type PlanningStyle = "reset & intend" | "build gently" | "tend & finish" | "reflect & celebrate" | "release & rest";

export interface WeeklyRhythm {
  weekStart: Date;
  days: { date: Date; phase: MoonPhase; element: Element }[];
  startPhase: MoonPhase;
  endPhase: MoonPhase;
  /** Phase that appears most often this week. */
  dominantPhase: MoonPhase;
  /** Most common element across the 7 days. */
  dominantElement: Element;
  direction: PhaseDirection;
  shifts: { date: Date; from: MoonPhase; to: MoonPhase; label: string }[];
  energyTheme: string;
  focusAreas: string[];
  reminder: string;
  planningStyle: PlanningStyle;
  overview: string;
}

const WAXING_SET = new Set<MoonPhase>(["new", "waxing-crescent", "first-quarter", "waxing-gibbous"]);

const STYLE_BY_PHASE: Record<MoonPhase, PlanningStyle> = {
  "new": "reset & intend",
  "waxing-crescent": "build gently",
  "first-quarter": "build gently",
  "waxing-gibbous": "tend & finish",
  "full": "reflect & celebrate",
  "waning-gibbous": "tend & finish",
  "last-quarter": "release & rest",
  "waning-crescent": "release & rest",
};

const THEME_BY_STYLE: Record<PlanningStyle, { theme: string; focus: string[]; reminder: string; overview: string }> = {
  "reset & intend": {
    theme: "Soft resets and small intentions",
    focus: ["declutter", "intention setting", "low-energy resets"],
    reminder: "You don't need a full plan — pick one quiet beginning.",
    overview: "This week favors resetting routines, protecting energy, and naming what matters most.",
  },
  "build gently": {
    theme: "Light progress, one small step at a time",
    focus: ["first drafts", "small commitments", "follow-ups"],
    reminder: "Build the pace you could keep on a tired day.",
    overview: "This week favors quiet momentum — small steps, not big launches.",
  },
  "tend & finish": {
    theme: "Tend what's already growing",
    focus: ["finishing", "tidying", "checking in"],
    reminder: "Tending is progress. Don't add anything new.",
    overview: "This week favors finishing, tidying, and tending what you've already begun.",
  },
  "reflect & celebrate": {
    theme: "Clarity, feelings, and quiet harvest",
    focus: ["reflection", "small wins", "gentle company"],
    reminder: "You can feel both full and tired. Both are real.",
    overview: "This week favors reflection and noticing what's already true — over chasing more.",
  },
  "release & rest": {
    theme: "Clear space, rest deeply",
    focus: ["decluttering", "saying a kind no", "rest rituals"],
    reminder: "Letting go is a form of caring for yourself.",
    overview: "This week favors releasing, simplifying, and protecting rest before the next cycle.",
  },
};

function modeOf<T extends string>(arr: T[]): T {
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = arr[0], bestN = 0;
  for (const [k, n] of counts) if (n > bestN) { best = k; bestN = n; }
  return best;
}

function phaseLabel(p: MoonPhase) { return MOON_INFO[p].label; }

export function getWeeklyRhythm(weekStart: Date): WeeklyRhythm {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    const m = getMoonData(d);
    return { date: d, phase: m.phase, element: getSunSign(d).element as Element };
  });
  const dominantPhase = modeOf(days.map(d => d.phase));
  const dominantElement = modeOf(days.map(d => d.element));
  const startPhase = days[0].phase;
  const endPhase = days[6].phase;

  const shifts: WeeklyRhythm["shifts"] = [];
  for (let i = 1; i < days.length; i++) {
    if (days[i].phase !== days[i - 1].phase) {
      shifts.push({
        date: days[i].date,
        from: days[i - 1].phase,
        to: days[i].phase,
        label: `${phaseLabel(days[i - 1].phase)} → ${phaseLabel(days[i].phase)}`,
      });
    }
  }

  const waxCount = days.filter(d => WAXING_SET.has(d.phase)).length;
  const direction: PhaseDirection =
    waxCount >= 5 ? "waxing" : waxCount <= 2 ? "waning" : "balanced";

  const planningStyle = STYLE_BY_PHASE[dominantPhase];
  const meta = THEME_BY_STYLE[planningStyle];

  return {
    weekStart,
    days,
    startPhase,
    endPhase,
    dominantPhase,
    dominantElement,
    direction,
    shifts,
    energyTheme: meta.theme,
    focusAreas: meta.focus,
    reminder: meta.reminder,
    planningStyle,
    overview: meta.overview,
  };
}

/* ====================================================================== */
/* Weekly Reset · Moon connection                                         */
/* ====================================================================== */

export interface MoonResetTip {
  phase: MoonPhase;
  phaseLabel: string;
  title: string;
  bullets: string[];
  note: string;
}

const RESET_TIPS: Record<MoonPhase, Omit<MoonResetTip, "phase" | "phaseLabel">> = {
  "new":              { title: "Reset & intend",   bullets: ["Declutter one small zone", "Name one intention for the cycle", "Wipe one surface mindfully"], note: "Start the cycle by clearing space, not filling it." },
  "waxing-crescent":  { title: "Plan & prep",      bullets: ["Tidy your most-used drop zone", "Restock one essential", "Write tomorrow's 3 small wins"], note: "Tiny resets compound — keep them gentle." },
  "first-quarter":    { title: "Build momentum",   bullets: ["Tackle one delayed reset", "Run the dishwasher / a load of laundry", "Clear the entryway"], note: "Progress over polish today." },
  "waxing-gibbous":   { title: "Tend & organize",  bullets: ["Finish one in-progress reset", "Refold or refresh a shelf", "Wipe down high-touch surfaces"], note: "Tend what's already started before adding more." },
  "full":             { title: "Reflect & review", bullets: ["Notice what feels light and what feels heavy", "Celebrate one small reset that stuck", "Skim the week — what helped?"], note: "Witness your week before fixing anything." },
  "waning-gibbous":   { title: "Simplify",         bullets: ["Donate or recycle one item", "Empty one bag, basket, or inbox", "Cancel one optional thing"], note: "Sharing and releasing both count as care." },
  "last-quarter":     { title: "Clear & release",  bullets: ["Declutter one drawer", "Close open loops (returns, replies)", "Say a kind no to one thing"], note: "Clearing space is also progress." },
  "waning-crescent":  { title: "Rest & soften",    bullets: ["Make the bed slowly", "Dim the lights early", "Choose a low-effort reset"], note: "Rest is preparation. Be gentle." },
};

export function getMoonResetTip(date: Date = new Date()): MoonResetTip {
  const m = getMoonData(date);
  const tip = RESET_TIPS[m.phase];
  return { phase: m.phase, phaseLabel: MOON_INFO[m.phase].label, ...tip };
}

/* ====================================================================== */
/* Rhythm journal prompts                                                 */
/* ====================================================================== */

const DAILY_PROMPTS_BY_ELEMENT: Record<Element, string[]> = {
  fire:  ["Where do I want to put one small spark today?", "What would feel brave but doable?", "What's the one thing only I can begin?"],
  earth: ["What in my body or home wants tending?", "What simple routine would steady me?", "What can I simplify by one step?"],
  air:   ["Who do I need to reach out to — even briefly?", "What's circling in my head that needs to be written down?", "What question would unlock today?"],
  water: ["What feels emotionally heavy right now?", "What feeling am I allowed to feel without fixing?", "What would soften this day?"],
};

const WEEKLY_PROMPTS_BY_STYLE: Record<PlanningStyle, string[]> = {
  "reset & intend":      ["What am I quietly hoping for this cycle?", "What does 'a fresh start' look like right now?"],
  "build gently":        ["What's the smallest commitment I can keep this week?", "Where do I need to choose pace over pressure?"],
  "tend & finish":       ["What would feel good to finally finish?", "Who or what wants tending — including me?"],
  "reflect & celebrate": ["What's already true that I'm not letting myself celebrate?", "Where can I rest in 'enough'?"],
  "release & rest":      ["What can be simplified?", "What story am I outgrowing?", "Where do I need support?"],
};

export interface RhythmPrompt {
  scope: "daily" | "weekly";
  text: string;
  element?: Element;
  phase?: MoonPhase;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

/** Deterministic per-day so the same date always returns the same prompt. */
export function getRhythmPrompt(date: Date = new Date(), scope: "daily" | "weekly" = "daily"): RhythmPrompt {
  const f = getRhythmForecast(date);
  if (scope === "daily") {
    const seed = date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate();
    return { scope, text: pick(DAILY_PROMPTS_BY_ELEMENT[f.element], seed), element: f.element };
  }
  const w = getWeeklyRhythm(date);
  const seed = date.getFullYear() * 53 + Math.floor(date.getDate() / 7);
  return { scope, text: pick(WEEKLY_PROMPTS_BY_STYLE[w.planningStyle], seed), phase: w.dominantPhase };
}

/* ====================================================================== */
/* Energy-based task picker — uses existing tasks, no AI                  */
/* ====================================================================== */

export interface EnergyPick {
  kind: "low-energy" | "home-care" | "personal" | "can-wait";
  label: string;
  task?: Task;
  fallbackTitle?: string; // used when no matching real task exists
  reason: string;
}

const HOME_AREAS = new Set(["Home", "Meals", "Caregiving", "Appointments"]);

/**
 * Pick 4 tasks from the user's existing list that align with today's energy:
 * one low-energy, one home/care, one personal, one that can wait.
 * Falls back to a phase-aligned suggestion when no real task fits.
 */
export function pickEnergyTaskSuggestions(tasks: Task[], forecast: RhythmForecast): EnergyPick[] {
  const open = tasks.filter(t => !t.done && !t.parentTaskId);
  const todayISO = new Date().toISOString().slice(0, 10);

  const overdue = open.filter(t => t.dueDate && t.dueDate < todayISO);
  const dueToday = open.filter(t => t.dueDate === todayISO);
  const someday  = open.filter(t => t.status === "someday" || (!t.dueDate && t.status !== "this_week"));
  const recurring = open.filter(t => t.recurrenceType && t.recurrenceType !== "none");

  const lowEnergy = [...dueToday, ...overdue, ...open]
    .find(t => t.energy === "low" || (t.estMinutes ?? 0) > 0 && (t.estMinutes ?? 999) <= 15);

  const homeCare = [...dueToday, ...overdue, ...recurring, ...open]
    .find(t => HOME_AREAS.has(t.area));

  const personal = [...dueToday, ...open]
    .find(t => (t.area === "Personal" || t.area === "Creative Projects") && t.id !== lowEnergy?.id);

  const canWait = [...someday, ...open.filter(t => t.priority === "low")]
    .find(t => t.id !== lowEnergy?.id && t.id !== homeCare?.id && t.id !== personal?.id);

  const fallback = getSuggestedTasks(forecast);

  return [
    {
      kind: "low-energy",
      label: "Low energy",
      task: lowEnergy,
      fallbackTitle: fallback[0]?.title,
      reason: "Soft enough for a tired body.",
    },
    {
      kind: "home-care",
      label: "Home / care",
      task: homeCare,
      fallbackTitle: fallback[1]?.title,
      reason: "Tends what's already growing.",
    },
    {
      kind: "personal",
      label: "Personal",
      task: personal,
      fallbackTitle: fallback[2]?.title,
      reason: "One small thing for you.",
    },
    {
      kind: "can-wait",
      label: "Can wait",
      fallbackTitle: "Let one open loop wait this week",
      task: canWait,
      reason: "Protect your energy — it'll keep.",
    },
  ];
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

/* --- Recommendation tone (gentle vs. more actionable) --- */
export type RecommendationTone = "gentle" | "actionable";
const TONE_KEY = "careflow:rhythm-tone";
const TONE_EVENT = "rhythm-tone:change";

const TONE_RECOMMENDATIONS: Record<RecommendationTone, Record<Element, string>> = {
  gentle: {
    fire:  "Pick one small spark — momentum beats a long list.",
    earth: "Tend home, body, routine. Steady wins today.",
    air:   "Send the message, ask the question, write the list.",
    water: "Reflect, release, soften. Rest counts as progress.",
  },
  actionable: {
    fire:  "Ship one thing in 25 min. Start the call, send the pitch, move first.",
    earth: "Block 2 routine tasks back-to-back: meal prep, laundry, or one home reset.",
    air:   "Send 3 messages you've been delaying and write tomorrow's top 3.",
    water: "Close 1 loop: tidy inbox, journal 5 lines, or release one open task.",
  },
};

export function getRecommendationTone(): RecommendationTone {
  if (typeof window === "undefined") return "gentle";
  const v = window.localStorage.getItem(TONE_KEY);
  return v === "actionable" ? "actionable" : "gentle";
}

export function getElementRecommendation(date: Date = new Date(), tone?: RecommendationTone): string {
  const el = getElementMeta(date).id;
  return TONE_RECOMMENDATIONS[tone ?? getRecommendationTone()][el];
}

export function useRecommendationTone(): [RecommendationTone, (v: RecommendationTone) => void] {
  const [tone, setTone] = useState<RecommendationTone>(getRecommendationTone);
  useEffect(() => {
    const handler = () => setTone(getRecommendationTone());
    window.addEventListener("storage", handler);
    window.addEventListener(TONE_EVENT, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(TONE_EVENT, handler);
    };
  }, []);
  const set = (v: RecommendationTone) => {
    window.localStorage.setItem(TONE_KEY, v);
    setTone(v);
    window.dispatchEvent(new Event(TONE_EVENT));
  };
  return [tone, set];
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
