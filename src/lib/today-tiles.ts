import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** xTiles-style tile layout for the Today dashboard.
 *  Per-tile: hidden yes/no, size step, and ordering. Persisted to localStorage. */

export type TileSize = "sm" | "md" | "lg" | "xl";

const K_HIDDEN = "careflow:today:tiles:hidden:v1";
const K_SIZES = "careflow:today:tiles:sizes:v1";
const K_ORDER = "careflow:today:tiles:order:v1";

function readJson<T>(k: string, fallback: T): T {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
    if (!v) return fallback;
    return JSON.parse(v) as T;
  } catch { return fallback; }
}
function writeJson(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ }
}

interface Ctx {
  editing: boolean;
  setEditing: (v: boolean) => void;
  hidden: Set<string>;
  toggleHidden: (id: string) => void;
  sizes: Record<string, TileSize>;
  cycleSize: (id: string) => void;
  setSize: (id: string, s: TileSize) => void;
  order: string[];
  registerTile: (id: string) => void;
  move: (id: string, dir: -1 | 1) => void;
  reset: () => void;
}

const TileCtx = createContext<Ctx | null>(null);

export function TileEditProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(readJson<string[]>(K_HIDDEN, [])));
  const [sizes, setSizes] = useState<Record<string, TileSize>>(() => readJson<Record<string, TileSize>>(K_SIZES, {}));
  const [order, setOrder] = useState<string[]>(() => readJson<string[]>(K_ORDER, []));

  useEffect(() => { writeJson(K_HIDDEN, Array.from(hidden)); }, [hidden]);
  useEffect(() => { writeJson(K_SIZES, sizes); }, [sizes]);
  useEffect(() => { writeJson(K_ORDER, order); }, [order]);

  const registerTile = useCallback((id: string) => {
    setOrder(prev => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const toggleHidden = useCallback((id: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const cycleSize = useCallback((id: string) => {
    const rot: TileSize[] = ["md", "lg", "xl", "sm"];
    setSizes(prev => {
      const cur = prev[id] ?? "md";
      const idx = rot.indexOf(cur);
      const next = rot[(idx + 1) % rot.length];
      return { ...prev, [id]: next };
    });
  }, []);

  const setSize = useCallback((id: string, s: TileSize) => {
    setSizes(prev => ({ ...prev, [id]: s }));
  }, []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setHidden(new Set());
    setSizes({});
    setOrder([]);
  }, []);

  const value = useMemo<Ctx>(() => ({
    editing, setEditing, hidden, toggleHidden, sizes, cycleSize, setSize, order, registerTile, move, reset,
  }), [editing, hidden, sizes, order, toggleHidden, cycleSize, setSize, registerTile, move, reset]);

  return createElement(TileCtx.Provider, { value }, children);
}

export function useTileEdit(): Ctx {
  const ctx = useContext(TileCtx);
  if (!ctx) throw new Error("useTileEdit must be used inside <TileEditProvider>");
  return ctx;
}

export const SIZE_TO_COL: Record<TileSize, string> = {
  sm: "lg:col-span-1",
  md: "lg:col-span-1",
  lg: "lg:col-span-2",
  xl: "lg:col-span-4",
};

export const SIZE_LABEL: Record<TileSize, string> = {
  sm: "S", md: "M", lg: "L", xl: "XL",
};