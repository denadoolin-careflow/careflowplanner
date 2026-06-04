import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Celebration, CelebrationTask, HolidayPlan, HolidayStep,
  Tradition, TraditionItem, TraditionInstance,
  BucketList, BucketItem, SeasonalGoal, Remembrance, MemoryBookEntry,
} from "./types";

/* ---------- mappers ---------- */
const cFrom = (r: any): Celebration => ({
  id: r.id, kind: r.kind, title: r.title, date: r.date, endDate: r.end_date,
  recipientId: r.recipient_id, theme: r.theme, color: r.color, icon: r.icon,
  coverUrl: r.cover_url, budgetCents: r.budget_cents ?? 0, spentCents: r.spent_cents ?? 0,
  status: r.status, notes: r.notes, recursYearly: !!r.recurs_yearly,
  parentCelebrationId: r.parent_celebration_id, personAgeAnchor: r.person_age_anchor,
  updatedAt: r.updated_at,
});
const ctFrom = (r: any): CelebrationTask => ({
  id: r.id, celebrationId: r.celebration_id, title: r.title, category: r.category,
  done: !!r.done, dueOffsetDays: r.due_offset_days, linkedTaskId: r.linked_task_id,
  sortOrder: r.sort_order ?? 0, updatedAt: r.updated_at,
});
const hpFrom = (r: any): HolidayPlan => ({
  id: r.id, holidayId: r.holiday_id, customName: r.custom_name, customDate: r.custom_date,
  category: r.category, budgetCents: r.budget_cents ?? 0, spentCents: r.spent_cents ?? 0,
  color: r.color, icon: r.icon, notes: r.notes, status: r.status, updatedAt: r.updated_at,
});
const hsFrom = (r: any): HolidayStep => ({
  id: r.id, holidayPlanId: r.holiday_plan_id, daysBefore: r.days_before,
  title: r.title, notes: r.notes, done: !!r.done, sortOrder: r.sort_order ?? 0,
});
const tFrom = (r: any): Tradition => ({
  id: r.id, title: r.title, description: r.description, anchor: r.anchor,
  anchorDate: r.anchor_date, category: r.category, icon: r.icon, color: r.color,
  recursYearly: !!r.recurs_yearly, active: !!r.active, updatedAt: r.updated_at,
});
const tiFrom = (r: any): TraditionItem => ({ id: r.id, traditionId: r.tradition_id, title: r.title, sortOrder: r.sort_order ?? 0 });
const txFrom = (r: any): TraditionInstance => ({
  id: r.id, traditionId: r.tradition_id, year: r.year, startedAt: r.started_at,
  completedAt: r.completed_at, notes: r.notes, itemState: (r.item_state ?? {}) as Record<string, boolean>,
});
const blFrom = (r: any): BucketList => ({
  id: r.id, season: r.season, year: r.year, title: r.title, color: r.color, icon: r.icon,
  isShared: !!r.is_shared, sortOrder: r.sort_order ?? 0,
});
const biFrom = (r: any): BucketItem => ({
  id: r.id, listId: r.list_id, title: r.title, done: !!r.done, doneAt: r.done_at,
  dueDate: r.due_date, photoUrl: r.photo_url, notes: r.notes, sortOrder: r.sort_order ?? 0,
});
const sgFrom = (r: any): SeasonalGoal => ({
  id: r.id, season: r.season, year: r.year, title: r.title, done: !!r.done,
  notes: r.notes, sortOrder: r.sort_order ?? 0,
});
const rmFrom = (r: any): Remembrance => ({
  id: r.id, name: r.name, kind: r.kind, birthDate: r.birth_date, remembranceDate: r.remembrance_date,
  photoUrl: r.photo_url, story: r.story, showPrompts: !!r.show_prompts,
});
const mbFrom = (r: any): MemoryBookEntry => ({
  id: r.id, title: r.title, body: r.body, date: r.date, groupType: r.group_type, groupKey: r.group_key,
  media: Array.isArray(r.media) ? r.media : [], coverUrl: r.cover_url, mood: r.mood,
  linkedCelebrationId: r.linked_celebration_id, linkedHolidayId: r.linked_holiday_id, linkedMemoryId: r.linked_memory_id,
  updatedAt: r.updated_at,
});

/* ---------- generic realtime list hook ---------- */
function useRealtimeList<T extends { id: string }>(
  table: string, mapper: (r: any) => T, orderCol: string = "created_at", asc = false,
): { items: T[]; loading: boolean; refresh: () => Promise<void> } {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from(table as any).select("*").order(orderCol, { ascending: asc });
    setItems((data ?? []).map(mapper));
    setLoading(false);
  }, [table, mapper, orderCol, asc]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    let uid: string | null = null;
    supabase.auth.getUser().then(({ data }) => {
      uid = data.user?.id ?? null;
      if (!uid) return;
      const ch = supabase
        .channel(`seasons-${table}-${uid}`)
        .on("postgres_changes" as any, { event: "*", schema: "public", table, filter: `user_id=eq.${uid}` }, (p: any) => {
          if (p.eventType === "DELETE") {
            const id = p.old?.id; if (id) setItems(prev => prev.filter(x => x.id !== id));
            return;
          }
          const row = mapper(p.new);
          setItems(prev => {
            const i = prev.findIndex(x => x.id === row.id);
            return i >= 0 ? prev.map(x => x.id === row.id ? row : x) : [row, ...prev];
          });
        })
        .subscribe();
      return () => { void supabase.removeChannel(ch); };
    });
  }, [table, mapper]);

  return { items, loading, refresh };
}

/* ---------- helpers ---------- */
async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ---------- Celebrations ---------- */
export function useCelebrations() {
  const { items, loading, refresh } = useRealtimeList("celebrations", cFrom, "date", true);

  const add = async (input: Partial<Celebration> & { title: string; date: string; kind?: Celebration["kind"] }) => {
    const u = await uid(); if (!u) return null;
    const { data } = await supabase.from("celebrations").insert({
      user_id: u, title: input.title, date: input.date,
      kind: input.kind ?? "custom", recurs_yearly: input.recursYearly ?? false,
      recipient_id: input.recipientId ?? null, theme: input.theme ?? null,
      color: input.color ?? null, icon: input.icon ?? null, cover_url: input.coverUrl ?? null,
      budget_cents: input.budgetCents ?? 0, notes: input.notes ?? null,
      person_age_anchor: input.personAgeAnchor ?? null,
      end_date: input.endDate ?? null,
    }).select().single();
    return data ? cFrom(data) : null;
  };
  const update = async (id: string, patch: Partial<Celebration>) => {
    const db: any = {};
    if (patch.title !== undefined) db.title = patch.title;
    if (patch.date !== undefined) db.date = patch.date;
    if (patch.endDate !== undefined) db.end_date = patch.endDate;
    if (patch.kind !== undefined) db.kind = patch.kind;
    if (patch.status !== undefined) db.status = patch.status;
    if (patch.theme !== undefined) db.theme = patch.theme;
    if (patch.color !== undefined) db.color = patch.color;
    if (patch.icon !== undefined) db.icon = patch.icon;
    if (patch.coverUrl !== undefined) db.cover_url = patch.coverUrl;
    if (patch.budgetCents !== undefined) db.budget_cents = patch.budgetCents;
    if (patch.spentCents !== undefined) db.spent_cents = patch.spentCents;
    if (patch.notes !== undefined) db.notes = patch.notes;
    if (patch.recursYearly !== undefined) db.recurs_yearly = patch.recursYearly;
    if (patch.recipientId !== undefined) db.recipient_id = patch.recipientId;
    await supabase.from("celebrations").update(db).eq("id", id);
  };
  const remove = async (id: string) => { await supabase.from("celebrations").delete().eq("id", id); };

  return { celebrations: items, loading, refresh, add, update, remove };
}

export function useCelebrationTasks(celebrationId: string | null) {
  const [items, setItems] = useState<CelebrationTask[]>([]);
  useEffect(() => {
    if (!celebrationId) { setItems([]); return; }
    let alive = true;
    supabase.from("celebration_tasks").select("*")
      .eq("celebration_id", celebrationId).order("sort_order", { ascending: true })
      .then(({ data }) => { if (alive) setItems((data ?? []).map(ctFrom)); });
    const ch = supabase.channel(`celebration-tasks-${celebrationId}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "celebration_tasks", filter: `celebration_id=eq.${celebrationId}` }, (p: any) => {
        if (p.eventType === "DELETE") setItems(prev => prev.filter(x => x.id !== p.old?.id));
        else {
          const row = ctFrom(p.new);
          setItems(prev => prev.find(x => x.id === row.id) ? prev.map(x => x.id === row.id ? row : x) : [...prev, row]);
        }
      }).subscribe();
    return () => { alive = false; void supabase.removeChannel(ch); };
  }, [celebrationId]);

  const add = async (title: string, category: CelebrationTask["category"] = "other") => {
    if (!celebrationId) return;
    const u = await uid(); if (!u) return;
    await supabase.from("celebration_tasks").insert({
      user_id: u, celebration_id: celebrationId, title, category, sort_order: items.length,
    });
  };
  const toggle = async (id: string, done: boolean) => {
    setItems(prev => prev.map(t => t.id === id ? { ...t, done } : t));
    await supabase.from("celebration_tasks").update({ done }).eq("id", id);
  };
  const remove = async (id: string) => {
    setItems(prev => prev.filter(t => t.id !== id));
    await supabase.from("celebration_tasks").delete().eq("id", id);
  };

  return { tasks: items, add, toggle, remove };
}

/* ---------- Holiday plans ---------- */
export function useHolidayPlans() {
  const { items, loading, refresh } = useRealtimeList("holiday_plans", hpFrom);
  const add = async (input: Partial<HolidayPlan> & { customName?: string; holidayId?: string }) => {
    const u = await uid(); if (!u) return null;
    const { data } = await supabase.from("holiday_plans").insert({
      user_id: u, holiday_id: input.holidayId ?? null,
      custom_name: input.customName ?? null, custom_date: input.customDate ?? null,
      category: input.category ?? "custom", budget_cents: input.budgetCents ?? 0,
      color: input.color ?? null, icon: input.icon ?? null, notes: input.notes ?? null,
    }).select().single();
    return data ? hpFrom(data) : null;
  };
  const update = async (id: string, patch: Partial<HolidayPlan>) => {
    const db: any = {};
    if (patch.customName !== undefined) db.custom_name = patch.customName;
    if (patch.customDate !== undefined) db.custom_date = patch.customDate;
    if (patch.category !== undefined) db.category = patch.category;
    if (patch.budgetCents !== undefined) db.budget_cents = patch.budgetCents;
    if (patch.spentCents !== undefined) db.spent_cents = patch.spentCents;
    if (patch.notes !== undefined) db.notes = patch.notes;
    if (patch.status !== undefined) db.status = patch.status;
    await supabase.from("holiday_plans").update(db).eq("id", id);
  };
  const remove = async (id: string) => { await supabase.from("holiday_plans").delete().eq("id", id); };
  return { plans: items, loading, refresh, add, update, remove };
}

export function useHolidaySteps(planId: string | null) {
  const [items, setItems] = useState<HolidayStep[]>([]);
  useEffect(() => {
    if (!planId) { setItems([]); return; }
    let alive = true;
    supabase.from("holiday_timeline_steps").select("*").eq("holiday_plan_id", planId).order("days_before", { ascending: false })
      .then(({ data }) => { if (alive) setItems((data ?? []).map(hsFrom)); });
    const ch = supabase.channel(`holiday-steps-${planId}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "holiday_timeline_steps", filter: `holiday_plan_id=eq.${planId}` }, (p: any) => {
        if (p.eventType === "DELETE") setItems(prev => prev.filter(x => x.id !== p.old?.id));
        else {
          const row = hsFrom(p.new);
          setItems(prev => prev.find(x => x.id === row.id) ? prev.map(x => x.id === row.id ? row : x) : [...prev, row].sort((a,b) => b.daysBefore - a.daysBefore));
        }
      }).subscribe();
    return () => { alive = false; void supabase.removeChannel(ch); };
  }, [planId]);

  const add = async (daysBefore: number, title: string) => {
    if (!planId) return;
    const u = await uid(); if (!u) return;
    await supabase.from("holiday_timeline_steps").insert({ user_id: u, holiday_plan_id: planId, days_before: daysBefore, title, sort_order: items.length });
  };
  const toggle = async (id: string, done: boolean) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, done } : x));
    await supabase.from("holiday_timeline_steps").update({ done }).eq("id", id);
  };
  const remove = async (id: string) => {
    setItems(prev => prev.filter(x => x.id !== id));
    await supabase.from("holiday_timeline_steps").delete().eq("id", id);
  };
  const seedDefault = async (steps: Array<{ daysBefore: number; title: string }>) => {
    if (!planId) return;
    const u = await uid(); if (!u) return;
    await supabase.from("holiday_timeline_steps").insert(
      steps.map((s, i) => ({ user_id: u, holiday_plan_id: planId, days_before: s.daysBefore, title: s.title, sort_order: i }))
    );
  };
  return { steps: items, add, toggle, remove, seedDefault };
}

/* ---------- Traditions ---------- */
export function useTraditions() {
  const { items, loading, refresh } = useRealtimeList("traditions", tFrom);
  const add = async (input: Partial<Tradition> & { title: string }) => {
    const u = await uid(); if (!u) return null;
    const { data } = await supabase.from("traditions").insert({
      user_id: u, title: input.title, description: input.description ?? null,
      anchor: input.anchor ?? "custom_date", anchor_date: input.anchorDate ?? null,
      category: input.category ?? null, icon: input.icon ?? null, color: input.color ?? null,
      recurs_yearly: input.recursYearly ?? true,
    }).select().single();
    return data ? tFrom(data) : null;
  };
  const update = async (id: string, patch: Partial<Tradition>) => {
    const db: any = {};
    if (patch.title !== undefined) db.title = patch.title;
    if (patch.description !== undefined) db.description = patch.description;
    if (patch.anchor !== undefined) db.anchor = patch.anchor;
    if (patch.anchorDate !== undefined) db.anchor_date = patch.anchorDate;
    if (patch.active !== undefined) db.active = patch.active;
    if (patch.recursYearly !== undefined) db.recurs_yearly = patch.recursYearly;
    await supabase.from("traditions").update(db).eq("id", id);
  };
  const remove = async (id: string) => { await supabase.from("traditions").delete().eq("id", id); };
  return { traditions: items, loading, refresh, add, update, remove };
}

export function useTraditionItems(traditionId: string | null) {
  const [items, setItems] = useState<TraditionItem[]>([]);
  useEffect(() => {
    if (!traditionId) { setItems([]); return; }
    let alive = true;
    supabase.from("tradition_items").select("*").eq("tradition_id", traditionId).order("sort_order")
      .then(({ data }) => { if (alive) setItems((data ?? []).map(tiFrom)); });
    return () => { alive = false; };
  }, [traditionId]);

  const add = async (title: string) => {
    if (!traditionId) return;
    const u = await uid(); if (!u) return;
    const { data } = await supabase.from("tradition_items").insert({ user_id: u, tradition_id: traditionId, title, sort_order: items.length }).select().single();
    if (data) setItems(prev => [...prev, tiFrom(data)]);
  };
  const remove = async (id: string) => {
    setItems(prev => prev.filter(x => x.id !== id));
    await supabase.from("tradition_items").delete().eq("id", id);
  };
  return { items, add, remove };
}

export function useTraditionInstance(traditionId: string | null, year: number) {
  const [inst, setInst] = useState<TraditionInstance | null>(null);
  const load = useCallback(async () => {
    if (!traditionId) return;
    const { data } = await supabase.from("tradition_instances").select("*").eq("tradition_id", traditionId).eq("year", year).maybeSingle();
    setInst(data ? txFrom(data) : null);
  }, [traditionId, year]);
  useEffect(() => { void load(); }, [load]);

  const ensure = async () => {
    if (!traditionId || inst) return inst;
    const u = await uid(); if (!u) return null;
    const { data } = await supabase.from("tradition_instances").insert({
      user_id: u, tradition_id: traditionId, year, started_at: new Date().toISOString(), item_state: {},
    }).select().single();
    const next = data ? txFrom(data) : null;
    setInst(next);
    return next;
  };

  const toggleItem = async (itemId: string, done: boolean) => {
    const cur = await ensure(); if (!cur) return;
    const nextState = { ...cur.itemState, [itemId]: done };
    setInst({ ...cur, itemState: nextState });
    await supabase.from("tradition_instances").update({ item_state: nextState }).eq("id", cur.id);
  };

  const complete = async () => {
    const cur = await ensure(); if (!cur) return;
    setInst({ ...cur, completedAt: new Date().toISOString() });
    await supabase.from("tradition_instances").update({ completed_at: new Date().toISOString() }).eq("id", cur.id);
  };

  return { instance: inst, toggleItem, complete, ensure };
}

/* ---------- Bucket lists ---------- */
export function useBucketLists() {
  const { items, loading, refresh } = useRealtimeList("bucket_lists", blFrom, "sort_order", true);
  const add = async (input: Partial<BucketList> & { title: string; season: BucketList["season"] }) => {
    const u = await uid(); if (!u) return null;
    const { data } = await supabase.from("bucket_lists").insert({
      user_id: u, title: input.title, season: input.season, year: input.year ?? new Date().getFullYear(),
      color: input.color ?? null, icon: input.icon ?? null, sort_order: items.length,
    }).select().single();
    return data ? blFrom(data) : null;
  };
  const remove = async (id: string) => { await supabase.from("bucket_lists").delete().eq("id", id); };
  return { lists: items, loading, refresh, add, remove };
}

export function useBucketItems(listId: string | null) {
  const [items, setItems] = useState<BucketItem[]>([]);
  useEffect(() => {
    if (!listId) { setItems([]); return; }
    let alive = true;
    supabase.from("bucket_items").select("*").eq("list_id", listId).order("sort_order")
      .then(({ data }) => { if (alive) setItems((data ?? []).map(biFrom)); });
    const ch = supabase.channel(`bucket-items-${listId}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "bucket_items", filter: `list_id=eq.${listId}` }, (p: any) => {
        if (p.eventType === "DELETE") setItems(prev => prev.filter(x => x.id !== p.old?.id));
        else {
          const row = biFrom(p.new);
          setItems(prev => prev.find(x => x.id === row.id) ? prev.map(x => x.id === row.id ? row : x) : [...prev, row]);
        }
      }).subscribe();
    return () => { alive = false; void supabase.removeChannel(ch); };
  }, [listId]);

  const add = async (title: string) => {
    if (!listId) return;
    const u = await uid(); if (!u) return;
    await supabase.from("bucket_items").insert({ user_id: u, list_id: listId, title, sort_order: items.length });
  };
  const toggle = async (id: string, done: boolean) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, done, doneAt: done ? new Date().toISOString() : null } : x));
    await supabase.from("bucket_items").update({ done, done_at: done ? new Date().toISOString() : null }).eq("id", id);
  };
  const remove = async (id: string) => {
    setItems(prev => prev.filter(x => x.id !== id));
    await supabase.from("bucket_items").delete().eq("id", id);
  };
  return { items, add, toggle, remove };
}

/* ---------- Seasonal goals ---------- */
export function useSeasonalGoals(season: BucketList["season"], year: number) {
  const [items, setItems] = useState<SeasonalGoal[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("seasonal_goals").select("*").eq("season", season).eq("year", year).order("sort_order");
    setItems((data ?? []).map(sgFrom));
  }, [season, year]);
  useEffect(() => { void load(); }, [load]);
  const add = async (title: string) => {
    const u = await uid(); if (!u) return;
    const { data } = await supabase.from("seasonal_goals").insert({ user_id: u, season, year, title, sort_order: items.length }).select().single();
    if (data) setItems(prev => [...prev, sgFrom(data)]);
  };
  const toggle = async (id: string, done: boolean) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, done } : x));
    await supabase.from("seasonal_goals").update({ done }).eq("id", id);
  };
  const remove = async (id: string) => {
    setItems(prev => prev.filter(x => x.id !== id));
    await supabase.from("seasonal_goals").delete().eq("id", id);
  };
  return { goals: items, add, toggle, remove };
}

/* ---------- Remembrances ---------- */
export function useRemembrances() {
  const { items, loading, refresh } = useRealtimeList("remembrances", rmFrom);
  const add = async (input: Partial<Remembrance> & { name: string }) => {
    const u = await uid(); if (!u) return null;
    const { data } = await supabase.from("remembrances").insert({
      user_id: u, name: input.name, kind: input.kind ?? "person",
      birth_date: input.birthDate ?? null, remembrance_date: input.remembranceDate ?? null,
      photo_url: input.photoUrl ?? null, story: input.story ?? null,
    }).select().single();
    return data ? rmFrom(data) : null;
  };
  const update = async (id: string, patch: Partial<Remembrance>) => {
    const db: any = {};
    if (patch.name !== undefined) db.name = patch.name;
    if (patch.kind !== undefined) db.kind = patch.kind;
    if (patch.birthDate !== undefined) db.birth_date = patch.birthDate;
    if (patch.remembranceDate !== undefined) db.remembrance_date = patch.remembranceDate;
    if (patch.photoUrl !== undefined) db.photo_url = patch.photoUrl;
    if (patch.story !== undefined) db.story = patch.story;
    if (patch.showPrompts !== undefined) db.show_prompts = patch.showPrompts;
    await supabase.from("remembrances").update(db).eq("id", id);
  };
  const remove = async (id: string) => { await supabase.from("remembrances").delete().eq("id", id); };
  return { remembrances: items, loading, refresh, add, update, remove };
}

/* ---------- Memory Book ---------- */
export function useMemoryBook() {
  const { items, loading, refresh } = useRealtimeList("memory_book_entries", mbFrom, "date", false);
  const add = async (input: Partial<MemoryBookEntry> & { title: string; groupType: MemoryBookEntry["groupType"]; groupKey: string }) => {
    const u = await uid(); if (!u) return null;
    const { data } = await supabase.from("memory_book_entries").insert({
      user_id: u, title: input.title, body: input.body ?? null,
      date: input.date ?? new Date().toISOString().slice(0,10),
      group_type: input.groupType, group_key: input.groupKey,
      media: (input.media ?? []) as any, cover_url: input.coverUrl ?? null, mood: input.mood ?? null,
      linked_celebration_id: input.linkedCelebrationId ?? null,
      linked_holiday_id: input.linkedHolidayId ?? null,
      linked_memory_id: input.linkedMemoryId ?? null,
    }).select().single();
    return data ? mbFrom(data) : null;
  };
  const remove = async (id: string) => { await supabase.from("memory_book_entries").delete().eq("id", id); };
  return { entries: items, loading, refresh, add, remove };
}