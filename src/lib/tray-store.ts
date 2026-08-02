import { useEffect, useState } from "react";

export interface TrayNote {
  id: string;
  text: string;
  updatedAt: number;
}

export interface TrayState {
  notes: TrayNote[];
  taskIds: string[];
  open: boolean;
  tab: "notepad" | "tray";
}

const KEY = "careflow.tray.v1";

const DEFAULT: TrayState = { notes: [], taskIds: [], open: false, tab: "notepad" };

function read(): TrayState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<TrayState>;
    return {
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      taskIds: Array.isArray(parsed.taskIds) ? parsed.taskIds : [],
      open: !!parsed.open,
      tab: parsed.tab === "tray" ? "tray" : "notepad",
    };
  } catch { return DEFAULT; }
}

let state: TrayState = typeof window === "undefined" ? DEFAULT : read();
const listeners = new Set<() => void>();

function commit(next: TrayState) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach(l => l());
}

export const tray = {
  get: () => state,
  setOpen: (open: boolean) => commit({ ...state, open }),
  setTab: (tab: TrayState["tab"]) => commit({ ...state, tab }),
  addNote: (text = "") => {
    const note: TrayNote = { id: crypto.randomUUID(), text, updatedAt: Date.now() };
    commit({ ...state, notes: [note, ...state.notes] });
    return note.id;
  },
  updateNote: (id: string, text: string) =>
    commit({ ...state, notes: state.notes.map(n => n.id === id ? { ...n, text, updatedAt: Date.now() } : n) }),
  removeNote: (id: string) => commit({ ...state, notes: state.notes.filter(n => n.id !== id) }),
  addTask: (taskId: string) =>
    commit({ ...state, taskIds: state.taskIds.includes(taskId) ? state.taskIds : [taskId, ...state.taskIds] }),
  removeTask: (taskId: string) => commit({ ...state, taskIds: state.taskIds.filter(id => id !== taskId) }),
  clearTasks: () => commit({ ...state, taskIds: [] }),
};

export function useTray(): TrayState {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force(x => x + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return state;
}