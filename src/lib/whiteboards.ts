import { supabase } from "@/integrations/supabase/client";

export interface Whiteboard {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  data: { nodes: any[]; edges: any[] };
  createdAt: string;
  updatedAt: string;
}

const fromRow = (r: any): Whiteboard => ({
  id: r.id,
  userId: r.user_id,
  title: r.title ?? "Untitled board",
  description: r.description ?? null,
  data: (r.data && typeof r.data === "object") ? r.data : { nodes: [], edges: [] },
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function listWhiteboards(): Promise<Whiteboard[]> {
  const { data, error } = await supabase
    .from("whiteboards" as any)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map(fromRow);
}

export async function getWhiteboard(id: string): Promise<Whiteboard | null> {
  const { data, error } = await supabase
    .from("whiteboards" as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function createWhiteboard(patch: Partial<Whiteboard> = {}): Promise<Whiteboard> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("not authenticated");
  const { data, error } = await supabase
    .from("whiteboards" as any)
    .insert({
      user_id: u.user.id,
      title: patch.title ?? "Untitled board",
      description: patch.description ?? null,
      data: patch.data ?? { nodes: [], edges: [] },
    } as any)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateWhiteboard(
  id: string,
  patch: Partial<Pick<Whiteboard, "title" | "description" | "data">>,
): Promise<void> {
  const row: any = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.data !== undefined) row.data = patch.data;
  const { error } = await supabase.from("whiteboards" as any).update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteWhiteboard(id: string): Promise<void> {
  const { error } = await supabase.from("whiteboards" as any).delete().eq("id", id);
  if (error) throw error;
}
