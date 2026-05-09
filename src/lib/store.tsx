import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { AppState, Task, Goal, Habit, JournalEntry, Meal, GroceryItem, Appointment, Birthday, Holiday, CareNote, CleaningTask, Idea, CareRecipient, Energy } from "./types";
import { seedState } from "./seed";

const KEY = "careflow:v1";
const newId = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);

interface Ctx {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  // Tasks
  addTask: (t: Partial<Task> & { title: string }) => void;
  toggleTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  // Goals
  addGoal: (g: Partial<Goal> & { title: string }) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  // Habits
  addHabit: (h: Partial<Habit> & { title: string }) => void;
  toggleHabit: (id: string, date?: string) => void;
  deleteHabit: (id: string) => void;
  // Journal
  addJournal: (j: Partial<JournalEntry> & { body: string }) => void;
  deleteJournal: (id: string) => void;
  // Meals
  addMeal: (m: Partial<Meal> & { name: string; date: string; slot: Meal["slot"] }) => void;
  deleteMeal: (id: string) => void;
  // Grocery
  addGrocery: (name: string, category?: string) => void;
  toggleGrocery: (id: string) => void;
  deleteGrocery: (id: string) => void;
  // Appointments
  addAppointment: (a: Partial<Appointment> & { title: string; date: string }) => void;
  deleteAppointment: (id: string) => void;
  // Birthdays / Holidays
  addBirthday: (b: Partial<Birthday> & { name: string; date: string }) => void;
  deleteBirthday: (id: string) => void;
  addHoliday: (h: Partial<Holiday> & { name: string; date: string }) => void;
  deleteHoliday: (id: string) => void;
  // Care
  addRecipient: (r: Partial<CareRecipient> & { name: string; kind: CareRecipient["kind"] }) => void;
  addCareNote: (n: Partial<CareNote> & { recipientId: string; body: string }) => void;
  deleteCareNote: (id: string) => void;
  // Cleaning
  addCleaning: (c: Partial<CleaningTask> & { title: string; zone: CleaningTask["zone"] }) => void;
  toggleCleaning: (id: string) => void;
  deleteCleaning: (id: string) => void;
  // Ideas
  addIdea: (i: Partial<Idea> & { title: string }) => void;
  deleteIdea: (id: string) => void;
  // Energy / settings
  setEnergyToday: (e: Energy) => void;
  setLowEnergyMode: (v: boolean) => void;
  setName: (n: string) => void;
  resetAll: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window === "undefined") return seedState();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return seedState();
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const upd = <K extends keyof AppState>(k: K, fn: (v: AppState[K]) => AppState[K]) =>
    setState(s => ({ ...s, [k]: fn(s[k]) }));

  const ctx: Ctx = {
    state, setState,
    addTask: (t) => upd("tasks", arr => [{ id: newId(), done: false, priority: "medium", area: "Personal", createdAt: todayISO(), ...t } as Task, ...arr]),
    toggleTask: (id) => upd("tasks", arr => arr.map(t => t.id === id ? { ...t, done: !t.done } : t)),
    updateTask: (id, patch) => upd("tasks", arr => arr.map(t => t.id === id ? { ...t, ...patch } : t)),
    deleteTask: (id) => upd("tasks", arr => arr.filter(t => t.id !== id)),

    addGoal: (g) => upd("goals", arr => [{ id: newId(), category: "Personal", timeline: "Q1", progress: 0, status: "active", ...g } as Goal, ...arr]),
    updateGoal: (id, patch) => upd("goals", arr => arr.map(g => g.id === id ? { ...g, ...patch } : g)),
    deleteGoal: (id) => upd("goals", arr => arr.filter(g => g.id !== id)),

    addHabit: (h) => upd("habits", arr => [{ id: newId(), cadence: "daily", category: "self-care", streak: 0, log: {}, ...h } as Habit, ...arr]),
    toggleHabit: (id, date) => upd("habits", arr => arr.map(h => {
      if (h.id !== id) return h;
      const d = date ?? todayISO();
      const log = { ...h.log, [d]: !h.log[d] };
      // recompute simple streak ending today
      let streak = 0;
      const cur = new Date();
      for (let i = 0; i < 365; i++) {
        const k = new Date(cur); k.setDate(k.getDate() - i);
        const ks = k.toISOString().slice(0,10);
        if (log[ks]) streak++; else break;
      }
      return { ...h, log, streak };
    })),
    deleteHabit: (id) => upd("habits", arr => arr.filter(h => h.id !== id)),

    addJournal: (j) => upd("journal", arr => [{ id: newId(), date: todayISO(), type: "daily", ...j } as JournalEntry, ...arr]),
    deleteJournal: (id) => upd("journal", arr => arr.filter(j => j.id !== id)),

    addMeal: (m) => upd("meals", arr => [{ id: newId(), ...m } as Meal, ...arr]),
    deleteMeal: (id) => upd("meals", arr => arr.filter(m => m.id !== id)),

    addGrocery: (name, category) => upd("grocery", arr => [{ id: newId(), name, bought: false, category } as GroceryItem, ...arr]),
    toggleGrocery: (id) => upd("grocery", arr => arr.map(g => g.id === id ? { ...g, bought: !g.bought } : g)),
    deleteGrocery: (id) => upd("grocery", arr => arr.filter(g => g.id !== id)),

    addAppointment: (a) => upd("appointments", arr => [{ id: newId(), type: "other", ...a } as Appointment, ...arr]),
    deleteAppointment: (id) => upd("appointments", arr => arr.filter(a => a.id !== id)),

    addBirthday: (b) => upd("birthdays", arr => [{ id: newId(), ...b } as Birthday, ...arr]),
    deleteBirthday: (id) => upd("birthdays", arr => arr.filter(b => b.id !== id)),
    addHoliday: (h) => upd("holidays", arr => [{ id: newId(), ...h } as Holiday, ...arr]),
    deleteHoliday: (id) => upd("holidays", arr => arr.filter(h => h.id !== id)),

    addRecipient: (r) => upd("recipients", arr => [{ id: newId(), ...r } as CareRecipient, ...arr]),
    addCareNote: (n) => upd("careNotes", arr => [{ id: newId(), date: todayISO(), ...n } as CareNote, ...arr]),
    deleteCareNote: (id) => upd("careNotes", arr => arr.filter(n => n.id !== id)),

    addCleaning: (c) => upd("cleaning", arr => [{ id: newId(), cadence: "weekly", done: false, ...c } as CleaningTask, ...arr]),
    toggleCleaning: (id) => upd("cleaning", arr => arr.map(c => c.id === id ? { ...c, done: !c.done, lastDone: !c.done ? todayISO() : c.lastDone } : c)),
    deleteCleaning: (id) => upd("cleaning", arr => arr.filter(c => c.id !== id)),

    addIdea: (i) => upd("ideas", arr => [{ id: newId(), category: "future plans", createdAt: todayISO(), ...i } as Idea, ...arr]),
    deleteIdea: (id) => upd("ideas", arr => arr.filter(i => i.id !== id)),

    setEnergyToday: (e) => setState(s => ({ ...s, energyToday: e, energyDate: todayISO() })),
    setLowEnergyMode: (v) => setState(s => ({ ...s, settings: { ...s.settings, lowEnergyMode: v } })),
    setName: (n) => setState(s => ({ ...s, settings: { ...s.settings, name: n } })),
    resetAll: () => setState(seedState()),
  };

  return <StoreCtx.Provider value={ctx}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}

export { todayISO };
