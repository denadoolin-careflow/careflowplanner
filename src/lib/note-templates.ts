import { supabase } from "@/integrations/supabase/client";

export interface NoteTemplate {
  id: string;
  name: string;
  body: string;
  icon: string | null;
  coverGradient: string | null;
  tags: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const fromRow = (r: any): NoteTemplate => ({
  id: r.id,
  name: r.name,
  body: r.body ?? "",
  icon: r.icon ?? null,
  coverGradient: r.cover_gradient ?? null,
  tags: Array.isArray(r.tags) ? r.tags : [],
  sortOrder: r.sort_order ?? 0,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function listNoteTemplates(): Promise<NoteTemplate[]> {
  const { data, error } = await supabase
    .from("note_templates" as any)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createNoteTemplate(input: {
  name: string;
  body?: string;
  icon?: string | null;
  coverGradient?: string | null;
  tags?: string[];
}): Promise<NoteTemplate> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Sign in required");
  const { data, error } = await supabase
    .from("note_templates" as any)
    .insert({
      user_id: uid,
      name: input.name,
      body: input.body ?? "",
      icon: input.icon ?? null,
      cover_gradient: input.coverGradient ?? null,
      tags: input.tags ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteNoteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("note_templates" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function renameNoteTemplate(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("note_templates" as any).update({ name }).eq("id", id);
  if (error) throw error;
}