import { useEffect, useState } from "react";
import type { ResetChecklist, ResetItem } from "./reset-checklists";

export interface ResetFocus {
  listId: string | null;
  itemId: string | null;
  /** When true, on complete auto-load next incomplete item in the same list. */
  cycle: boolean;
  label: string;
}

const initial: ResetFocus = { listId: null, itemId: null, cycle: false, label: "" };
let state: ResetFocus = { ...initial };
const listeners = new Set<(s: ResetFocus) => void>();

function emit() { listeners.forEach(l => l(state)); }

export const resetFocus = {
  get() { return state; },
  set(next: Partial<ResetFocus>) {
    state = { ...state, ...next };
    emit();
  },
  clear() { state = { ...initial }; emit(); },
  focusItem(list: ResetChecklist, item: ResetItem, opts?: { cycle?: boolean }) {
    state = {
      listId: list.id,
      itemId: item.id,
      cycle: !!opts?.cycle,
      label: item.title,
    };
    emit();
  },
};

export function useResetFocus(): ResetFocus {
  const [s, setS] = useState(state);
  useEffect(() => { listeners.add(setS); return () => { listeners.delete(setS); }; }, []);
  return s;
}