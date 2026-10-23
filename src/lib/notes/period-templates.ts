/**
 * Day / week / month note templates: prompts (headings), pre-added properties
 * and which CareFlow connections show beside the note. Synced per account
 * (note_period_templates), cached in localStorage.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { NoteProperty, NotePropertyType, PeriodKind } from "@/lib/notes";

export type ConnectionKey = "appointments" | "goals" | "cosmic" | "meals" | "meds" | "mood" | "connections";
export const CONNECTION_LABEL: Record<ConnectionKey, string> = {
  appointments: "Appointments", goals: "Goals", cosmic: "Cosmic events", meals: "Meals",
  meds: "Meds", mood: "Mood", connections: "Connections",
};
export const ALL_CONNECTIONS = Object.keys(CONNECTION_LABEL) as ConnectionKey[];

export interface TemplateProp { name: string; type: NotePropertyType; options?: string[] }
export interface PeriodTemplate { prompts: string[]; properties: TemplateProp[]; connections: ConnectionKey[] }
export type PeriodTemplates = Record<PeriodKind, PeriodTemplate>;

const MOODS = ["Calm", "Happy", "Tired", "Anxious", "Overwhelmed", "Grateful"];
export const DEFAULT_PERIOD_TEMPLATES: PeriodTemplates = {
  daily: {
    prompts: ["Intention", "Highlights", "Challenges", "Ideas", "Memories"],
    properties: [{ name: "Mood", type: "select", options: MOODS }, { name: "Energy", type: "select", options: ["Low", "Medium", "High"] }],
    connections: [...ALL_CONNECTIONS],
  },
  weekly: {
    prompts: ["Intention for the week", "Goal", "Highlights", "Challenges"],
    properties: [{ name: "Weekly intention", type: "text" }, { name: "Mood", type: "select", options: MOODS }],
    connections: [...ALL_CONNECTIONS],
  },
  monthly: {
    prompts: ["Intention", "Goals", "Memories"],
    properties: [{ name: "Monthly theme", type: "text" }],
    connections: ["appointments", "goals", "cosmic", "connections"],
  },
};

const norm = (s: string) => s.trim().toLocaleLowerCase();

/** Adds missing headings and properties; never replaces existing writing or values. */
export function applyPeriodTemplate(note: { body: string; properties?: NoteProperty[] }, tpl: Pick<PeriodTemplate, "prompts" | "properties">) {
  const headings = new Set(Array.from(note.body.matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm), m => norm(m[1])));
  const missing = tpl.prompts.filter(p => {
    const k = norm(p);
    if (!k || headings.has(k)) return false;
    headings.add(k); return true;
  });
  const properties = [...(note.properties ?? [])];
  for (const p of tpl.properties) {
    if (!p.name.trim() || properties.some(x => norm(x.name) === norm(p.name))) continue;
    properties.push({ id: `period-${norm(p.name).replace(/\s+/g, "-")}`, name: p.name.trim(), type: p.type, value: p.type === "multi" ? [] : null, ...(p.options ? { options: [...p.options] } : {}) });
  }
  const body = missing.length
    ? `${note.body.trimEnd()}${note.body.trim() ? "\n\n" : ""}${missing.map(p => `## ${p.trim()}\n\n`).join("")}`
    : note.body;
  return { body, properties, changed: missing.length > 0 || properties.length !== (note.properties ?? []).length };
}

const LS = "careflow.notes.periodTemplates";
let current: PeriodTemplates = (() => {
  try { const v = localStorage.getItem(LS); if (v) return { ...DEFAULT_PERIOD_TEMPLATES, ...JSON.parse(v) }; } catch { /* noop */ }
  return DEFAULT_PERIOD_TEMPLATES;
})();
const listeners = new Set<() => void>();
let loaded = false;

export const readPeriodTemplates = () => current;

export async function loadPeriodTemplates(): Promise<PeriodTemplates> {
  if (loaded) return current;
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return current;
  const { data } = await supabase.from("note_period_templates").select("templates").eq("user_id", u.user.id).maybeSingle();
  loaded = true;
  if (data?.templates && typeof data.templates === "object") {
    current = { ...DEFAULT_PERIOD_TEMPLATES, ...(data.templates as any) };
    try { localStorage.setItem(LS, JSON.stringify(current)); } catch { /* noop */ }
    listeners.forEach(l => l());
  }
  return current;
}

export async function savePeriodTemplates(next: PeriodTemplates) {
  current = next;
  try { localStorage.setItem(LS, JSON.stringify(next)); } catch { /* noop */ }
  listeners.forEach(l => l());
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return;
  const { error } = await supabase.from("note_period_templates").upsert({ user_id: u.user.id, templates: next as any, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export function usePeriodTemplates(): PeriodTemplates {
  const [, set] = useState(0);
  useEffect(() => {
    const l = () => set(n => n + 1);
    listeners.add(l);
    void loadPeriodTemplates();
    return () => { listeners.delete(l); };
  }, []);
  return current;
}
