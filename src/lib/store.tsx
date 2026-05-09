import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  AppState, Task, Goal, Habit, JournalEntry, Meal, GroceryItem,
  Appointment, Birthday, Holiday, CareNote, CleaningTask, Idea,
  CareRecipient, Energy,
} from "./types";
import { seedState, newUserSeed } from "./seed";

const todayISO = () => new Date().toISOString().slice(0, 10);
export { todayISO };

/* ---------- mappers (db row <-> app shape) ---------- */
const taskFrom = (r: any): Task => ({
  id: r.id, title: r.title, notes: r.notes ?? undefined, done: r.done,
  dueDate: r.due_date ?? undefined, priority: r.priority, area: r.area,
  tags: r.tags ?? [], energy: r.energy ?? undefined, estMinutes: r.est_minutes ?? undefined,
  goalId: r.goal_id ?? undefined, recipientId: r.recipient_id ?? undefined,
  dayPart: r.day_part ?? undefined, isTopThree: r.is_top_three,
  createdAt: r.created_at, status: r.status, sortOrder: r.sort_order,
  recurrenceType: r.recurrence_type, recurrenceInterval: r.recurrence_interval,
  recurrenceDays: r.recurrence_days ?? [], nextDueDate: r.next_due_date ?? undefined,
  lastCompletedAt: r.last_completed_at ?? undefined, autoReset: r.auto_reset,
});
const taskTo = (t: Partial<Task>) => ({
  title: t.title, notes: t.notes ?? null, done: t.done,
  due_date: t.dueDate ?? null, priority: t.priority, area: t.area,
  tags: t.tags ?? [], energy: t.energy ?? null, est_minutes: t.estMinutes ?? null,
  goal_id: t.goalId ?? null, recipient_id: t.recipientId ?? null,
  day_part: t.dayPart ?? null, is_top_three: t.isTopThree ?? false,
  status: t.status ?? "active", sort_order: t.sortOrder ?? 0,
  recurrence_type: t.recurrenceType ?? "none",
  recurrence_interval: t.recurrenceInterval ?? 1,
  recurrence_days: t.recurrenceDays ?? [],
  next_due_date: t.nextDueDate ?? null,
  last_completed_at: t.lastCompletedAt ?? null,
  auto_reset: t.autoReset ?? false,
});
const goalFrom = (r: any): Goal => ({ id: r.id, title: r.title, description: r.description ?? undefined, category: r.category, timeline: r.timeline, progress: r.progress, status: r.status });
const habitFrom = (r: any): Habit => ({ id: r.id, title: r.title, cadence: r.cadence, category: r.category, streak: r.streak, log: {} });
const journalFrom = (r: any): JournalEntry => ({ id: r.id, date: r.date, type: r.type, title: r.title ?? undefined, body: r.body, mood: r.mood ?? undefined });
const mealFrom = (r: any): Meal => ({ id: r.id, date: r.date, slot: r.slot, name: r.name, notes: r.notes ?? undefined, kidSafe: r.kid_safe });
const groceryFrom = (r: any): GroceryItem => ({ id: r.id, name: r.name, qty: r.qty ?? undefined, bought: r.bought, category: r.category ?? undefined });
const apptFrom = (r: any): Appointment => ({ id: r.id, date: r.date, time: r.time ?? undefined, title: r.title, with: r.with_name ?? undefined, location: r.location ?? undefined, recipientId: r.recipient_id ?? undefined, type: r.type ?? undefined });
const bdayFrom = (r: any): Birthday => ({ id: r.id, name: r.name, date: r.date, relation: r.relation ?? undefined, notes: r.notes ?? undefined });
const holidayFrom = (r: any): Holiday => ({ id: r.id, name: r.name, date: r.date, notes: r.notes ?? undefined });
const recipFrom = (r: any): CareRecipient => ({ id: r.id, name: r.name, kind: r.kind, notes: r.notes ?? undefined, sensory: r.sensory ?? undefined, contacts: r.contacts ?? [], meds: r.meds ?? [] });
const careNoteFrom = (r: any): CareNote => ({ id: r.id, recipientId: r.recipient_id, date: r.date, body: r.body, tag: r.tag ?? undefined });
const cleanFrom = (r: any): CleaningTask => ({ id: r.id, title: r.title, zone: r.zone, cadence: r.cadence, done: r.done, lastDone: r.last_done ?? undefined, weekday: r.weekday ?? undefined, recurrenceType: r.recurrence_type, recurrenceDays: r.recurrence_days ?? [], nextDueDate: r.next_due_date ?? undefined, autoReset: r.auto_reset, sortOrder: r.sort_order });
const ideaFrom = (r: any): Idea => ({ id: r.id, title: r.title, notes: r.notes ?? undefined, category: r.category, createdAt: r.created_at });

/* ---------- context ---------- */
interface Ctx {
  state: AppState;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;

  addTask: (t: Partial<Task> & { title: string }) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addGoal: (g: Partial<Goal> & { title: string }) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  addHabit: (h: Partial<Habit> & { title: string }) => Promise<void>;
  toggleHabit: (id: string, date?: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;

  addJournal: (j: Partial<JournalEntry> & { body: string }) => Promise<void>;
  deleteJournal: (id: string) => Promise<void>;

  addMeal: (m: Partial<Meal> & { name: string; date: string; slot: Meal["slot"] }) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;

  addGrocery: (name: string, category?: string) => Promise<void>;
  toggleGrocery: (id: string) => Promise<void>;
  deleteGrocery: (id: string) => Promise<void>;

  addAppointment: (a: Partial<Appointment> & { title: string; date: string }) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;

  addBirthday: (b: Partial<Birthday> & { name: string; date: string }) => Promise<void>;
  deleteBirthday: (id: string) => Promise<void>;
  addHoliday: (h: Partial<Holiday> & { name: string; date: string }) => Promise<void>;
  deleteHoliday: (id: string) => Promise<void>;

  addRecipient: (r: Partial<CareRecipient> & { name: string; kind: CareRecipient["kind"] }) => Promise<void>;
  addCareNote: (n: Partial<CareNote> & { recipientId: string; body: string }) => Promise<void>;
  deleteCareNote: (id: string) => Promise<void>;

  addCleaning: (c: Partial<CleaningTask> & { title: string; zone: CleaningTask["zone"] }) => Promise<void>;
  toggleCleaning: (id: string) => Promise<void>;
  deleteCleaning: (id: string) => Promise<void>;
  regenerateWeeklyReset: () => Promise<void>;
  resetThisWeek: () => Promise<void>;

  addIdea: (i: Partial<Idea> & { title: string }) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;

  setEnergyToday: (e: Energy) => Promise<void>;
  setLowEnergyMode: (v: boolean) => Promise<void>;
  setName: (n: string) => Promise<void>;
  updateProfile: (patch: { name?: string; planning_style?: string; time_zone?: string; theme?: string }) => Promise<void>;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => seedState());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const seededRef = useRef(false);

  /* auth subscription (listener BEFORE getSession) */
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (!data.session) setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* load all data when user changes */
  const reload = useCallback(async (uid: string) => {
    const tables = [
      "tasks", "goals", "habits", "habit_logs", "journal_entries", "meals",
      "grocery_items", "appointments", "birthdays", "holidays", "care_recipients",
      "care_notes", "cleaning_tasks", "ideas", "profiles",
    ] as const;
    const results = await Promise.all(tables.map(t =>
      supabase.from(t).select("*").order("created_at", { ascending: false } as any)
    ));
    const [tasks, goals, habits, habitLogs, journal, meals, grocery, appts, bdays, holidays, recipients, careNotes, cleaning, ideas, profiles] = results.map(r => r.data ?? []);
    const profile: any = profiles[0] ?? {};
    // attach habit logs
    const logsByHabit: Record<string, Record<string, boolean>> = {};
    for (const l of habitLogs as any[]) {
      logsByHabit[l.habit_id] = logsByHabit[l.habit_id] ?? {};
      logsByHabit[l.habit_id][l.date] = l.done;
    }
    setState({
      settings: {
        name: profile.name ?? "",
        lowEnergyMode: !!profile.low_energy_mode,
        theme: profile.theme ?? "system",
        email: profile.email,
        planningStyle: profile.planning_style,
        timeZone: profile.time_zone,
      },
      energyToday: profile.energy_today ?? undefined,
      energyDate: profile.energy_date ?? undefined,
      tasks: (tasks as any[]).map(taskFrom),
      goals: (goals as any[]).map(goalFrom),
      habits: (habits as any[]).map(h => ({ ...habitFrom(h), log: logsByHabit[h.id] ?? {} })),
      journal: (journal as any[]).map(journalFrom),
      meals: (meals as any[]).map(mealFrom),
      grocery: (grocery as any[]).map(groceryFrom),
      appointments: (appts as any[]).map(apptFrom),
      birthdays: (bdays as any[]).map(bdayFrom),
      holidays: (holidays as any[]).map(holidayFrom),
      recipients: (recipients as any[]).map(recipFrom),
      careNotes: (careNotes as any[]).map(careNoteFrom),
      cleaning: (cleaning as any[]).map(cleanFrom).sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      ideas: (ideas as any[]).map(ideaFrom),
      resetTemplates: seedState().resetTemplates,
    });
    // first-time seed: if no tasks AND no cleaning, insert sample data
    if (!seededRef.current && tasks.length === 0 && cleaning.length === 0) {
      seededRef.current = true;
      const seed = newUserSeed(uid);
      await Promise.all(Object.entries(seed).map(([table, rows]) =>
        supabase.from(table as any).insert(rows as any)
      ));
      await reload(uid);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setState(seedState());
      setLoading(false);
      return;
    }
    setLoading(true);
    reload(user.id).finally(() => setLoading(false));
  }, [user, reload]);

  /* helpers */
  const refreshSlice = async <K extends keyof AppState>(table: string, key: K, mapper: (r:any)=>any) => {
    const { data } = await supabase.from(table as any).select("*").order("created_at", { ascending: false } as any);
    setState(s => ({ ...s, [key]: (data ?? []).map(mapper) } as AppState));
  };

  const uid = user?.id;

  const ctx: Ctx = {
    state, user, loading,
    signOut: async () => { await supabase.auth.signOut(); },

    addTask: async (t) => {
      if (!uid) return;
      const { data } = await supabase.from("tasks").insert({ user_id: uid, ...taskTo({ done: false, priority: "medium", area: "Personal", ...t }) }).select().single();
      if (data) setState(s => ({ ...s, tasks: [taskFrom(data), ...s.tasks] }));
    },
    toggleTask: async (id) => {
      const cur = state.tasks.find(t => t.id === id); if (!cur) return;
      const next = !cur.done;
      setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, done: next } : t) })); // optimistic
      await supabase.from("tasks").update({ done: next, last_completed_at: next ? new Date().toISOString() : null }).eq("id", id);
      // recurrence: if task was just completed and recurs, generate next occurrence
      if (next && cur.recurrenceType && cur.recurrenceType !== "none" && cur.dueDate) {
        const base = new Date(cur.dueDate);
        const interval = cur.recurrenceInterval ?? 1;
        const add = cur.recurrenceType === "daily" ? interval :
                    cur.recurrenceType === "weekly" ? 7 * interval :
                    cur.recurrenceType === "monthly" ? 30 * interval : 7;
        base.setDate(base.getDate() + add);
        const nextDate = base.toISOString().slice(0,10);
        await supabase.from("tasks").insert({ user_id: uid, ...taskTo({ ...cur, done: false, dueDate: nextDate }) });
        await refreshSlice("tasks", "tasks", taskFrom);
      }
    },
    updateTask: async (id, patch) => {
      setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t) }));
      await supabase.from("tasks").update(taskTo(patch)).eq("id", id);
    },
    deleteTask: async (id) => {
      setState(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }));
      await supabase.from("tasks").delete().eq("id", id);
    },

    addGoal: async (g) => {
      if (!uid) return;
      const { data } = await supabase.from("goals").insert({ user_id: uid, category: "Personal", timeline: "Q1", progress: 0, ...g }).select().single();
      if (data) setState(s => ({ ...s, goals: [goalFrom(data), ...s.goals] }));
    },
    updateGoal: async (id, patch) => {
      setState(s => ({ ...s, goals: s.goals.map(g => g.id === id ? { ...g, ...patch } : g) }));
      await supabase.from("goals").update(patch as any).eq("id", id);
    },
    deleteGoal: async (id) => {
      setState(s => ({ ...s, goals: s.goals.filter(g => g.id !== id) }));
      await supabase.from("goals").delete().eq("id", id);
    },

    addHabit: async (h) => {
      if (!uid) return;
      const { data } = await supabase.from("habits").insert({ user_id: uid, cadence: "daily", category: "self-care", ...h }).select().single();
      if (data) setState(s => ({ ...s, habits: [{ ...habitFrom(data), log: {} }, ...s.habits] }));
    },
    toggleHabit: async (id, date) => {
      if (!uid) return;
      const d = date ?? todayISO();
      const habit = state.habits.find(h => h.id === id); if (!habit) return;
      const nextDone = !habit.log[d];
      setState(s => ({ ...s, habits: s.habits.map(h => h.id === id ? { ...h, log: { ...h.log, [d]: nextDone } } : h) }));
      await supabase.from("habit_logs").upsert({ user_id: uid, habit_id: id, date: d, done: nextDone }, { onConflict: "habit_id,date" });
    },
    deleteHabit: async (id) => {
      setState(s => ({ ...s, habits: s.habits.filter(h => h.id !== id) }));
      await supabase.from("habits").delete().eq("id", id);
    },

    addJournal: async (j) => {
      if (!uid) return;
      const { data } = await supabase.from("journal_entries").insert({ user_id: uid, date: todayISO(), type: "daily", ...j }).select().single();
      if (data) setState(s => ({ ...s, journal: [journalFrom(data), ...s.journal] }));
    },
    deleteJournal: async (id) => {
      setState(s => ({ ...s, journal: s.journal.filter(j => j.id !== id) }));
      await supabase.from("journal_entries").delete().eq("id", id);
    },

    addMeal: async (m) => {
      if (!uid) return;
      const { data } = await supabase.from("meals").insert({ user_id: uid, ...m, kid_safe: m.kidSafe ?? false }).select().single();
      if (data) setState(s => ({ ...s, meals: [mealFrom(data), ...s.meals] }));
    },
    deleteMeal: async (id) => {
      setState(s => ({ ...s, meals: s.meals.filter(m => m.id !== id) }));
      await supabase.from("meals").delete().eq("id", id);
    },

    addGrocery: async (name, category) => {
      if (!uid) return;
      const { data } = await supabase.from("grocery_items").insert({ user_id: uid, name, category }).select().single();
      if (data) setState(s => ({ ...s, grocery: [groceryFrom(data), ...s.grocery] }));
    },
    toggleGrocery: async (id) => {
      const cur = state.grocery.find(g => g.id === id); if (!cur) return;
      setState(s => ({ ...s, grocery: s.grocery.map(g => g.id === id ? { ...g, bought: !g.bought } : g) }));
      await supabase.from("grocery_items").update({ bought: !cur.bought }).eq("id", id);
    },
    deleteGrocery: async (id) => {
      setState(s => ({ ...s, grocery: s.grocery.filter(g => g.id !== id) }));
      await supabase.from("grocery_items").delete().eq("id", id);
    },

    addAppointment: async (a) => {
      if (!uid) return;
      const { data } = await supabase.from("appointments").insert({ user_id: uid, type: "other", ...a, with_name: (a as any).with ?? null }).select().single();
      if (data) setState(s => ({ ...s, appointments: [apptFrom(data), ...s.appointments] }));
    },
    deleteAppointment: async (id) => {
      setState(s => ({ ...s, appointments: s.appointments.filter(a => a.id !== id) }));
      await supabase.from("appointments").delete().eq("id", id);
    },

    addBirthday: async (b) => {
      if (!uid) return;
      const { data } = await supabase.from("birthdays").insert({ user_id: uid, ...b }).select().single();
      if (data) setState(s => ({ ...s, birthdays: [bdayFrom(data), ...s.birthdays] }));
    },
    deleteBirthday: async (id) => {
      setState(s => ({ ...s, birthdays: s.birthdays.filter(b => b.id !== id) }));
      await supabase.from("birthdays").delete().eq("id", id);
    },
    addHoliday: async (h) => {
      if (!uid) return;
      const { data } = await supabase.from("holidays").insert({ user_id: uid, ...h }).select().single();
      if (data) setState(s => ({ ...s, holidays: [holidayFrom(data), ...s.holidays] }));
    },
    deleteHoliday: async (id) => {
      setState(s => ({ ...s, holidays: s.holidays.filter(h => h.id !== id) }));
      await supabase.from("holidays").delete().eq("id", id);
    },

    addRecipient: async (r) => {
      if (!uid) return;
      const { data } = await supabase.from("care_recipients").insert({ user_id: uid, ...r }).select().single();
      if (data) setState(s => ({ ...s, recipients: [recipFrom(data), ...s.recipients] }));
    },
    addCareNote: async (n) => {
      if (!uid) return;
      const { data } = await supabase.from("care_notes").insert({ user_id: uid, date: todayISO(), recipient_id: n.recipientId, body: n.body!, tag: n.tag }).select().single();
      if (data) setState(s => ({ ...s, careNotes: [careNoteFrom(data), ...s.careNotes] }));
    },
    deleteCareNote: async (id) => {
      setState(s => ({ ...s, careNotes: s.careNotes.filter(n => n.id !== id) }));
      await supabase.from("care_notes").delete().eq("id", id);
    },

    addCleaning: async (c) => {
      if (!uid) return;
      const { data } = await supabase.from("cleaning_tasks").insert({
        user_id: uid, title: c.title, zone: c.zone, cadence: c.cadence ?? "weekly",
        recurrence_type: c.recurrenceType ?? "weekly", weekday: c.weekday ?? null,
        auto_reset: c.autoReset ?? true, sort_order: c.sortOrder ?? 0,
      }).select().single();
      if (data) setState(s => ({ ...s, cleaning: [cleanFrom(data), ...s.cleaning] }));
    },
    toggleCleaning: async (id) => {
      const cur = state.cleaning.find(c => c.id === id); if (!cur) return;
      const next = !cur.done;
      setState(s => ({ ...s, cleaning: s.cleaning.map(c => c.id === id ? { ...c, done: next, lastDone: next ? todayISO() : c.lastDone } : c) }));
      await supabase.from("cleaning_tasks").update({ done: next, last_done: next ? todayISO() : null, last_completed_at: next ? new Date().toISOString() : null }).eq("id", id);
    },
    deleteCleaning: async (id) => {
      setState(s => ({ ...s, cleaning: s.cleaning.filter(c => c.id !== id) }));
      await supabase.from("cleaning_tasks").delete().eq("id", id);
    },
    regenerateWeeklyReset: async () => {
      if (!uid) return;
      // If user has no weekly cleaning tasks at all, insert defaults
      const hasWeekly = state.cleaning.some(c => c.cadence === "weekly");
      if (!hasWeekly) {
        const seed = newUserSeed(uid).cleaning_tasks;
        await supabase.from("cleaning_tasks").insert(seed as any);
      }
      await refreshSlice("cleaning_tasks", "cleaning", cleanFrom);
    },
    resetThisWeek: async () => {
      if (!uid) return;
      setState(s => ({ ...s, cleaning: s.cleaning.map(c => c.cadence === "weekly" ? { ...c, done: false } : c) }));
      await supabase.from("cleaning_tasks").update({ done: false }).eq("user_id", uid).eq("cadence", "weekly");
    },

    addIdea: async (i) => {
      if (!uid) return;
      const { data } = await supabase.from("ideas").insert({ user_id: uid, category: "future plans", ...i }).select().single();
      if (data) setState(s => ({ ...s, ideas: [ideaFrom(data), ...s.ideas] }));
    },
    deleteIdea: async (id) => {
      setState(s => ({ ...s, ideas: s.ideas.filter(i => i.id !== id) }));
      await supabase.from("ideas").delete().eq("id", id);
    },

    setEnergyToday: async (e) => {
      if (!uid) return;
      setState(s => ({ ...s, energyToday: e, energyDate: todayISO() }));
      await supabase.from("profiles").update({ energy_today: e, energy_date: todayISO() }).eq("id", uid);
    },
    setLowEnergyMode: async (v) => {
      if (!uid) return;
      setState(s => ({ ...s, settings: { ...s.settings, lowEnergyMode: v } }));
      await supabase.from("profiles").update({ low_energy_mode: v }).eq("id", uid);
    },
    setName: async (n) => {
      if (!uid) return;
      setState(s => ({ ...s, settings: { ...s.settings, name: n } }));
      await supabase.from("profiles").update({ name: n }).eq("id", uid);
    },
    updateProfile: async (patch) => {
      if (!uid) return;
      setState(s => ({ ...s, settings: { ...s.settings, name: patch.name ?? s.settings.name, planningStyle: patch.planning_style ?? s.settings.planningStyle, timeZone: patch.time_zone ?? s.settings.timeZone, theme: (patch.theme as any) ?? s.settings.theme } }));
      await supabase.from("profiles").update(patch).eq("id", uid);
    },
  };

  return <StoreCtx.Provider value={ctx}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}