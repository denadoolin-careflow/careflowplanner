import { useCallback, useEffect, useState } from "react";

/**
 * Generic widget-order + hidden hook. Each consumer passes its own
 * localStorage key prefix so multiple widget rails (Today / Week / Month) can
 * persist independently.
 */
export function useWidgetOrder(
  storageKey: string,
  canonical: string[],
  options?: { defaultHidden?: string[] },
): {
  order: string[];
  hidden: Set<string>;
  move: (id: string, dir: -1 | 1) => void;
  remove: (id: string) => void;
  restore: (id: string) => void;
  restoreAll: () => void;
  reset: () => void;
} {
  const ORDER_KEY = `${storageKey}:order`;
  const HIDDEN_KEY = `${storageKey}:hidden`;
  const INIT_KEY = `${storageKey}:init`;

  function readList(key: string): string[] {
    if (typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  function writeList(key: string, ids: string[]) {
    try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* noop */ }
  }

  const [stored, setStored] = useState<string[]>(() => readList(ORDER_KEY));
  const [hiddenList, setHiddenList] = useState<string[]>(() => {
    // First-run: seed defaultHidden so users get a curated starting set.
    const initialized = typeof localStorage !== "undefined" && localStorage.getItem(INIT_KEY) === "1";
    if (!initialized && options?.defaultHidden?.length) {
      const seeded = options.defaultHidden.filter(id => canonical.includes(id));
      writeList(HIDDEN_KEY, seeded);
      try { localStorage.setItem(INIT_KEY, "1"); } catch { /* noop */ }
      return seeded;
    }
    return readList(HIDDEN_KEY);
  });

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
      writeList(ORDER_KEY, arr);
      return arr;
    });
  }, [canonical, ORDER_KEY]);

  const reset = useCallback(() => {
    setStored([]);
    setHiddenList(options?.defaultHidden ?? []);
    try { localStorage.removeItem(ORDER_KEY); } catch { /* noop */ }
    writeList(HIDDEN_KEY, options?.defaultHidden ?? []);
  }, [ORDER_KEY, HIDDEN_KEY, options?.defaultHidden]);

  const remove = useCallback((id: string) => {
    setHiddenList(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeList(HIDDEN_KEY, next);
      return next;
    });
  }, [HIDDEN_KEY]);

  const restore = useCallback((id: string) => {
    setHiddenList(prev => {
      const next = prev.filter(x => x !== id);
      writeList(HIDDEN_KEY, next);
      return next;
    });
  }, [HIDDEN_KEY]);

  const restoreAll = useCallback(() => {
    setHiddenList([]);
    writeList(HIDDEN_KEY, []);
  }, [HIDDEN_KEY]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ORDER_KEY) setStored(readList(ORDER_KEY));
      if (e.key === HIDDEN_KEY) setHiddenList(readList(HIDDEN_KEY));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [ORDER_KEY, HIDDEN_KEY]);

  return { order, hidden, move, remove, restore, restoreAll, reset };
}