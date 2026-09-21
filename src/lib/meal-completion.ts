import { useEffect, useState } from "react";

const DONE_KEY = "careflow:meals-done:v1";
const DONE_EVENT = "careflow:meals-done-change";

function readDone(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(DONE_KEY) || "{}"); } catch { return {}; }
}

function writeDone(value: Record<string, boolean>) {
  try { localStorage.setItem(DONE_KEY, JSON.stringify(value)); } catch { /* no-op */ }
  window.dispatchEvent(new Event(DONE_EVENT));
}

export function useMealCompletion() {
  const [done, setDone] = useState<Record<string, boolean>>(() => readDone());

  useEffect(() => {
    const sync = () => setDone(readDone());
    const onStorage = (event: StorageEvent) => { if (event.key === DONE_KEY) sync(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(DONE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DONE_EVENT, sync);
    };
  }, []);

  const toggle = (id: string) => {
    setDone(previous => {
      const next = { ...previous, [id]: !previous[id] };
      writeDone(next);
      return next;
    });
  };

  return { done, toggle };
}