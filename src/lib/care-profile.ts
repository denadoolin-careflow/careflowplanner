import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MedicalHistory {
  id: string;
  recipient_id: string;
  date: string;
  title: string;
  category: string | null;
  provider: string | null;
  notes: string | null;
}

export interface CareProvider {
  id: string;
  recipient_id: string;
  name: string;
  role: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  next_appt: string | null;
}

export interface CareAINote {
  id: string;
  recipient_id: string;
  focus: string;
  prompt: string | null;
  body: string;
  created_at: string;
}

export const PROVIDER_ROLES = [
  "doctor", "dentist", "therapist", "psychiatrist", "specialist",
  "pediatrician", "ophthalmologist", "physiotherapist", "social worker", "other",
] as const;

export const LOVE_LANGUAGES = [
  "Words of affirmation", "Acts of service", "Receiving gifts",
  "Quality time", "Physical touch",
] as const;

export const EDUCATION_LEVELS = [
  "Infant", "Toddler", "Preschool", "Elementary", "Middle school",
  "High school", "Some college", "Associate's", "Bachelor's", "Master's",
  "Doctorate", "Vocational", "Other",
] as const;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Compute zodiac sign from ISO date (YYYY-MM-DD). */
export function zodiacFor(dateStr: string | undefined | null): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return undefined;
  const m = d.getMonth() + 1, day = d.getDate();
  const signs: [string, number, number, number, number][] = [
    ["Capricorn", 12, 22, 1, 19],
    ["Aquarius", 1, 20, 2, 18],
    ["Pisces", 2, 19, 3, 20],
    ["Aries", 3, 21, 4, 19],
    ["Taurus", 4, 20, 5, 20],
    ["Gemini", 5, 21, 6, 20],
    ["Cancer", 6, 21, 7, 22],
    ["Leo", 7, 23, 8, 22],
    ["Virgo", 8, 23, 9, 22],
    ["Libra", 9, 23, 10, 22],
    ["Scorpio", 10, 23, 11, 21],
    ["Sagittarius", 11, 22, 12, 21],
  ];
  for (const [name, sm, sd, em, ed] of signs) {
    if ((m === sm && day >= sd) || (m === em && day <= ed)) return name;
  }
  return undefined;
}

export function ageFrom(dateStr: string | undefined | null): number | undefined {
  if (!dateStr) return undefined;
  const b = new Date(dateStr + "T00:00:00");
  if (isNaN(b.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const mDiff = now.getMonth() - b.getMonth();
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

/* ---------- Medical history ---------- */
export const medicalHistory = {
  async list(recipientId: string): Promise<MedicalHistory[]> {
    const { data } = await supabase
      .from("medical_history" as any)
      .select("*")
      .eq("recipient_id", recipientId)
      .order("date", { ascending: false });
    return (data ?? []) as any;
  },
  async add(entry: Omit<MedicalHistory, "id">): Promise<MedicalHistory | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("medical_history" as any)
      .insert({ user_id: user.id, ...entry } as any)
      .select().single();
    return data as any;
  },
  async update(id: string, patch: Partial<MedicalHistory>) {
    await supabase.from("medical_history" as any).update(patch as any).eq("id", id);
  },
  async remove(id: string) {
    await supabase.from("medical_history" as any).delete().eq("id", id);
  },
};

/* ---------- Care providers ---------- */
export const careProviders = {
  async list(recipientId: string): Promise<CareProvider[]> {
    const { data } = await supabase
      .from("care_providers" as any)
      .select("*")
      .eq("recipient_id", recipientId)
      .order("role", { ascending: true });
    return (data ?? []) as any;
  },
  async add(entry: Omit<CareProvider, "id">): Promise<CareProvider | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("care_providers" as any)
      .insert({ user_id: user.id, ...entry } as any)
      .select().single();
    return data as any;
  },
  async update(id: string, patch: Partial<CareProvider>) {
    await supabase.from("care_providers" as any).update(patch as any).eq("id", id);
  },
  async remove(id: string) {
    await supabase.from("care_providers" as any).delete().eq("id", id);
  },
};

/* ---------- AI care notes ---------- */
export const careAINotes = {
  async list(recipientId: string): Promise<CareAINote[]> {
    const { data } = await supabase
      .from("care_ai_notes" as any)
      .select("*")
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: false });
    return (data ?? []) as any;
  },
  async add(entry: Omit<CareAINote, "id" | "created_at">): Promise<CareAINote | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("care_ai_notes" as any)
      .insert({ user_id: user.id, ...entry } as any)
      .select().single();
    return data as any;
  },
  async remove(id: string) {
    await supabase.from("care_ai_notes" as any).delete().eq("id", id);
  },
};

/** React hooks. */
export function useRecipientData(recipientId: string | undefined) {
  const [history, setHistory] = useState<MedicalHistory[]>([]);
  const [providers, setProviders] = useState<CareProvider[]>([]);
  const [aiNotes, setAINotes] = useState<CareAINote[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    if (!recipientId) return;
    setLoading(true);
    const [h, p, n] = await Promise.all([
      medicalHistory.list(recipientId),
      careProviders.list(recipientId),
      careAINotes.list(recipientId),
    ]);
    setHistory(h); setProviders(p); setAINotes(n);
    setLoading(false);
  };

  useEffect(() => { void reload(); }, [recipientId]);

  return { history, providers, aiNotes, loading, reload, setHistory, setProviders, setAINotes };
}