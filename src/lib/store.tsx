import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  AppState, Task, Goal, Habit, JournalEntry, Meal, GroceryItem,
  Appointment, Birthday, Holiday, CareNote, CleaningTask, Idea,
  CareRecipient, Energy, AreaRecord, Project, ProjectSection,
} from "./types";
import { seedState, newUserSeed } from "./seed";
import { AREAS } from "./types";

/* Fire-and-forget push of one CareFlow appointment to Google Calendar.
   Failures are silent — the local DB is the source of truth and the cron
   pull will reconcile any drift. */
async function pushAppointmentToGoogle(appointmentId: string, action: "upsert" | "delete" = "upsert") {
  try {
    await supabase.functions.invoke("google-calendar-push", {
      body: { appointment_id: appointmentId, action },
    });
  } catch {
    /* noop — surfaced via cron pull on the next tick */
  }
}

// Use the user's LOCAL calendar date, not UTC. Using toISOString() here would
// shift the date by a day for users west of UTC at night (or east of UTC early
// morning), causing tasks entered "today" to be saved as yesterday/tomorrow.
const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
export { todayISO };

/* ---------- mappers (db row <-> app shape) ---------- */
const taskFrom = (r: any): Task => ({
  id: r.id, title: r.title, notes: r.notes ?? undefined, icon: r.icon ?? undefined, done: r.done,
  dueDate: r.due_date ?? undefined, priority: r.priority, area: r.area,
  tags: r.tags ?? [], energy: r.energy ?? undefined, estMinutes: r.est_minutes ?? undefined,
  goalId: r.goal_id ?? undefined, recipientId: r.recipient_id ?? undefined,
  dayPart: r.day_part ?? undefined, isTopThree: r.is_top_three,
  createdAt: r.created_at, status: r.status, sortOrder: r.sort_order,
  recurrenceType: r.recurrence_type, recurrenceInterval: r.recurrence_interval,
  recurrenceDays: r.recurrence_days ?? [], nextDueDate: r.next_due_date ?? undefined,
  lastCompletedAt: r.last_completed_at ?? undefined, autoReset: r.auto_reset,
  projectId: r.project_id ?? undefined,
  parentTaskId: r.parent_task_id ?? undefined,
  inbox: !!r.inbox,
  resetItemId: r.reset_item_id ?? undefined,
  sectionId: r.section_id ?? undefined,
});
const taskTo = (t: Partial<Task>) => ({
  title: t.title, notes: t.notes ?? null, icon: t.icon ?? null, done: t.done,
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
  project_id: t.projectId ?? null,
  parent_task_id: t.parentTaskId ?? null,
  inbox: t.inbox ?? false,
  section_id: t.sectionId ?? null,
});
const goalFrom = (r: any): Goal => ({ id: r.id, title: r.title, description: r.description ?? undefined, category: r.category, timeline: r.timeline, progress: r.progress, status: r.status });
const habitFrom = (r: any): Habit => ({ id: r.id, title: r.title, cadence: r.cadence, category: r.category, streak: r.streak, log: {} });
const journalFrom = (r: any): JournalEntry => ({
  id: r.id, date: r.date, type: r.type, title: r.title ?? undefined, body: r.body, mood: r.mood ?? undefined,
  template: r.template ?? undefined,
  energy: r.energy ?? undefined,
  prompts: Array.isArray(r.prompts) ? r.prompts : [],
  gratitudeItems: Array.isArray(r.gratitude_items) ? r.gratitude_items : [],
  tags: Array.isArray(r.tags) ? r.tags : [],
  pinned: !!r.pinned,
  linkedIds: Array.isArray(r.linked_ids) ? r.linked_ids : [],
});
const mealFrom = (r: any): Meal => ({
  id: r.id, date: r.date, slot: r.slot, name: r.name,
  notes: r.notes ?? undefined, kidSafe: r.kid_safe,
  prepMinutes: r.prep_minutes ?? undefined,
  ingredients: r.ingredients ?? [],
  steps: r.steps ?? [],
  tags: r.tags ?? [],
});
const groceryFrom = (r: any): GroceryItem => ({
  id: r.id, name: r.name, qty: r.qty ?? undefined, bought: r.bought, category: r.category ?? undefined,
  stockStatus: (r.stock_status as "in" | "low" | "out") ?? "out",
  sourceMealId: r.source_meal_id ?? null,
  sourceMealName: r.source_meal_name ?? null,
  sourceSlot: r.source_slot ?? null,
  sourceDate: r.source_date ?? null,
});
const apptFrom = (r: any): Appointment => ({
  id: r.id, date: r.date, time: r.time ?? undefined,
  endDate: r.end_date ?? undefined,
  endTime: r.end_time ?? undefined, allDay: !!r.all_day, notes: r.notes ?? undefined,
  title: r.title, icon: r.icon ?? undefined, with: r.with_name ?? undefined,
  location: r.location ?? undefined, recipientId: r.recipient_id ?? undefined, type: r.type ?? undefined,
  projectId: r.project_id ?? undefined,
  areaName: r.area_name ?? undefined,
  color: r.color ?? undefined,
  syncToGoogle: !!r.sync_to_google,
  googleEventId: r.google_event_id ?? undefined,
  googleCalendarId: r.google_calendar_id ?? undefined,
  googleLastSyncedAt: r.google_last_synced_at ?? undefined,
});
const bdayFrom = (r: any): Birthday => ({ id: r.id, name: r.name, date: r.date, relation: r.relation ?? undefined, notes: r.notes ?? undefined });
const holidayFrom = (r: any): Holiday => ({ id: r.id, name: r.name, date: r.date, notes: r.notes ?? undefined });
const recipFrom = (r: any): CareRecipient => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  notes: r.notes ?? undefined,
  sensory: r.sensory ?? undefined,
  contacts: r.contacts ?? [],
  meds: r.meds ?? [],
  birthDate: r.birth_date ?? undefined,
  location: r.location ?? undefined,
  zodiac: r.zodiac ?? undefined,
  loveLanguages: r.love_languages ?? [],
  foodPreferences: r.food_preferences ?? {},
  school: r.school ?? undefined,
  educationLevel: r.education_level ?? undefined,
  schedule: r.schedule ?? {},
  ssnLast4: r.ssn_last4 ?? undefined,
  ssnFull: r.ssn_full ?? undefined,
});
const careNoteFrom = (r: any): CareNote => ({ id: r.id, recipientId: r.recipient_id, date: r.date, body: r.body, tag: r.tag ?? undefined });
const cleanFrom = (r: any): CleaningTask => ({ id: r.id, title: r.title, zone: r.zone, cadence: r.cadence, done: r.done, lastDone: r.last_done ?? undefined, weekday: r.weekday ?? undefined, recurrenceType: r.recurrence_type, recurrenceDays: r.recurrence_days ?? [], nextDueDate: r.next_due_date ?? undefined, autoReset: r.auto_reset, sortOrder: r.sort_order });
const ideaFrom = (r: any): Idea => ({ id: r.id, title: r.title, notes: r.notes ?? undefined, category: r.category, createdAt: r.created_at });
const areaFrom = (r: any): AreaRecord => ({ id: r.id, name: r.name, icon: r.icon ?? undefined, color: r.color ?? undefined, sortOrder: r.sort_order ?? 0, isArchived: !!r.is_archived });
const projectFrom = (r: any): Project => ({
  id: r.id, areaId: r.area_id ?? undefined, areaName: r.area_name ?? undefined,
  parentProjectId: r.parent_project_id ?? undefined,
  name: r.name, notes: r.notes ?? undefined, icon: r.icon ?? undefined, color: r.color ?? undefined,
  status: r.status ?? "active", deadline: r.deadline ?? undefined,
  sortOrder: r.sort_order ?? 0, archivedAt: r.archived_at ?? undefined,
  createdAt: r.created_at,
  aiOverview: r.ai_overview ?? undefined,
  aiOverviewUpdatedAt: r.ai_overview_updated_at ?? undefined,
  linkedGoalIds: Array.isArray(r.linked_goal_ids) ? r.linked_goal_ids : [],
  linkedHabitIds: Array.isArray(r.linked_habit_ids) ? r.linked_habit_ids : [],
  isFavorite: !!r.is_favorite,
});
const sectionFrom = (r: any): ProjectSection => ({
  id: r.id, projectId: r.project_id, name: r.name,
  color: r.color ?? undefined, sortOrder: r.sort_order ?? 0, createdAt: r.created_at,
});

/* ---------- context ---------- */
interface Ctx {
  state: AppState;
  user: User | null;
  loading: boolean;
  /** True only while the initial Supabase session is being resolved.
   *  Use this to gate auth-protected routes — NOT data fetching, which
   *  has its own `loading` flag and should be handled with skeletons. */
  authLoading: boolean;
  signOut: () => Promise<void>;

  addTask: (t: Partial<Task> & { title: string }) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addProject: (p: Partial<Project> & { name: string }) => Promise<Project | null>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addSection: (s: { projectId: string; name: string; color?: string; sortOrder?: number }) => Promise<ProjectSection | null>;
  updateSection: (id: string, patch: Partial<ProjectSection>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  reorderSections: (projectId: string, orderedIds: string[]) => Promise<void>;

  updateArea: (id: string, patch: Partial<AreaRecord>) => Promise<void>;

  addGoal: (g: Partial<Goal> & { title: string }) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  addHabit: (h: Partial<Habit> & { title: string }) => Promise<void>;
  toggleHabit: (id: string, date?: string) => Promise<void>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;

  addJournal: (j: Partial<JournalEntry> & { body: string }) => Promise<JournalEntry | null>;
  updateJournal: (id: string, patch: Partial<JournalEntry>) => Promise<void>;
  deleteJournal: (id: string) => Promise<void>;

  addMeal: (m: Partial<Meal> & { name: string; date: string; slot: Meal["slot"] }) => Promise<void>;
  updateMeal: (id: string, patch: Partial<Meal>) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;

  addGrocery: (name: string, category?: string) => Promise<void>;
  toggleGrocery: (id: string) => Promise<void>;
  deleteGrocery: (id: string) => Promise<void>;
  setGroceryStock: (id: string, status: "in" | "low" | "out") => Promise<void>;
  updateGroceryItem: (id: string, patch: { name?: string; qty?: string | null; category?: string | null }) => Promise<void>;

  addAppointment: (a: Partial<Appointment> & { title: string; date: string }) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  updateAppointment: (id: string, patch: Partial<Appointment>) => Promise<void>;

  addBirthday: (b: Partial<Birthday> & { name: string; date: string }) => Promise<void>;
  updateBirthday: (id: string, patch: Partial<Birthday>) => Promise<void>;
  deleteBirthday: (id: string) => Promise<void>;
  addHoliday: (h: Partial<Holiday> & { name: string; date: string }) => Promise<void>;
  updateHoliday: (id: string, patch: Partial<Holiday>) => Promise<void>;
  deleteHoliday: (id: string) => Promise<void>;

  addRecipient: (r: Partial<CareRecipient> & { name: string; kind: CareRecipient["kind"] }) => Promise<void>;
  updateRecipient: (id: string, patch: Partial<CareRecipient>) => Promise<void>;
  deleteRecipient: (id: string) => Promise<void>;
  addCareNote: (n: Partial<CareNote> & { recipientId: string; body: string }) => Promise<void>;
  deleteCareNote: (id: string) => Promise<void>;

  addCleaning: (c: Partial<CleaningTask> & { title: string; zone: CleaningTask["zone"] }) => Promise<void>;
  toggleCleaning: (id: string) => Promise<void>;
  updateCleaning: (id: string, patch: Partial<CleaningTask>) => Promise<void>;
  deleteCleaning: (id: string) => Promise<void>;
  regenerateWeeklyReset: () => Promise<void>;
  resetThisWeek: () => Promise<void>;

  addIdea: (i: Partial<Idea> & { title: string }) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;

  setEnergyToday: (e: Energy) => Promise<void>;
  setLowEnergyMode: (v: boolean) => Promise<void>;
  setName: (n: string) => Promise<void>;
  updateProfile: (patch: { name?: string; planning_style?: string; time_zone?: string; theme?: string; default_route?: string }) => Promise<void>;

  reloadAll: () => Promise<void>;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => seedState());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const seededRef = useRef(false);

  /* auth subscription (listener BEFORE getSession) */
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore noisy events that don't change identity — they cause re-renders
      // and full data reloads which manifest as visible blinking on startup.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
      const nextId = session?.user?.id ?? null;
      setUser(prev => (prev?.id === nextId ? prev : session?.user ?? null));
      setAuthLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      const nextId = data.session?.user?.id ?? null;
      setUser(prev => (prev?.id === nextId ? prev : data.session?.user ?? null));
      if (!data.session) setLoading(false);
      setAuthLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* load all data when user changes */
  const reload = useCallback(async (uid: string) => {
    const tables = [
      "tasks", "goals", "habits", "habit_logs", "journal_entries", "meals",
      "grocery_items", "appointments", "birthdays", "holidays", "care_recipients",
      "care_notes", "cleaning_tasks", "ideas", "profiles", "areas", "projects", "project_sections",
    ] as const;
    // Safari/WebKit drops requests with `TypeError: Load failed` when ~18
    // selects fire at once right after auth. Batch in small chunks and
    // retry transient failures so we never render with partial data.
    const fetchOne = async (t: string): Promise<any[]> => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabase.from(t as any).select("*").order("created_at", { ascending: false } as any);
        if (!res.error) return res.data ?? [];
        // brief backoff before retry
        await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
      }
      return [];
    };
    const CHUNK = 4;
    const out: any[][] = [];
    for (let i = 0; i < tables.length; i += CHUNK) {
      const slice = tables.slice(i, i + CHUNK);
      const part = await Promise.all(slice.map(t => fetchOne(t)));
      out.push(...part);
    }
    const [tasks, goals, habits, habitLogs, journal, meals, grocery, appts, bdays, holidays, recipients, careNotes, cleaning, ideas, profiles, areas, projects, sections] = out;
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
        defaultRoute: profile.default_route ?? "/",
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
      areas: (areas as any[]).map(areaFrom).sort((a,b) => a.sortOrder - b.sortOrder),
      projects: (projects as any[]).map(projectFrom).sort((a,b) => a.sortOrder - b.sortOrder),
      projectSections: (sections as any[]).map(sectionFrom).sort((a,b) => a.sortOrder - b.sortOrder),
      resetTemplates: seedState().resetTemplates,
    });
    // Cache the chosen default landing route for synchronous read on cold boot
    // (eliminates the dashboard → today flash on next visit).
    try { window.localStorage.setItem("careflow.defaultRoute", profile.default_route ?? "/"); } catch {}
    // Seed default areas from enum on first load (idempotent thanks to UNIQUE(user_id,name))
    if (!areas.length) {
      const seedAreas = AREAS.map((name, i) => ({ user_id: uid, name, sort_order: i }));
      await supabase.from("areas").upsert(seedAreas as any, { onConflict: "user_id,name", ignoreDuplicates: true });
      const { data: newAreas } = await supabase.from("areas").select("*").eq("user_id", uid).order("sort_order", { ascending: true });
      setState(s => ({ ...s, areas: (newAreas ?? []).map(areaFrom) }));
    }
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
    // Only show the global loading screen on the first boot. Subsequent
    // identity-stable refreshes happen silently in the background so the
    // UI doesn't blink between routes / on tab focus.
    reload(user.id).finally(() => setLoading(false));
  }, [user, reload]);

  /* helpers */
  const refreshSlice = async <K extends keyof AppState>(table: string, key: K, mapper: (r:any)=>any) => {
    const { data } = await supabase.from(table as any).select("*").order("created_at", { ascending: false } as any);
    setState(s => ({ ...s, [key]: (data ?? []).map(mapper) } as AppState));
  };

  const uid = user?.id;

  const ctx: Ctx = {
    state, user, loading, authLoading,
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

    addProject: async (p) => {
      if (!uid) return null;
      const dbRow: any = {
        user_id: uid,
        name: p.name,
        area_id: p.areaId ?? null,
        area_name: p.areaName ?? null,
        parent_project_id: p.parentProjectId ?? null,
        notes: p.notes ?? null,
        icon: p.icon ?? null,
        color: p.color ?? null,
        status: p.status ?? "active",
        deadline: p.deadline ?? null,
        sort_order: p.sortOrder ?? 0,
      };
      const { data } = await supabase.from("projects").insert(dbRow).select().single();
      if (!data) return null;
      const proj = projectFrom(data);
      setState(s => ({ ...s, projects: [proj, ...(s.projects ?? [])] }));
      return proj;
    },
    updateProject: async (id, patch) => {
      setState(s => ({ ...s, projects: (s.projects ?? []).map(p => p.id === id ? { ...p, ...patch } : p) }));
      const dbPatch: any = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      if (patch.areaId !== undefined) dbPatch.area_id = patch.areaId ?? null;
      if (patch.areaName !== undefined) dbPatch.area_name = patch.areaName ?? null;
      if (patch.parentProjectId !== undefined) dbPatch.parent_project_id = patch.parentProjectId ?? null;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.deadline !== undefined) dbPatch.deadline = patch.deadline ?? null;
      if (patch.icon !== undefined) dbPatch.icon = patch.icon ?? null;
      if (patch.color !== undefined) dbPatch.color = patch.color ?? null;
      if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder;
      if (patch.aiOverview !== undefined) dbPatch.ai_overview = patch.aiOverview ?? null;
      if (patch.aiOverviewUpdatedAt !== undefined) dbPatch.ai_overview_updated_at = patch.aiOverviewUpdatedAt ?? null;
      if (patch.linkedGoalIds !== undefined) dbPatch.linked_goal_ids = patch.linkedGoalIds ?? [];
      if (patch.linkedHabitIds !== undefined) dbPatch.linked_habit_ids = patch.linkedHabitIds ?? [];
      if (patch.isFavorite !== undefined) dbPatch.is_favorite = !!patch.isFavorite;
      await supabase.from("projects").update(dbPatch).eq("id", id);
    },
    deleteProject: async (id) => {
      setState(s => ({ ...s, projects: (s.projects ?? []).filter(p => p.id !== id) }));
      await supabase.from("projects").delete().eq("id", id);
    },

    addSection: async (s) => {
      if (!uid) return null;
      const row: any = {
        user_id: uid,
        project_id: s.projectId,
        name: s.name,
        color: s.color ?? null,
        sort_order: s.sortOrder ?? ((state.projectSections ?? []).filter(x => x.projectId === s.projectId).length),
      };
      const { data } = await supabase.from("project_sections").insert(row).select().single();
      if (!data) return null;
      const sec = sectionFrom(data);
      setState(st => ({ ...st, projectSections: [...(st.projectSections ?? []), sec] }));
      return sec;
    },
    updateSection: async (id, patch) => {
      setState(st => ({ ...st, projectSections: (st.projectSections ?? []).map(x => x.id === id ? { ...x, ...patch } : x) }));
      const dbPatch: any = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.color !== undefined) dbPatch.color = patch.color ?? null;
      if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder;
      await supabase.from("project_sections").update(dbPatch).eq("id", id);
    },
    deleteSection: async (id) => {
      setState(st => ({
        ...st,
        projectSections: (st.projectSections ?? []).filter(x => x.id !== id),
        tasks: st.tasks.map(t => t.sectionId === id ? { ...t, sectionId: undefined } : t),
      }));
      await supabase.from("tasks").update({ section_id: null }).eq("section_id", id);
      await supabase.from("project_sections").delete().eq("id", id);
    },
    reorderSections: async (projectId, orderedIds) => {
      setState(st => ({
        ...st,
        projectSections: (st.projectSections ?? []).map(x =>
          x.projectId === projectId ? { ...x, sortOrder: orderedIds.indexOf(x.id) } : x
        ),
      }));
      await Promise.all(orderedIds.map((id, i) =>
        supabase.from("project_sections").update({ sort_order: i }).eq("id", id)
      ));
    },

    updateArea: async (id, patch) => {
      setState(s => ({ ...s, areas: (s.areas ?? []).map(a => a.id === id ? { ...a, ...patch } : a) }));
      const dbPatch: any = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.icon !== undefined) dbPatch.icon = patch.icon ?? null;
      if (patch.color !== undefined) dbPatch.color = patch.color ?? null;
      if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder;
      if (patch.isArchived !== undefined) dbPatch.is_archived = patch.isArchived;
      await supabase.from("areas").update(dbPatch).eq("id", id);
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
      const { data } = await supabase.from("habits").insert({ user_id: uid, title: h.title, cadence: h.cadence ?? "daily", category: h.category ?? "self-care" }).select().single();
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
    updateHabit: async (id, patch) => {
      setState(s => ({ ...s, habits: s.habits.map(h => h.id === id ? { ...h, ...patch } : h) }));
      const dbPatch: any = {};
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.cadence !== undefined) dbPatch.cadence = patch.cadence;
      if (patch.category !== undefined) dbPatch.category = patch.category;
      if (Object.keys(dbPatch).length) await supabase.from("habits").update(dbPatch).eq("id", id);
    },

    addJournal: async (j) => {
      if (!uid) return null;
      const { gratitudeItems, linkedIds, prompts, tags, pinned, energy, template, mood, title, body, date, type, ...rest } = j as any;
      const row: any = {
        user_id: uid,
        date: date ?? todayISO(),
        type: type ?? "daily",
        body,
      };
      if (title !== undefined) row.title = title;
      if (mood !== undefined) row.mood = mood;
      if (template !== undefined) row.template = template;
      if (energy !== undefined) row.energy = energy;
      if (prompts !== undefined) row.prompts = prompts;
      if (gratitudeItems !== undefined) row.gratitude_items = gratitudeItems;
      if (linkedIds !== undefined) row.linked_ids = linkedIds;
      if (tags !== undefined) row.tags = tags;
      if (pinned !== undefined) row.pinned = pinned;
      const { data } = await supabase.from("journal_entries").insert(row).select().single();
      if (data) {
        const entry = journalFrom(data);
        setState(s => ({ ...s, journal: [entry, ...s.journal] }));
        return entry;
      }
      return null;
    },
    updateJournal: async (id, patch) => {
      const dbPatch: any = {};
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.body !== undefined) dbPatch.body = patch.body;
      if (patch.type !== undefined) dbPatch.type = patch.type;
      if (patch.mood !== undefined) dbPatch.mood = patch.mood;
      if (patch.template !== undefined) dbPatch.template = patch.template;
      if (patch.energy !== undefined) dbPatch.energy = patch.energy;
      if (patch.prompts !== undefined) dbPatch.prompts = patch.prompts;
      if (patch.gratitudeItems !== undefined) dbPatch.gratitude_items = patch.gratitudeItems;
      if (patch.linkedIds !== undefined) dbPatch.linked_ids = patch.linkedIds;
      if (patch.tags !== undefined) dbPatch.tags = patch.tags;
      if (patch.pinned !== undefined) dbPatch.pinned = patch.pinned;
      if (patch.date !== undefined) dbPatch.date = patch.date;
      setState(s => ({ ...s, journal: s.journal.map(j => j.id === id ? { ...j, ...patch } : j) }));
      if (Object.keys(dbPatch).length) await supabase.from("journal_entries").update(dbPatch).eq("id", id);
    },
    deleteJournal: async (id) => {
      setState(s => ({ ...s, journal: s.journal.filter(j => j.id !== id) }));
      await supabase.from("journal_entries").delete().eq("id", id);
    },

    addMeal: async (m) => {
      if (!uid) return;
      const { data } = await supabase.from("meals").insert({ user_id: uid, name: m.name, date: m.date, slot: m.slot, notes: m.notes ?? null, kid_safe: m.kidSafe ?? false }).select().single();
      if (data) setState(s => ({ ...s, meals: [mealFrom(data), ...s.meals] }));
    },
    updateMeal: async (id, patch) => {
      setState(s => ({ ...s, meals: s.meals.map(m => m.id === id ? { ...m, ...patch } : m) }));
      const dbPatch: any = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.slot !== undefined) dbPatch.slot = patch.slot;
      if (patch.date !== undefined) dbPatch.date = patch.date;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null;
      if (patch.kidSafe !== undefined) dbPatch.kid_safe = patch.kidSafe;
      await supabase.from("meals").update(dbPatch).eq("id", id);
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
    setGroceryStock: async (id, status) => {
      setState(s => ({ ...s, grocery: s.grocery.map(g => g.id === id ? { ...g, stockStatus: status } : g) }));
      await supabase.from("grocery_items").update({ stock_status: status }).eq("id", id);
    },
    updateGroceryItem: async (id, patch) => {
      setState(s => ({ ...s, grocery: s.grocery.map(g => g.id === id ? { ...g, ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.qty !== undefined ? { qty: patch.qty ?? undefined } : {}), ...(patch.category !== undefined ? { category: patch.category ?? undefined } : {}) } : g) }));
      const dbPatch: any = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.qty !== undefined) dbPatch.qty = patch.qty;
      if (patch.category !== undefined) dbPatch.category = patch.category;
      await supabase.from("grocery_items").update(dbPatch).eq("id", id);
    },

    addAppointment: async (a) => {
      if (!uid) return;
      const { data } = await supabase.from("appointments").insert({
        user_id: uid,
        title: a.title, date: a.date,
        time: a.time ?? null, end_time: a.endTime ?? null,
        end_date: a.endDate ?? null,
        all_day: !!a.allDay,
        notes: a.notes ?? null,
        type: a.type ?? "other", location: a.location ?? null,
        recipient_id: a.recipientId ?? null, with_name: (a as any).with ?? null, icon: a.icon ?? null,
        project_id: a.projectId ?? null,
        area_name: a.areaName ?? null,
        color: a.color ?? null,
        sync_to_google: !!a.syncToGoogle,
      }).select().single();
      if (data) {
        const appt = apptFrom(data);
        setState(s => ({ ...s, appointments: [appt, ...s.appointments] }));
        if (appt.syncToGoogle) void pushAppointmentToGoogle(appt.id);
      }
    },
    deleteAppointment: async (id) => {
      const appt = state.appointments.find(a => a.id === id);
      setState(s => ({ ...s, appointments: s.appointments.filter(a => a.id !== id) }));
      if (appt?.syncToGoogle && appt.googleEventId) {
        // Fire push BEFORE deleting the row so the edge function can read it.
        await pushAppointmentToGoogle(id, "delete").catch(() => {});
      }
      await supabase.from("appointments").delete().eq("id", id);
    },
    updateAppointment: async (id, patch) => {
      const dbPatch: any = {};
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.date !== undefined) dbPatch.date = patch.date;
      if (patch.time !== undefined) dbPatch.time = patch.time;
      if (patch.endTime !== undefined) dbPatch.end_time = patch.endTime;
      if (patch.endDate !== undefined) dbPatch.end_date = patch.endDate ?? null;
      if (patch.allDay !== undefined) dbPatch.all_day = !!patch.allDay;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      if (patch.location !== undefined) dbPatch.location = patch.location;
      if (patch.type !== undefined) dbPatch.type = patch.type;
      if (patch.icon !== undefined) dbPatch.icon = patch.icon ?? null;
      if (patch.syncToGoogle !== undefined) dbPatch.sync_to_google = !!patch.syncToGoogle;
      if ((patch as any).with !== undefined) dbPatch.with_name = (patch as any).with;
      if (patch.projectId !== undefined) dbPatch.project_id = patch.projectId ?? null;
      if (patch.areaName !== undefined) dbPatch.area_name = patch.areaName ?? null;
      if (patch.color !== undefined) dbPatch.color = patch.color ?? null;
      if (patch.recipientId !== undefined) dbPatch.recipient_id = patch.recipientId ?? null;
      setState(s => ({ ...s, appointments: s.appointments.map(a => a.id === id ? { ...a, ...patch } : a) }));
      await supabase.from("appointments").update(dbPatch).eq("id", id);
      const next = { ...(state.appointments.find(a => a.id === id) ?? {}), ...patch } as Appointment;
      if (next.syncToGoogle) void pushAppointmentToGoogle(id);
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
    updateBirthday: async (id, patch) => {
      const dbPatch: any = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.date !== undefined) dbPatch.date = patch.date;
      if (patch.relation !== undefined) dbPatch.relation = patch.relation ?? null;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null;
      setState(s => ({ ...s, birthdays: s.birthdays.map(b => b.id === id ? { ...b, ...patch } : b) }));
      await supabase.from("birthdays").update(dbPatch).eq("id", id);
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
    updateHoliday: async (id, patch) => {
      const dbPatch: any = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.date !== undefined) dbPatch.date = patch.date;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null;
      setState(s => ({ ...s, holidays: s.holidays.map(h => h.id === id ? { ...h, ...patch } : h) }));
      await supabase.from("holidays").update(dbPatch).eq("id", id);
    },

    addRecipient: async (r) => {
      if (!uid) return;
      const insertRow: any = {
        user_id: uid,
        name: r.name,
        kind: r.kind,
        notes: r.notes ?? null,
        sensory: r.sensory ?? null,
        contacts: r.contacts ?? [],
        meds: r.meds ?? [],
        birth_date: r.birthDate ?? null,
        location: r.location ?? null,
        zodiac: r.zodiac ?? null,
        love_languages: r.loveLanguages ?? [],
        food_preferences: r.foodPreferences ?? {},
        school: r.school ?? null,
        education_level: r.educationLevel ?? null,
        schedule: r.schedule ?? {},
        ssn_last4: r.ssnLast4 ?? null,
        ssn_full: r.ssnFull ?? null,
      };
      const { data } = await supabase.from("care_recipients").insert(insertRow).select().single();
      if (data) setState(s => ({ ...s, recipients: [recipFrom(data), ...s.recipients] }));
    },
    updateRecipient: async (id, patch) => {
      const dbPatch: Record<string, any> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.kind !== undefined) dbPatch.kind = patch.kind;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null;
      if (patch.sensory !== undefined) dbPatch.sensory = patch.sensory ?? null;
      if (patch.contacts !== undefined) dbPatch.contacts = patch.contacts ?? [];
      if (patch.meds !== undefined) dbPatch.meds = patch.meds ?? [];
      if (patch.birthDate !== undefined) dbPatch.birth_date = patch.birthDate ?? null;
      if (patch.location !== undefined) dbPatch.location = patch.location ?? null;
      if (patch.zodiac !== undefined) dbPatch.zodiac = patch.zodiac ?? null;
      if (patch.loveLanguages !== undefined) dbPatch.love_languages = patch.loveLanguages ?? [];
      if (patch.foodPreferences !== undefined) dbPatch.food_preferences = patch.foodPreferences ?? {};
      if (patch.school !== undefined) dbPatch.school = patch.school ?? null;
      if (patch.educationLevel !== undefined) dbPatch.education_level = patch.educationLevel ?? null;
      if (patch.schedule !== undefined) dbPatch.schedule = patch.schedule ?? {};
      if (patch.ssnLast4 !== undefined) dbPatch.ssn_last4 = patch.ssnLast4 ?? null;
      if (patch.ssnFull !== undefined) dbPatch.ssn_full = patch.ssnFull ?? null;
      setState(s => ({ ...s, recipients: s.recipients.map(r => r.id === id ? { ...r, ...patch } : r) }));
      await supabase.from("care_recipients").update(dbPatch as any).eq("id", id);
    },
    deleteRecipient: async (id) => {
      setState(s => ({
        ...s,
        recipients: s.recipients.filter(r => r.id !== id),
        careNotes: s.careNotes.filter(n => n.recipientId !== id),
      }));
      await supabase.from("care_recipients").delete().eq("id", id);
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
    updateCleaning: async (id, patch) => {
      setState(s => ({ ...s, cleaning: s.cleaning.map(c => c.id === id ? { ...c, ...patch } : c) }));
      const dbPatch: any = {};
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.zone !== undefined) dbPatch.zone = patch.zone;
      if (patch.cadence !== undefined) dbPatch.cadence = patch.cadence;
      if (patch.weekday !== undefined) dbPatch.weekday = patch.weekday;
      if (patch.recurrenceType !== undefined) dbPatch.recurrence_type = patch.recurrenceType;
      if (patch.recurrenceDays !== undefined) dbPatch.recurrence_days = patch.recurrenceDays;
      if (patch.autoReset !== undefined) dbPatch.auto_reset = patch.autoReset;
      if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder;
      if (Object.keys(dbPatch).length) await supabase.from("cleaning_tasks").update(dbPatch).eq("id", id);
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
      const { data } = await supabase.from("ideas").insert({ user_id: uid, title: i.title, notes: i.notes ?? null, category: i.category ?? "future plans" }).select().single();
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
      setState(s => ({ ...s, settings: { ...s.settings, name: patch.name ?? s.settings.name, planningStyle: patch.planning_style ?? s.settings.planningStyle, timeZone: patch.time_zone ?? s.settings.timeZone, theme: (patch.theme as any) ?? s.settings.theme, defaultRoute: patch.default_route ?? s.settings.defaultRoute } }));
      if (patch.default_route !== undefined) {
        try { window.localStorage.setItem("careflow.defaultRoute", patch.default_route ?? "/"); } catch {}
      }
      await supabase.from("profiles").update(patch).eq("id", uid);
    },

    reloadAll: async () => {
      if (!uid) return;
      await reload(uid);
    },
  };

  return <StoreCtx.Provider value={ctx}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}