/**
 * One task selection shared by every weekly view. Select rows in List, switch
 * to Table, and the selection is still there — bulk actions follow you.
 */
import { useCallback, useEffect, useState } from "react";

let ids = new Set<string>();
const subs = new Set<(s: Set<string>) => void>();

function publish(next: Set<string>) {
  ids = next;
  subs.forEach(fn => fn(next));
}

export function usePlannerSelection() {
  const [selected, setSelected] = useState<Set<string>>(ids);

  useEffect(() => {
    subs.add(setSelected);
    return () => { subs.delete(setSelected); };
  }, []);

  const toggle = useCallback((id: string) => {
    const next = new Set(ids);
    next.has(id) ? next.delete(id) : next.add(id);
    publish(next);
  }, []);

  const replace = useCallback((list: string[]) => publish(new Set(list)), []);
  const clear = useCallback(() => publish(new Set()), []);
  const has = useCallback((id: string) => selected.has(id), [selected]);

  return { selected, ids: Array.from(selected), toggle, replace, clear, has };
}
