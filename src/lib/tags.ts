import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Tag {
  id: string;
  name: string;
  color: string;       // hex (e.g. #f59e0b)
  icon: string;        // lucide icon name (kebab case ok, we normalize)
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

const fromRow = (r: any): Tag => ({
  id: r.id,
  name: r.name,
  color: r.color ?? DEFAULT_COLOR,
  icon: r.icon ?? DEFAULT_ICON,
  pinned: !!r.pinned,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/* ------------------------------------------------------------------ */
/*  Palette + icon presets shared by TagPicker + manager               */
/* ------------------------------------------------------------------ */

export const TAG_COLORS: { name: string; hex: string }[] = [
  // Saturated base
  { name: "Coral",     hex: "#f97373" },
  { name: "Amber",     hex: "#f59e0b" },
  { name: "Sun",       hex: "#facc15" },
  { name: "Lime",      hex: "#84cc16" },
  { name: "Sage",      hex: "#22c55e" },
  { name: "Teal",      hex: "#14b8a6" },
  { name: "Sky",       hex: "#0ea5e9" },
  { name: "Indigo",    hex: "#6366f1" },
  { name: "Violet",    hex: "#a855f7" },
  { name: "Rose",      hex: "#ec4899" },
  { name: "Stone",     hex: "#78716c" },
  { name: "Slate",     hex: "#64748b" },
  // Soft atmosphere palette — pairs nicely with Sage Sanctuary, Soft Linen,
  // Coastal Calm, Moonlit Plum, Golden Hearth, Blossom.
  { name: "Linen",     hex: "#f4ead8" },
  { name: "Mist",      hex: "#cfd8e3" },
  { name: "Sage Soft", hex: "#c6d2bd" },
  { name: "Coastal",   hex: "#b8d4d6" },
  { name: "Plum Mist", hex: "#d8c7df" },
  { name: "Hearth",    hex: "#f0c79a" },
  { name: "Blossom",   hex: "#f5cdd7" },
  { name: "Moss",      hex: "#a8b29a" },
];

export const TAG_ICONS = [
  "tag", "sparkle", "heart", "star", "flag", "bookmark",
  "leaf", "sun", "moon", "compass", "flame", "cloud",
  "feather", "lightbulb", "rocket", "gem",
] as const;

export const DEFAULT_COLOR = "#6366f1";
export const DEFAULT_ICON = "tag";

export function normalizeTagName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 40);
}

/* Stable, deterministic color when a tag name has no row yet
 * (e.g. legacy string-only tags). */
export function fallbackColorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length].hex;
}

/* Pick black/white text based on background luminance. */
export function readableTextOn(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 165 ? "#1a1a1a" : "#ffffff";
}

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags" as any)
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createTag(patch: { name: string; color?: string; icon?: string }): Promise<Tag> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("Not authenticated");
  const name = normalizeTagName(patch.name);
  if (!name) throw new Error("Tag name is required");
  const { data, error } = await supabase
    .from("tags" as any)
    .insert({
      user_id: u.user.id,
      name,
      color: patch.color ?? DEFAULT_COLOR,
      icon: patch.icon ?? DEFAULT_ICON,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateTag(id: string, patch: Partial<Pick<Tag, "name" | "color" | "icon" | "pinned">>): Promise<void> {
  const row: any = {};
  if (patch.name !== undefined) row.name = normalizeTagName(patch.name);
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.icon !== undefined) row.icon = patch.icon;
  if (patch.pinned !== undefined) row.pinned = patch.pinned;
  const { error } = await supabase.from("tags" as any).update(row).eq("id", id);
  if (error) throw error;
  try { window.dispatchEvent(new Event("careflow:tags:pinned-changed")); } catch {}
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from("tags" as any).delete().eq("id", id);
  if (error) throw error;
  try { window.dispatchEvent(new Event("careflow:tags:pinned-changed")); } catch {}
}

export async function listPinnedTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags" as any)
    .select("*")
    .eq("pinned", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}