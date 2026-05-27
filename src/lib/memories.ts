import { supabase } from "@/integrations/supabase/client";
import type { Attachment } from "@/lib/types";

export type MemoryType =
  | "favorite_moment" | "highlight" | "growth" | "challenge" | "milestone"
  | "photo" | "reflection" | "moon" | "family" | "neurodivergent_win"
  | "home" | "meal" | "creative" | "grief_healing" | "birthday"
  | "trip" | "pet" | "custom";

export type MemoryPrivacy = "private" | "family" | "shared";

export interface Memory {
  id: string;
  userId: string;
  title: string;
  description?: string;
  reflection?: string;
  memoryType: MemoryType;
  mood?: string;
  date: string;
  time?: string;
  location?: string;
  attachments: Attachment[];
  voiceNotePath?: string;
  tags: string[];
  recipientIds: string[];
  lovedOneIds: string[];
  projectId?: string;
  routineId?: string;
  journalEntryId?: string;
  calendarEventId?: string;
  moonPhase?: string;
  season?: string;
  atmosphere?: string;
  meaningfulNote?: string;
  rememberNote?: string;
  challengingNote?: string;
  beautifulNote?: string;
  isFavorite: boolean;
  isPinned: boolean;
  chapter?: string;
  coverIndex: number;
  privacy: MemoryPrivacy;
  sharedLovedOneIds: string[];
  createdAt: string;
  updatedAt: string;
}

function fromRow(r: any): Memory {
  return {
    id: r.id, userId: r.user_id,
    title: r.title, description: r.description ?? undefined,
    reflection: r.reflection ?? undefined,
    memoryType: r.memory_type, mood: r.mood ?? undefined,
    date: r.date, time: r.time ?? undefined,
    location: r.location ?? undefined,
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    voiceNotePath: r.voice_note_path ?? undefined,
    tags: r.tags ?? [],
    recipientIds: r.recipient_ids ?? [],
    lovedOneIds: r.loved_one_ids ?? [],
    projectId: r.project_id ?? undefined,
    routineId: r.routine_id ?? undefined,
    journalEntryId: r.journal_entry_id ?? undefined,
    calendarEventId: r.calendar_event_id ?? undefined,
    moonPhase: r.moon_phase ?? undefined,
    season: r.season ?? undefined,
    atmosphere: r.atmosphere ?? undefined,
    meaningfulNote: r.meaningful_note ?? undefined,
    rememberNote: r.remember_note ?? undefined,
    challengingNote: r.challenging_note ?? undefined,
    beautifulNote: r.beautiful_note ?? undefined,
    isFavorite: !!r.is_favorite, isPinned: !!r.is_pinned,
    chapter: r.chapter ?? undefined,
    coverIndex: r.cover_index ?? 0,
    privacy: (r.privacy ?? "private") as MemoryPrivacy,
    sharedLovedOneIds: r.shared_loved_one_ids ?? [],
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function toRow(m: Partial<Memory>): any {
  const out: any = {};
  if (m.title !== undefined) out.title = m.title;
  if (m.description !== undefined) out.description = m.description;
  if (m.reflection !== undefined) out.reflection = m.reflection;
  if (m.memoryType !== undefined) out.memory_type = m.memoryType;
  if (m.mood !== undefined) out.mood = m.mood;
  if (m.date !== undefined) out.date = m.date;
  if (m.time !== undefined) out.time = m.time;
  if (m.location !== undefined) out.location = m.location;
  if (m.attachments !== undefined) out.attachments = m.attachments;
  if (m.voiceNotePath !== undefined) out.voice_note_path = m.voiceNotePath;
  if (m.tags !== undefined) out.tags = m.tags;
  if (m.recipientIds !== undefined) out.recipient_ids = m.recipientIds;
  if (m.lovedOneIds !== undefined) out.loved_one_ids = m.lovedOneIds;
  if (m.projectId !== undefined) out.project_id = m.projectId;
  if (m.routineId !== undefined) out.routine_id = m.routineId;
  if (m.journalEntryId !== undefined) out.journal_entry_id = m.journalEntryId;
  if (m.calendarEventId !== undefined) out.calendar_event_id = m.calendarEventId;
  if (m.moonPhase !== undefined) out.moon_phase = m.moonPhase;
  if (m.season !== undefined) out.season = m.season;
  if (m.atmosphere !== undefined) out.atmosphere = m.atmosphere;
  if (m.meaningfulNote !== undefined) out.meaningful_note = m.meaningfulNote;
  if (m.rememberNote !== undefined) out.remember_note = m.rememberNote;
  if (m.challengingNote !== undefined) out.challenging_note = m.challengingNote;
  if (m.beautifulNote !== undefined) out.beautiful_note = m.beautifulNote;
  if (m.isFavorite !== undefined) out.is_favorite = m.isFavorite;
  if (m.isPinned !== undefined) out.is_pinned = m.isPinned;
  if (m.chapter !== undefined) out.chapter = m.chapter;
  if (m.coverIndex !== undefined) out.cover_index = m.coverIndex;
  if (m.privacy !== undefined) out.privacy = m.privacy;
  if (m.sharedLovedOneIds !== undefined) out.shared_loved_one_ids = m.sharedLovedOneIds;
  return out;
}

export const MEMORY_PRIVACY_META: Record<MemoryPrivacy, { label: string; description: string; emoji: string }> = {
  private: { label: "Private", description: "Just for you. No one else sees it.", emoji: "🔒" },
  family:  { label: "Family", description: "Visible to anyone in your family circle.", emoji: "🏠" },
  shared:  { label: "Shared", description: "Tied to specific loved ones you choose.", emoji: "💞" },
};

export async function listMemories(): Promise<Memory[]> {
  const { data, error } = await (supabase as any)
    .from("memories").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createMemory(input: Partial<Memory>): Promise<Memory> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { data, error } = await (supabase as any)
    .from("memories").insert({ ...toRow(input), user_id: uid }).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateMemory(id: string, patch: Partial<Memory>): Promise<Memory> {
  const { data, error } = await (supabase as any)
    .from("memories").update(toRow(patch)).eq("id", id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteMemory(id: string): Promise<void> {
  const { error } = await (supabase as any).from("memories").delete().eq("id", id);
  if (error) throw error;
}

export const MEMORY_TYPES: { value: MemoryType; label: string; emoji: string }[] = [
  { value: "favorite_moment", label: "Favorite Moment", emoji: "✨" },
  { value: "highlight", label: "Highlight", emoji: "💛" },
  { value: "growth", label: "Growth", emoji: "🌱" },
  { value: "challenge", label: "Challenge", emoji: "🌧" },
  { value: "milestone", label: "Milestone", emoji: "🎉" },
  { value: "photo", label: "Photo Memory", emoji: "📸" },
  { value: "reflection", label: "Reflection", emoji: "📝" },
  { value: "moon", label: "Moon Memory", emoji: "🌙" },
  { value: "family", label: "Family Moment", emoji: "👨‍👩‍👧" },
  { value: "neurodivergent_win", label: "Neurodivergent Win", emoji: "🧠" },
  { value: "home", label: "Home Memory", emoji: "🏡" },
  { value: "meal", label: "Meal Memory", emoji: "🍲" },
  { value: "creative", label: "Creative Moment", emoji: "🎨" },
  { value: "grief_healing", label: "Grief & Healing", emoji: "🕯" },
  { value: "birthday", label: "Birthday", emoji: "🎂" },
  { value: "trip", label: "Trip", emoji: "✈️" },
  { value: "pet", label: "Pet Memory", emoji: "🐾" },
  { value: "custom", label: "Custom", emoji: "📌" },
];

export function memoryTypeMeta(t: MemoryType) {
  return MEMORY_TYPES.find((m) => m.value === t) ?? MEMORY_TYPES[0];
}

export function seasonOf(date: string): "spring" | "summer" | "autumn" | "winter" {
  const m = new Date(date + "T12:00:00").getMonth();
  if (m <= 1 || m === 11) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "autumn";
}