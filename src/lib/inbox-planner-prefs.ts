import { useEffect, useState } from "react";

export type InboxViewMode = "list" | "schedule";

const KEY = "careflow:inbox:view-mode";

function read(): InboxViewMode {
  if (typeof window === "undefined") return "list";
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw === "schedule" ? "schedule" : "list";
  } catch { return "list"; }
}

export function useInboxViewMode(): [InboxViewMode, (v: InboxViewMode) => void] {
  const [mode, setMode] = useState<InboxViewMode>(read);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setMode(read()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const set = (v: InboxViewMode) => {
    setMode(v);
    try { window.localStorage.setItem(KEY, v); } catch { /* noop */ }
  };
  return [mode, set];
}