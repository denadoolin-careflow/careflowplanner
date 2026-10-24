import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";

export type EntityType = "goal" | "project" | "task" | "habit" | "note" | "library";
export interface EntityRef { type: EntityType; id: string; title: string; lifeHouse?: number | null; tags?: string[]; href: string }
export interface Link { a: EntityRef; b: EntityRef; source: "linked" | "built-in"; rowId?: string }
type Row = { id: string; source_type: string; source_id: string; target_type: string; target_id: string };

export const TYPE_LABEL: Record<EntityType, string> = { goal: "Goal", project: "Project", task: "Task", habit: "Habit", note: "Note", library: "Library" };

const STOP = new Set(["with", "from", "that", "this", "your", "have", "into", "about", "more", "week", "today"]);
export function titleWords(s: string): Set<string> {
  return new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3 && !STOP.has(w)));
}

/** Suggest related items: same life area or ≥1 shared tag or ≥2 shared title words. Never auto-links. */
export function suggestLinks(item: EntityRef, all: EntityRef[], linkedKeys: Set<string>, limit = 5): EntityRef[] {
  const words = titleWords(item.title);
  const tags = new Set(item.tags ?? []);
  return all
    .filter(o => !(o.type === item.type && o.id === item.id) && !linkedKeys.has(`${o.type}:${o.id}`))
    .map(o => {
      let score = 0;
      if (item.lifeHouse && o.lifeHouse === item.lifeHouse) score += 2;
      for (const t of o.tags ?? []) if (tags.has(t)) score += 2;
      let shared = 0; for (const w of titleWords(o.title)) if (words.has(w)) shared++;
      if (shared >= 2) score += shared; else if (shared === 1 && score > 0) score += 1;
      return { o, score };
    })
    .filter(x => x.score >= 2)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map(x => x.o);
}

const EVT = "careflow:entity-links";

/** Everything linkable plus all links (built-in columns merged with entity_links rows). */
export function useConnections() {
  const { state } = useStore() as any;
  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState<EntityRef[]>([]);
  const [library, setLibrary] = useState<EntityRef[]>([]);
  const [noteProjects, setNoteProjects] = useState<{ id: string; project_id: string }[]>([]);

  const loadLinks = useCallback(async () => {
    const { data } = await supabase.from("entity_links").select("id,source_type,source_id,target_type,target_id");
    setRows((data as Row[]) ?? []);
  }, []);
  useEffect(() => {
    void loadLinks();
    void supabase.from("notes").select("id,title,tags,project_id").eq("archived", false).limit(500).then(({ data }) => {
      setNotes((data ?? []).map((n: any) => ({ type: "note", id: n.id, title: n.title || "Untitled note", tags: n.tags ?? [], href: `/notes?note=${n.id}` })));
      setNoteProjects((data ?? []).filter((n: any) => n.project_id).map((n: any) => ({ id: n.id, project_id: n.project_id })));
    });
    void supabase.from("library_items").select("id,title,tags").limit(500).then(({ data }) => {
      setLibrary((data ?? []).map((l: any) => ({ type: "library", id: l.id, title: l.title, tags: l.tags ?? [], href: "/library" })));
    });
    const h = () => void loadLinks();
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, [loadLinks]);

  const items = useMemo<EntityRef[]>(() => {
    const goals = (state.goals ?? []).map((g: any) => ({ type: "goal", id: g.id, title: g.title, lifeHouse: g.lifeHouse, href: "/goals" }));
    const goalHouse = new Map<string, number | null>((state.goals ?? []).map((g: any) => [g.id, g.lifeHouse ?? null]));
    const projects = (state.projects ?? []).map((p: any) => ({ type: "project", id: p.id, title: p.name, lifeHouse: (p.linkedGoalIds ?? []).map((id: string) => goalHouse.get(id)).find(Boolean) ?? null, href: `/projects/${p.id}` }));
    const tasks = (state.tasks ?? []).filter((t: any) => !t.parentTaskId).map((t: any) => ({ type: "task", id: t.id, title: t.title, tags: t.tags ?? [], lifeHouse: t.goalId ? goalHouse.get(t.goalId) ?? null : null, href: "/planner" }));
    const habits = (state.habits ?? []).map((h: any) => ({ type: "habit", id: h.id, title: h.title, href: "/habits" }));
    return [...goals, ...projects, ...tasks, ...habits, ...notes, ...library] as EntityRef[];
  }, [state.goals, state.projects, state.tasks, state.habits, notes, library]);

  const byKey = useMemo(() => new Map(items.map(i => [`${i.type}:${i.id}`, i])), [items]);

  const links = useMemo<Link[]>(() => {
    const out: Link[] = [];
    const push = (at: EntityType, aid: string, bt: EntityType, bid: string, source: Link["source"], rowId?: string) => {
      const a = byKey.get(`${at}:${aid}`), b = byKey.get(`${bt}:${bid}`);
      if (a && b) out.push({ a, b, source, rowId });
    };
    for (const t of state.tasks ?? []) {
      if (t.goalId) push("task", t.id, "goal", t.goalId, "built-in");
      if (t.projectId) push("task", t.id, "project", t.projectId, "built-in");
    }
    for (const p of state.projects ?? []) for (const g of p.linkedGoalIds ?? []) push("project", p.id, "goal", g, "built-in");
    for (const h of state.habits ?? []) for (const g of h.linkedGoalIds ?? []) push("habit", h.id, "goal", g, "built-in");
    for (const n of noteProjects) push("note", n.id, "project", n.project_id, "built-in");
    for (const r of rows) push(r.source_type as EntityType, r.source_id, r.target_type as EntityType, r.target_id, "linked", r.id);
    return out;
  }, [byKey, rows, state.tasks, state.projects, state.habits, noteProjects]);

  const linksFor = useCallback((type: EntityType, id: string) =>
    links.filter(l => (l.a.type === type && l.a.id === id) || (l.b.type === type && l.b.id === id))
      .map(l => ({ other: l.a.type === type && l.a.id === id ? l.b : l.a, link: l })), [links]);

  const link = useCallback(async (a: EntityRef, b: EntityRef) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("entity_links").upsert({ user_id: u.user.id, source_type: a.type, source_id: a.id, target_type: b.type, target_id: b.id }, { onConflict: "user_id,source_type,source_id,target_type,target_id", ignoreDuplicates: true });
    window.dispatchEvent(new Event(EVT));
  }, []);
  const unlink = useCallback(async (rowId: string) => {
    await supabase.from("entity_links").delete().eq("id", rowId);
    window.dispatchEvent(new Event(EVT));
  }, []);

  return { items, byKey, links, linksFor, link, unlink };
}
