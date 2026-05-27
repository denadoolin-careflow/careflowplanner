import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

interface SelectionCtx {
  selected: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string, opts?: { shift?: boolean; meta?: boolean }) => void;
  selectOnly: (id: string | null) => void;
  clear: () => void;
  count: number;
  /** Ordered ids of currently visible rows; used for shift-range selection. */
  setOrderedIds: (ids: string[]) => void;
  /** Ordered ids of currently visible rows (read-only access for callers). */
  orderedIds: () => string[];
  /** Select-mode: when true, tapping a task toggles its selection. */
  selectionMode: boolean;
  setSelectionMode: (v: boolean) => void;
  toggleSelectionMode: () => void;
  selectAll: () => void;
  paneOpen: boolean;
  setPaneOpen: (v: boolean) => void;
  togglePane: () => void;
}

const Ctx = createContext<SelectionCtx | null>(null);

export function TaskSelectionProvider({ children, storageKey }: { children: ReactNode; storageKey?: string }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [selectionMode, setSelectionModeState] = useState(false);
  const [paneOpen, setPaneOpenState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return storageKey ? localStorage.getItem(`pane:${storageKey}`) === "1" : false;
  });
  const orderedRef = useRef<string[]>([]);
  const lastIdRef = useRef<string | null>(null);

  const setOrderedIds = useCallback((ids: string[]) => { orderedRef.current = ids; }, []);
  const orderedIds = useCallback(() => orderedRef.current.slice(), []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string, opts?: { shift?: boolean; meta?: boolean }) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (opts?.shift && lastIdRef.current && orderedRef.current.length) {
        const a = orderedRef.current.indexOf(lastIdRef.current);
        const b = orderedRef.current.indexOf(id);
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) next.add(orderedRef.current[i]);
          lastIdRef.current = id;
          return next;
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      lastIdRef.current = id;
      return next;
    });
  }, []);

  const selectOnly = useCallback((id: string | null) => {
    setSelected(id ? new Set([id]) : new Set());
    lastIdRef.current = id;
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
    lastIdRef.current = null;
    setSelectionModeState(false);
  }, []);

  const setSelectionMode = useCallback((v: boolean) => {
    setSelectionModeState(v);
    if (!v) { setSelected(new Set()); lastIdRef.current = null; }
  }, []);
  const toggleSelectionMode = useCallback(() => setSelectionMode(!selectionMode), [selectionMode, setSelectionMode]);
  const selectAll = useCallback(() => {
    setSelected(new Set(orderedRef.current));
    setSelectionModeState(true);
  }, []);

  const setPaneOpen = useCallback((v: boolean) => {
    setPaneOpenState(v);
    if (storageKey) localStorage.setItem(`pane:${storageKey}`, v ? "1" : "0");
  }, [storageKey]);
  const togglePane = useCallback(() => setPaneOpen(!paneOpen), [paneOpen, setPaneOpen]);

  const value = useMemo<SelectionCtx>(() => ({
    selected, isSelected, toggle, selectOnly, clear,
    count: selected.size, setOrderedIds, orderedIds,
    selectionMode, setSelectionMode, toggleSelectionMode, selectAll,
    paneOpen, setPaneOpen, togglePane,
  }), [selected, isSelected, toggle, selectOnly, clear, setOrderedIds, orderedIds, selectionMode, setSelectionMode, toggleSelectionMode, selectAll, paneOpen, setPaneOpen, togglePane]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTaskSelection(): SelectionCtx {
  const v = useContext(Ctx);
  if (!v) {
    // Safe no-op fallback so TaskRow can be used outside a provider.
    return {
      selected: new Set(),
      isSelected: () => false,
      toggle: () => {},
      selectOnly: () => {},
      clear: () => {},
      count: 0,
      setOrderedIds: () => {},
      orderedIds: () => [],
      selectionMode: false,
      setSelectionMode: () => {},
      toggleSelectionMode: () => {},
      selectAll: () => {},
      paneOpen: false,
      setPaneOpen: () => {},
      togglePane: () => {},
    };
  }
  return v;
}