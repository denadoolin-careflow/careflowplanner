import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ResetKind = "weekly" | "deep" | "quick" | "low_energy" | "custom";
export type TimeBlock = "morning" | "afternoon" | "evening";

export interface ResetItem {
  id: string;
  checklist_id: string;
  parent_id: string | null;
  title: string;
  notes: string | null;
  category: string | null;
  day_of_week: number | null;
  time_block: TimeBlock | null;
  start_time: string | null;
  est_minutes: number | null;
  recurrence_type: string;
  recurrence_days: number[];
  due_date: string | null;
  done: boolean;
  sort_order: number;
}

export interface ResetChecklist {
  id: string;
  name: string;
  kind: ResetKind;
  week_start: string | null;
  is_template: boolean;
  sort_order: number;
  items: ResetItem[];
}

function group(rows: any[]): ResetItem[] {
  return rows.map((r) => ({
    id: r.id,
    checklist_id: r.checklist_id,
    parent_id: r.parent_id,
    title: r.title,
    notes: r.notes,
    category: r.category,
    day_of_week: r.day_of_week,
    time_block: r.time_block,
    start_time: r.start_time,
    est_minutes: r.est_minutes,
    recurrence_type: r.recurrence_type,
    recurrence_days: r.recurrence_days || [],
    due_date: r.due_date,
    done: r.done,
    sort_order: r.sort_order,
  }));
}

export function useResetChecklists(opts?: { weekStart?: string; templatesOnly?: boolean; kind?: ResetKind }) {
  const [lists, setLists] = useState<ResetChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let q = supabase.from("reset_checklists").select("*").order("sort_order");
    if (opts?.templatesOnly) q = q.eq("is_template", true);
    if (opts?.weekStart && !opts?.templatesOnly) q = q.or(`week_start.eq.${opts.weekStart},week_start.is.null`);
    if (opts?.kind) q = q.eq("kind", opts.kind);
    const { data: cls } = await q;
    if (!cls) { setLists([]); setLoading(false); return; }
    const ids = cls.map((c: any) => c.id);
    let items: any[] = [];
    if (ids.length) {
      const { data } = await supabase.from("reset_items").select("*").in("checklist_id", ids).order("sort_order");
      items = data || [];
    }
    setLists(cls.map((c: any) => ({
      id: c.id, name: c.name, kind: c.kind, week_start: c.week_start,
      is_template: c.is_template, sort_order: c.sort_order,
      items: group(items.filter(i => i.checklist_id === c.id)),
    })));
    setLoading(false);
  }, [opts?.weekStart, opts?.templatesOnly, opts?.kind]);

  useEffect(() => { void refresh(); }, [refresh]);

  const createList = async (input: Partial<ResetChecklist> & { name: string }) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data } = await supabase.from("reset_checklists").insert({
      user_id: u.user.id,
      name: input.name,
      kind: input.kind ?? "custom",
      week_start: input.week_start ?? null,
      is_template: input.is_template ?? false,
      sort_order: input.sort_order ?? lists.length,
    }).select("*").single();
    await refresh();
    return data?.id ?? null;
  };

  const renameList = async (id: string, name: string) => {
    await supabase.from("reset_checklists").update({ name }).eq("id", id);
    setLists(prev => prev.map(l => l.id === id ? { ...l, name } : l));
  };

  const deleteList = async (id: string) => {
    await supabase.from("reset_checklists").delete().eq("id", id);
    setLists(prev => prev.filter(l => l.id !== id));
  };

  const saveAsTemplate = async (id: string, newName?: string) => {
    const list = lists.find(l => l.id === id);
    if (!list) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: nl } = await supabase.from("reset_checklists").insert({
      user_id: u.user.id, name: newName ?? `${list.name} (template)`,
      kind: list.kind, is_template: true, sort_order: 0,
    }).select("*").single();
    if (!nl) return;
    // Copy items (flat copy of root items only for simplicity)
    const roots = list.items.filter(i => !i.parent_id);
    const childMap = new Map<string, ResetItem[]>();
    list.items.filter(i => i.parent_id).forEach(c => {
      if (!childMap.has(c.parent_id!)) childMap.set(c.parent_id!, []);
      childMap.get(c.parent_id!)!.push(c);
    });
    for (const r of roots) {
      const { data: nr } = await supabase.from("reset_items").insert({
        user_id: u.user.id, checklist_id: nl.id, title: r.title, notes: r.notes,
        category: r.category, day_of_week: r.day_of_week, time_block: r.time_block,
        start_time: r.start_time, est_minutes: r.est_minutes, sort_order: r.sort_order,
      }).select("*").single();
      const kids = childMap.get(r.id) ?? [];
      for (const k of kids) {
        await supabase.from("reset_items").insert({
          user_id: u.user.id, checklist_id: nl.id, parent_id: nr?.id,
          title: k.title, notes: k.notes, category: k.category,
          day_of_week: k.day_of_week, time_block: k.time_block,
          start_time: k.start_time, est_minutes: k.est_minutes, sort_order: k.sort_order,
        });
      }
    }
  };

  const loadTemplate = async (templateId: string, weekStart: string | null) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data: tpl } = await supabase.from("reset_checklists").select("*").eq("id", templateId).maybeSingle();
    if (!tpl) return null;
    const { data: tplItems } = await supabase.from("reset_items").select("*").eq("checklist_id", templateId).order("sort_order");
    const { data: nl } = await supabase.from("reset_checklists").insert({
      user_id: u.user.id, name: tpl.name, kind: tpl.kind,
      week_start: weekStart, is_template: false, sort_order: lists.length,
    }).select("*").single();
    if (!nl) return null;
    const idMap = new Map<string, string>();
    const roots = (tplItems ?? []).filter(i => !i.parent_id);
    for (const r of roots) {
      const { data: nr } = await supabase.from("reset_items").insert({
        user_id: u.user.id, checklist_id: nl.id, title: r.title, notes: r.notes,
        category: r.category, day_of_week: r.day_of_week, time_block: r.time_block,
        start_time: r.start_time, est_minutes: r.est_minutes, sort_order: r.sort_order,
      }).select("*").single();
      if (nr) idMap.set(r.id, nr.id);
    }
    const kids = (tplItems ?? []).filter(i => i.parent_id);
    for (const k of kids) {
      const newParent = idMap.get(k.parent_id!);
      if (!newParent) continue;
      await supabase.from("reset_items").insert({
        user_id: u.user.id, checklist_id: nl.id, parent_id: newParent,
        title: k.title, notes: k.notes, category: k.category,
        day_of_week: k.day_of_week, time_block: k.time_block,
        start_time: k.start_time, est_minutes: k.est_minutes, sort_order: k.sort_order,
      });
    }
    await refresh();
    return nl.id;
  };

  const addItem = async (checklistId: string, item: Partial<ResetItem> & { title: string }) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const list = lists.find(l => l.id === checklistId);
    const sibs = (list?.items ?? []).filter(i => (i.parent_id ?? null) === (item.parent_id ?? null));
    const sort = sibs.length;
    const { data } = await supabase.from("reset_items").insert({
      user_id: u.user.id,
      checklist_id: checklistId,
      parent_id: item.parent_id ?? null,
      title: item.title,
      notes: item.notes ?? null,
      category: item.category ?? null,
      day_of_week: item.day_of_week ?? null,
      time_block: item.time_block ?? null,
      start_time: item.start_time ?? null,
      est_minutes: item.est_minutes ?? null,
      done: false,
      sort_order: sort,
    }).select("*").single();
    if (data) {
      setLists(prev => prev.map(l => l.id === checklistId ? { ...l, items: [...l.items, ...group([data])] } : l));
    }
  };

  const updateItem = async (id: string, patch: Partial<ResetItem>) => {
    setLists(prev => prev.map(l => ({ ...l, items: l.items.map(i => i.id === id ? { ...i, ...patch } as ResetItem : i) })));
    const dbPatch: any = { ...patch };
    delete dbPatch.id; delete dbPatch.checklist_id;
    await supabase.from("reset_items").update(dbPatch).eq("id", id);
  };

  const deleteItem = async (id: string) => {
    setLists(prev => prev.map(l => ({ ...l, items: l.items.filter(i => i.id !== id && i.parent_id !== id) })));
    await supabase.from("reset_items").delete().eq("id", id);
  };

  const duplicateItem = async (id: string) => {
    const list = lists.find(l => l.items.some(i => i.id === id));
    if (!list) return;
    const item = list.items.find(i => i.id === id)!;
    await addItem(list.id, {
      parent_id: item.parent_id,
      title: item.title + " (copy)",
      notes: item.notes ?? undefined,
      category: item.category ?? undefined,
      day_of_week: item.day_of_week ?? undefined,
      time_block: item.time_block ?? undefined,
      start_time: item.start_time ?? undefined,
      est_minutes: item.est_minutes ?? undefined,
    });
  };

  const reorderItems = async (checklistId: string, parentId: string | null, orderedIds: string[]) => {
    setLists(prev => prev.map(l => {
      if (l.id !== checklistId) return l;
      const items = l.items.map(i => {
        if ((i.parent_id ?? null) !== parentId) return i;
        const idx = orderedIds.indexOf(i.id);
        return idx >= 0 ? { ...i, sort_order: idx } : i;
      });
      return { ...l, items };
    }));
    await Promise.all(orderedIds.map((id, idx) =>
      supabase.from("reset_items").update({ sort_order: idx }).eq("id", id)
    ));
  };

  return {
    lists, loading, refresh,
    createList, renameList, deleteList, saveAsTemplate, loadTemplate,
    addItem, updateItem, deleteItem, duplicateItem, reorderItems,
  };
}

/** Convenience: fetch templates for the picker. */
export async function fetchTemplates(): Promise<ResetChecklist[]> {
  const { data: cls } = await supabase.from("reset_checklists").select("*").eq("is_template", true).order("sort_order");
  if (!cls) return [];
  return cls.map((c: any) => ({
    id: c.id, name: c.name, kind: c.kind, week_start: c.week_start,
    is_template: c.is_template, sort_order: c.sort_order, items: [],
  }));
}