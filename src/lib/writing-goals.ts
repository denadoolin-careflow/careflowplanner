import { useEffect, useState } from "react";

const DAILY_GOAL_KEY = "careflow:writing-daily-goal";
const DAILY_GOAL_DEFAULT = 250;
const EVENT = "careflow:writing-daily-goal-change";

/** Strip markdown punctuation/syntax and count whitespace-separated words. */
export function countWords(input: string | null | undefined): number {
  if (!input) return 0;
  // Remove code fences, inline code, links/images URL parts, html tags, common md syntax
  const cleaned = input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

/** Approximate reading time in minutes at 220 wpm. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 220));
}

export function getDailyGoal(): number {
  try {
    const v = localStorage.getItem(DAILY_GOAL_KEY);
    if (!v) return DAILY_GOAL_DEFAULT;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : DAILY_GOAL_DEFAULT;
  } catch {
    return DAILY_GOAL_DEFAULT;
  }
}

export function setDailyGoal(n: number) {
  try {
    localStorage.setItem(DAILY_GOAL_KEY, String(Math.max(10, Math.round(n))));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function useDailyGoal(): [number, (n: number) => void] {
  const [goal, setGoalState] = useState<number>(() => getDailyGoal());
  useEffect(() => {
    const onChange = () => setGoalState(getDailyGoal());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return [goal, (n: number) => { setDailyGoal(n); setGoalState(n); }];
}
