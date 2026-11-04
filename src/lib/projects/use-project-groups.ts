import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectGroup { id: string; name: string; sort_order: number }
const DEFAULTS = ["This month", "Next up", "Someday"];
let seeding: Promise<unknown> | null = null;

/** The user's own Projects hub sections (project_groups), seeded with defaults on first use. */
export function useProjectGroups() {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let { data } = await supabase.from("project_groups").select("id,name,sort_order").order("sort_order");
    if (data && data.length === 0 && !localStorage.getItem(`careflow:project-groups-seeded:${user.id}`)) {
      seeding ??= Promise.resolve(supabase.from("project_groups").insert(DEFAULTS.map((name, i) => ({ name, sort_order: i, user_id: user.id }))));
      await seeding; seeding = null;
      try { localStorage.setItem(`careflow:project-groups-seeded:${user.id}`, "1"); } catch { /* */ }
      ({ data } = await supabase.from("project_groups").select("id,name,sort_order").order("sort_order"));
    }
    setGroups(data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const add = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const sort_order = (groups.at(-1)?.sort_order ?? -1) + 1;
    const { data } = await supabase.from("project_groups").insert({ name, sort_order, user_id: user.id }).select("id,name,sort_order").single();
    if (data) setGroups(g => [...g, data]);
  };
  const rename = async (id: string, name: string) => {
    setGroups(g => g.map(x => x.id === id ? { ...x, name } : x));
    await supabase.from("project_groups").update({ name }).eq("id", id);
  };
  const remove = async (id: string) => {
    setGroups(g => g.filter(x => x.id !== id));
    await supabase.from("project_groups").delete().eq("id", id); // projects.group_id → null (No section)
  };
  return { groups, add, rename, remove, reload: load };
}
