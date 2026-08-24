/**
 * Which care people show on Today. Empty selection = automatic (capacity-aware
 * first few), which is the previous behaviour.
 */
import { useCallback, useEffect, useState } from "react";

const KEY = "careflow:today:care-people";
const EVENT = "careflow:today:care-people-changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* private mode */ }
}

export function useTodayCarePeople() {
  const [ids, setIds] = useState<string[]>(read);

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const next = read();
    const i = next.indexOf(id);
    if (i >= 0) next.splice(i, 1); else next.push(id);
    write(next);
    setIds(next);
  }, []);

  const clear = useCallback(() => { write([]); setIds([]); }, []);

  return { selectedIds: ids, toggle, clear, isAuto: ids.length === 0 };
}
