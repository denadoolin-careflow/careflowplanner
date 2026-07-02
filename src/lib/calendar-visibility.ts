import { useEffect, useState } from "react";

const KEY = "careflow:calendars:hidden:v1";
const listeners = new Set<(v: string[]) => void>();

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

let hidden = read();

export function isCalendarHidden(id: string) { return hidden.includes(id); }
export function toggleCalendar(id: string) {
  hidden = hidden.includes(id) ? hidden.filter(x => x !== id) : [...hidden, id];
  try { localStorage.setItem(KEY, JSON.stringify(hidden)); } catch {}
  listeners.forEach(l => l(hidden));
}

export function useHiddenCalendars(): [string[], (id: string) => void] {
  const [v, setV] = useState<string[]>(hidden);
  useEffect(() => { listeners.add(setV); return () => { listeners.delete(setV); }; }, []);
  return [v, toggleCalendar];
}