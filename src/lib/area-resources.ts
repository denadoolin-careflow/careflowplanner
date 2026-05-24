import { supabase } from "@/integrations/supabase/client";

export type AreaResourceKind = "link" | "note" | "embed" | "file";

export interface AreaResource {
  id: string;
  areaName: string;
  kind: AreaResourceKind;
  title: string;
  url?: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
}

const fromRow = (r: any): AreaResource => ({
  id: r.id,
  areaName: r.area_name,
  kind: (r.kind ?? "link") as AreaResourceKind,
  title: r.title,
  url: r.url ?? undefined,
  description: r.description ?? undefined,
  icon: r.icon ?? undefined,
  color: r.color ?? undefined,
  sortOrder: r.sort_order ?? 0,
});

export async function listAreaResources(areaName: string): Promise<AreaResource[]> {
  const { data, error } = await supabase
    .from("area_resources" as any)
    .select("*")
    .eq("area_name", areaName)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data as any[]) || []).map(fromRow);
}

export async function createAreaResource(
  areaName: string,
  patch: Partial<AreaResource>,
): Promise<AreaResource | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("area_resources" as any)
    .insert({
      user_id: uid,
      area_name: areaName,
      kind: patch.kind ?? "link",
      title: patch.title ?? "Untitled",
      url: patch.url ?? null,
      description: patch.description ?? null,
      icon: patch.icon ?? null,
      color: patch.color ?? null,
      sort_order: patch.sortOrder ?? 0,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateAreaResource(id: string, patch: Partial<AreaResource>) {
  const db: any = {};
  if (patch.title !== undefined) db.title = patch.title;
  if (patch.url !== undefined) db.url = patch.url ?? null;
  if (patch.description !== undefined) db.description = patch.description ?? null;
  if (patch.icon !== undefined) db.icon = patch.icon ?? null;
  if (patch.color !== undefined) db.color = patch.color ?? null;
  if (patch.kind !== undefined) db.kind = patch.kind;
  if (patch.sortOrder !== undefined) db.sort_order = patch.sortOrder;
  await supabase.from("area_resources" as any).update(db).eq("id", id);
}

export async function deleteAreaResource(id: string) {
  await supabase.from("area_resources" as any).delete().eq("id", id);
}