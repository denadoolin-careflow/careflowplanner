import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TaskLinkEntity =
  | "note" | "journal" | "goal" | "habit" | "meal" | "appointment" | "project" | "person";

export const TASK_LINK_LABEL: Record<TaskLinkEntity, string> = {
  note: "Note",
  journal: "Journal",
  goal: "Goal",
  habit: "Habit",
  meal: "Meal",
  appointment: "Appointment",
  project: "Project",
  person: "Person",
};

export const TASK_LINK_ROUTE: Record<TaskLinkEntity, (id: string) => string> = {
  note: (id) => `/notes/${id}`,
  journal: () => "/journal",
  goal: () => "/goals",
  habit: () => "/habits",
  meal: () => "/meals",
  appointment: () => "/calendar",
  project: (id) => `/projects/${id}`,
  person: () => "/caregiving",
};

export interface TaskLink {
  id: string;
  taskId: string;
  entityType: TaskLinkEntity;
  entityId: string;
  createdAt: string;
}

const fromRow = (r: any): TaskLink => ({
  id: r.id, taskId: r.task_id, entityType: r.entity_type, entityId: r.entity_id, createdAt: r.created_at,
});

export async function linkTaskTo(taskId: string, entityType: TaskLinkEntity, entityId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("not authenticated");
  const { error } = await (supabase as any)
    .from("task_links")
    .insert({ user_id: u.user.id, task_id: taskId, entity_type: entityType, entity_id: entityId });
  if (error && !`${error.message}`.includes("duplicate")) throw error;
}

export async function unlinkTaskFrom(taskId: string, entityType: TaskLinkEntity, entityId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("task_links")
    .delete()
    .eq("task_id", taskId).eq("entity_type", entityType).eq("entity_id", entityId);
  if (error) throw error;
}

export async function linksForTask(taskId: string): Promise<TaskLink[]> {
  const { data, error } = await (supabase as any)
    .from("task_links")
    .select("*")
    .eq("task_id", taskId);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export function useTaskLinks(taskId: string | null) {
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    if (!taskId) { setLinks([]); return; }
    setLoading(true);
    try { setLinks(await linksForTask(taskId)); } finally { setLoading(false); }
  }, [taskId]);
  useEffect(() => { void reload(); }, [reload]);
  return { links, loading, reload };
}