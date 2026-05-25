import { supabase } from "@/integrations/supabase/client";

export type TemplateKind = "task" | "section";

export interface TaskTemplatePayload {
  title?: string;
  notes?: string;
  area?: string;
  tags?: string[];
  priority?: "low" | "medium" | "high";
  energy?: "low" | "medium" | "high";
  estMinutes?: number;
}

export interface SectionTemplatePayload {
  sectionName?: string;
  tasks?: TaskTemplatePayload[];
}

export interface TaskTemplate {
  id: string;
  name: string;
  kind: TemplateKind;
  payload: TaskTemplatePayload | SectionTemplatePayload;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const fromRow = (r: any): TaskTemplate => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  payload: r.payload ?? {},
  sortOrder: r.sort_order ?? 0,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function listTemplates(): Promise<TaskTemplate[]> {
  const { data, error } = await supabase
    .from("task_templates" as any)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createTemplate(input: {
  name: string;
  kind: TemplateKind;
  payload: TaskTemplatePayload | SectionTemplatePayload;
}): Promise<TaskTemplate> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Sign in required");
  const { data, error } = await supabase
    .from("task_templates" as any)
    .insert({ user_id: uid, name: input.name, kind: input.kind, payload: input.payload as any })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("task_templates" as any).delete().eq("id", id);
  if (error) throw error;
}
