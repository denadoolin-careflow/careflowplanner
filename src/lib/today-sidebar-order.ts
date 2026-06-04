import { useCallback, useEffect, useState } from "react";

const KEY = "careflow:today:sidebar-order:v1";

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

/**
 * Returns the user's ordering of sidebar widgets, merged with the canonical
 * registry order. Newly registered widgets are appended automatically.
 */
export function useSidebarOrder(canonical: string[]): {
  order: string[];
  move: (id: string, dir: -1 | 1) => void;
  reset: () => void;
} {
  const [stored, setStored] = useState<string[]>(read);

  // Merge: keep stored ids that still exist, then append any new canonical ids.
  const order = (() => {
    const known = new Set(canonical);
    const kept = stored.filter(id => known.has(id));
    const appended = canonical.filter(id => !kept.includes(id));
    return [...kept, ...appended];
  })();

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
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setStored(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { order, move, reset };
}