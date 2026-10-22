/** New-moon life-area goal suggestion: which house the latest new moon lights up, plus goal + first-step ideas. */
import { addDays, format, subMonths } from "date-fns";
import { monthRhythmMoments } from "@/lib/cosmic/lunar-rhythm";
import { bodyLongitude } from "@/lib/cosmic/astro/bodies";
import { houseOf, type HouseCusps } from "@/lib/cosmic/astro/houses";

export const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
export const SUGGESTION_WINDOW_DAYS = 2;

export const HOUSE_IDEAS: Record<number, { goal: string; step: string }[]> = {
  1: [{ goal: "Feel more at home in my body this cycle", step: "Take a 10-minute walk just for me" }, { goal: "Show up as myself with more ease", step: "Write three words for how I want to feel" }],
  2: [{ goal: "Build a calmer money rhythm", step: "Check one account balance and note it" }, { goal: "Spend in line with what I value", step: "List my top three values for spending" }],
  3: [{ goal: "Stay in touch with the people close by", step: "Send one check-in message" }, { goal: "Learn something small and steady", step: "Pick one article or lesson to finish" }],
  4: [{ goal: "Create a calmer home base this cycle", step: "Clear one surface that drains you" }, { goal: "Strengthen family rhythms", step: "Plan one shared family meal" }],
  5: [{ goal: "Make room for play and creativity", step: "Block 20 minutes for something fun" }, { goal: "Start a small creative project", step: "Gather what I need in one place" }],
  6: [{ goal: "Steady my daily care routines", step: "Set out tomorrow's water and meds tonight" }, { goal: "Ease my workload", step: "Pick one task to delegate or drop" }],
  7: [{ goal: "Deepen a key partnership", step: "Plan one unhurried conversation" }, { goal: "Share the load with a partner", step: "Ask for help with one specific thing" }],
  8: [{ goal: "Get clear on shared money or debts", step: "List every shared bill in one note" }, { goal: "Make space for healing", step: "Journal for 10 minutes on what's heavy" }],
  9: [{ goal: "Grow through learning or travel", step: "Choose one course, book or trip to explore" }, { goal: "Reconnect with what I believe", step: "Write down one belief that guides me" }],
  10: [{ goal: "Take a clear step in my purpose", step: "Name the next milestone and its date" }, { goal: "Grow my reputation gently", step: "Update one profile or portfolio piece" }],
  11: [{ goal: "Nurture friendships and community", step: "Invite one friend to something" }, { goal: "Move toward a future hope", step: "Write the hope down in one sentence" }],
  12: [{ goal: "Protect rest and quiet time", step: "Block one hour with nothing scheduled" }, { goal: "Tend my inner life", step: "Sit quietly for five minutes" }],
};

export interface NewMoonInfo { date: Date; iso: string; sign: string; house: number }

/** Latest new moon on or before `date`, only while within the suggestion window. */
export function activeNewMoon(date: Date, cusps?: HouseCusps | null): NewMoonInfo | null {
  const moments = [...monthRhythmMoments(subMonths(date, 1)), ...monthRhythmMoments(date)]
    .filter(m => m.phase === "plan" && m.date <= date);
  const nm = moments[moments.length - 1];
  if (!nm) return null;
  if (format(date, "yyyy-MM-dd") > format(addDays(nm.date, SUGGESTION_WINDOW_DAYS), "yyyy-MM-dd")) return null;
  const lon = bodyLongitude("Moon", nm.date);
  return { date: nm.date, iso: format(nm.date, "yyyy-MM-dd"), sign: SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)], house: houseForLongitude(lon, cusps) };
}

/** Natal house when a chart is available, else the sign's natural house (Aries = 1). */
export function houseForLongitude(lon: number, cusps?: HouseCusps | null): number {
  if (cusps) return houseOf(lon, cusps);
  return Math.floor((((lon % 360) + 360) % 360) / 30) + 1;
}

export function ideaFor(house: number, index: number) {
  const list = HOUSE_IDEAS[house] ?? HOUSE_IDEAS[1];
  return list[((index % list.length) + list.length) % list.length];
}

const key = (iso: string) => `careflow:new-moon-goal:${iso}`;
export interface SuggestionState { index: number; dismissed?: boolean; addedGoalId?: string; addedTaskId?: string }
export function readSuggestionState(iso: string): SuggestionState {
  try { return { index: 0, ...JSON.parse(localStorage.getItem(key(iso)) ?? "{}") }; } catch { return { index: 0 }; }
}
export function writeSuggestionState(iso: string, s: SuggestionState) { localStorage.setItem(key(iso), JSON.stringify(s)); }
