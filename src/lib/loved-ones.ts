import { supabase } from "@/integrations/supabase/client";

export interface LovedOne {
  id: string;
  userId: string;
  name: string;
  relation?: string;
  kind: string;
  birthDate?: string;
  notes?: string;
  color?: string;
  avatarEmoji?: string;
  avatarUrl?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function fromRow(r: any): LovedOne {
  return {
    id: r.id, userId: r.user_id, name: r.name,
    relation: r.relation ?? undefined, kind: r.kind,
    birthDate: r.birth_date ?? undefined,
    notes: r.notes ?? undefined, color: r.color ?? undefined,
    avatarEmoji: r.avatar_emoji ?? undefined,
    avatarUrl: r.avatar_url ?? undefined,
    sortOrder: r.sort_order ?? 0,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export async function listLovedOnes(): Promise<LovedOne[]> {
  const { data, error } = await (supabase as any)
    .from("loved_ones").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createLovedOne(input: Partial<LovedOne>): Promise<LovedOne> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Not signed in");
  const row: any = {
    user_id: uid,
    name: input.name ?? "Untitled",
    relation: input.relation,
    kind: input.kind ?? "person",
    birth_date: input.birthDate,
    notes: input.notes,
    color: input.color,
    avatar_emoji: input.avatarEmoji,
    avatar_url: input.avatarUrl,
    sort_order: input.sortOrder ?? 0,
  };
  const { data, error } = await (supabase as any).from("loved_ones").insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateLovedOne(id: string, patch: Partial<LovedOne>): Promise<LovedOne> {
  const row: any = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.relation !== undefined) row.relation = patch.relation;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.birthDate !== undefined) row.birth_date = patch.birthDate;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.avatarEmoji !== undefined) row.avatar_emoji = patch.avatarEmoji;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  const { data, error } = await (supabase as any).from("loved_ones").update(row).eq("id", id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteLovedOne(id: string): Promise<void> {
  const { error } = await (supabase as any).from("loved_ones").delete().eq("id", id);
  if (error) throw error;
}