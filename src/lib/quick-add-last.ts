import type { QuickAddKind } from "@/lib/quick-add-presets";

const KEY = "careflow:quickadd:lastKind";

/** Kinds the minimal mobile flow supports. */
export const MINIMAL_KINDS: QuickAddKind[] = ["task", "appointment", "journal", "meal", "habit", "idea"];

export function getLastQuickAddKind(): QuickAddKind {
  try {
    const v = localStorage.getItem(KEY) as QuickAddKind | null;
    if (v && MINIMAL_KINDS.includes(v)) return v;
  } catch { /* ignore */ }
  return "task";
}

export function setLastQuickAddKind(kind: QuickAddKind) {
  try { localStorage.setItem(KEY, kind); } catch { /* ignore */ }
}
