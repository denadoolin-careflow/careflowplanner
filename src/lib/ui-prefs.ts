import { useEffect, useState } from "react";

const SIDEBAR_DOTS_KEY = "careflow.ui.sidebarDots";
const EVT = "careflow:ui-prefs-changed";

function read(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  if (v === null) return fallback;
  return v === "1";
}

function write(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
    window.dispatchEvent(new CustomEvent(EVT, { detail: { key, value } }));
  } catch {}
}

export function useSidebarDotsEnabled(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => read(SIDEBAR_DOTS_KEY, true));
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.key !== SIDEBAR_DOTS_KEY) return;
      setEnabled(!!detail.value);
    };
    window.addEventListener(EVT, onChange);
    return () => window.removeEventListener(EVT, onChange);
  }, []);
  return [enabled, (next: boolean) => { setEnabled(next); write(SIDEBAR_DOTS_KEY, next); }];
}