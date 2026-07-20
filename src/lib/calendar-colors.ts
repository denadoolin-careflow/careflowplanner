import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { ATMOSPHERES } from "@/lib/atmospheres";

export type KindKey =
  | "task" | "appt" | "care" | "meal" | "bday"
  | "hol" | "gcal" | "season" | "cosmic";

export const KIND_LABEL: Record<KindKey, string> = {
  task: "Tasks",
  appt: "Appointments",
  care: "Caregiving",
  meal: "Meals",
  bday: "Birthdays",
  hol: "Holidays",
  gcal: "Google",
  season: "Celebrations",
  cosmic: "Cosmic",
};

/** Default per-kind hex, chosen to line up with existing tailwind swatches. */
export const DEFAULT_KIND_HEX: Record<KindKey, string> = {
  task: "#10b981",   // emerald-500
  appt: "#0ea5e9",   // sky-500
  care: "#f43f5e",   // rose-500
  meal: "#f59e0b",   // amber-500
  bday: "#d946ef",   // fuchsia-500
  hol:  "#14b8a6",   // teal-500
  gcal: "#64748b",   // slate-500
  season: "#ec4899", // pink-500
  cosmic: "#6366f1", // indigo-500
};

/** Curated warm/soft palette — matches the existing CareFlow design system. */
export const CALENDAR_PALETTE: string[] = [
  "#f43f5e", // rose
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#14b8a6", // teal
  "#0ea5e9", // sky
  "#6366f1", // indigo
  "#a855f7", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#64748b", // slate
];

export type CalendarPaletteGroup = { id: string; name: string; colors: string[] };

function dedupeHex(colors: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of colors) {
    const v = c.toLowerCase();
    if (!seen.has(v)) { seen.add(v); out.push(v); }
  }
  return out;
}

/** Signature palette + one palette per Atmosphere so calendar colors can match app moods. */
export const CALENDAR_PALETTE_GROUPS: CalendarPaletteGroup[] = [
  { id: "signature", name: "Signature", colors: CALENDAR_PALETTE.map(c => c.toLowerCase()) },
  ...ATMOSPHERES.map(a => ({
    id: a.id,
    name: a.name,
    colors: dedupeHex(a.palette),
  })),
];

export type KindColorMap = Partial<Record<KindKey, string>>;

const STORAGE_PREFIX = "careflow.calendar.kind-colors.v1";
const EVENT = "careflow:kind-colors-changed";

function storageKey(userId?: string | null): string {
  return `${STORAGE_PREFIX}:${userId ?? "anon"}`;
}

function readOverrides(userId?: string | null): KindColorMap {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeOverrides(userId: string | null | undefined, next: KindColorMap) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {}
}

/** Per-user (localStorage) hex overrides for calendar event categories. */
export function useKindColors(): {
  overrides: KindColorMap;
  colorOf: (k: KindKey) => string;
  setColor: (k: KindKey, hex: string) => void;
  resetOne: (k: KindKey) => void;
  resetAll: () => void;
} {
  const { user } = useStore();
  const userId = user?.id ?? null;
  const [overrides, setOverrides] = useState<KindColorMap>(() => readOverrides(userId));

  useEffect(() => { setOverrides(readOverrides(userId)); }, [userId]);
  useEffect(() => {
    const refresh = () => setOverrides(readOverrides(userId));
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [userId]);

  const colorOf = (k: KindKey) => overrides[k] ?? DEFAULT_KIND_HEX[k];
  const setColor = (k: KindKey, hex: string) => {
    const next = { ...overrides, [k]: hex };
    setOverrides(next);
    writeOverrides(userId, next);
  };
  const resetOne = (k: KindKey) => {
    const next = { ...overrides };
    delete next[k];
    setOverrides(next);
    writeOverrides(userId, next);
  };
  const resetAll = () => {
    setOverrides({});
    writeOverrides(userId, {});
  };

  return { overrides, colorOf, setColor, resetOne, resetAll };
}

/** Turn a hex into inline styles for a calendar chip/card/pill. */
export function kindStyleFromHex(hex: string): {
  card: React.CSSProperties;
  pill: React.CSSProperties;
  dot: React.CSSProperties;
} {
  return {
    // Card / block: soft tint + colored left border.
    card: {
      backgroundColor: `${hex}26`,     // ~15% alpha
      borderColor: `${hex}66`,          // ~40% alpha
      borderLeftColor: hex,
    },
    // Filter pill: same tint, no left border accent needed.
    pill: {
      backgroundColor: `${hex}26`,
      borderColor: `${hex}66`,
    },
    dot: { backgroundColor: hex },
  };
}

/** Read overrides synchronously (for non-React callers). */
export function getKindColorSync(kind: KindKey, userId?: string | null): string {
  return readOverrides(userId)[kind] ?? DEFAULT_KIND_HEX[kind];
}