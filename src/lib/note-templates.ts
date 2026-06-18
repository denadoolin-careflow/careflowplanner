import { supabase } from "@/integrations/supabase/client";

export interface NoteTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
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
  description: r.description ?? null,
  category: r.category ?? null,
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
  category?: string | null;
  description?: string | null;
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
      category: input.category ?? null,
      description: input.description ?? null,
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

export async function updateNoteTemplate(
  id: string,
  patch: Partial<Pick<NoteTemplate, "name" | "description" | "category" | "body" | "tags" | "icon" | "coverGradient">>,
): Promise<void> {
  const row: Record<string, any> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.icon !== undefined) row.icon = patch.icon;
  if (patch.coverGradient !== undefined) row.cover_gradient = patch.coverGradient;
  const { error } = await supabase.from("note_templates" as any).update(row).eq("id", id);
  if (error) throw error;
}

/**
 * Fill template placeholders with live values.
 * Supported tokens (case-insensitive):
 *   {date} / {today}     → Monday, Jan 6, 2026
 *   {date:iso}           → 2026-01-06
 *   {tomorrow} {yesterday}
 *   {time}               → 9:42 AM
 *   {weekday}            → Monday
 *   {month} {year} {day}
 *   {cursor}             → cursor placeholder (left as empty for now)
 */
export function applyTemplatePlaceholders(input: string, now: Date = new Date()): string {
  if (!input) return input;
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const long = (d: Date) =>
    d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const longIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  const month = now.toLocaleDateString(undefined, { month: "long" });
  const tokens: Record<string, string> = {
    date: long(now),
    "date:iso": iso,
    today: long(now),
    "today:iso": iso,
    tomorrow: long(tomorrow),
    "tomorrow:iso": longIso(tomorrow),
    yesterday: long(yesterday),
    "yesterday:iso": longIso(yesterday),
    time,
    weekday,
    month,
    year: String(now.getFullYear()),
    day: String(now.getDate()),
    cursor: "",
  };
  return input.replace(/\{([a-zA-Z_:]+)\}/g, (full, key) => {
    const k = String(key).toLowerCase();
    return k in tokens ? tokens[k] : full;
  });
}

export const TEMPLATE_PLACEHOLDER_HELP = [
  "{date}", "{date:iso}", "{today}", "{tomorrow}", "{yesterday}",
  "{time}", "{weekday}", "{month}", "{year}", "{day}",
];