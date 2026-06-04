import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectIdea } from "@/lib/types";

const fromRow = (r: any): ProjectIdea => ({
  id: r.id,
  title: r.title,
  note: r.note ?? undefined,
  source: r.source ?? undefined,
  promotedProjectId: r.promoted_project_id ?? undefined,
  createdAt: r.created_at,
});

export function useProjectIdeas() {
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("project_ideas")
      .select("*")
      .order("created_at", { ascending: false });
    setIdeas((data ?? []).map(fromRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(async (title: string, note?: string) => {
    const t = title.trim();
    if (!t) return null;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return null;
    const { data } = await supabase
      .from("project_ideas")
      .insert({ user_id: uid, title: t, note: note ?? null })
      .select()
      .single();
    if (data) {
      const idea = fromRow(data);
      setIdeas((prev) => [idea, ...prev]);
      return idea;
    }
    return null;
  }, []);

  const remove = useCallback(async (id: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("project_ideas").delete().eq("id", id);
  }, []);

  const markPromoted = useCallback(async (id: string, projectId: string) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, promotedProjectId: projectId } : i)));
    await supabase.from("project_ideas").update({ promoted_project_id: projectId }).eq("id", id);
  }, []);

  return { ideas, loading, add, remove, markPromoted, reload: load };
}