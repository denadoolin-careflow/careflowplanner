import { useCallback, useEffect, useState } from "react";

const KEY = "careflow:today:sidebar-order:v1";
const HIDDEN_KEY = "careflow:today:sidebar-hidden:v1";

function read(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* noop */ }
}

function readHidden(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeHidden(ids: string[]) {
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids)); } catch { /* noop */ }
}

/**
 * Returns the user's ordering of sidebar widgets, merged with the canonical
 * registry order. Newly registered widgets are appended automatically.
 */
export function useSidebarOrder(canonical: string[]): {
  order: string[];
  hidden: Set<string>;
  move: (id: string, dir: -1 | 1) => void;
  remove: (id: string) => void;
  restore: (id: string) => void;
  restoreAll: () => void;
  reset: () => void;
} {
  const [stored, setStored] = useState<string[]>(read);
  const [hiddenList, setHiddenList] = useState<string[]>(readHidden);

  // Merge: keep stored ids that still exist, then append any new canonical ids.
  const order = (() => {
    const known = new Set(canonical);
    const kept = stored.filter(id => known.has(id));
    const appended = canonical.filter(id => !kept.includes(id));
    return [...kept, ...appended];
  })();
  const hidden = new Set(hiddenList.filter(id => canonical.includes(id)));

  const move = useCallback((id: string, dir: -1 | 1) => {
    setStored(prev => {
      const known = new Set(canonical);
      const cur = (prev.length ? prev.filter(x => known.has(x)) : [...canonical]);
      for (const c of canonical) if (!cur.includes(c)) cur.push(c);
      const idx = cur.indexOf(id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= cur.length) return cur;
      const arr = cur.slice();
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      write(arr);
      return arr;
    });
  }, [canonical]);

  const reset = useCallback(() => {
    setStored([]);
    setHiddenList([]);
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
    try { localStorage.removeItem(HIDDEN_KEY); } catch { /* noop */ }
  }, []);

  const remove = useCallback((id: string) => {
    setHiddenList(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeHidden(next);
      return next;
    });
  }, []);

  const restore = useCallback((id: string) => {
    setHiddenList(prev => {
      const next = prev.filter(x => x !== id);
      writeHidden(next);
      return next;
    });
  }, []);

  const restoreAll = useCallback(() => {
    setHiddenList([]);
    writeHidden([]);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setStored(read());
      if (e.key === HIDDEN_KEY) setHiddenList(readHidden());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { order, hidden, move, remove, restore, restoreAll, reset };
}