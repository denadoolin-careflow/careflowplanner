/**
 * Shared look (icon + color) for note properties and their choices, keyed by
 * property name so a choice like "Full Moon" looks the same on every note.
 * Synced per account (note_property_styles), cached in localStorage.
 */
import { useEffect, useState } from "react";
import {
  Moon, Sun, Leaf, Heart, Star, Flame, Droplet, Flag, Tag, Sparkles, Sprout, Flower2,
  Circle, CircleDot, Zap, Cloud, Snowflake, Feather, Gem, Bookmark, Smile, Target, Compass, Home,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const PROPERTY_ICONS: Record<string, any> = {
  moon: Moon, sun: Sun, leaf: Leaf, heart: Heart, star: Star, flame: Flame, droplet: Droplet,
  flag: Flag, tag: Tag, sparkles: Sparkles, sprout: Sprout, flower: Flower2, circle: Circle,
  dot: CircleDot, zap: Zap, cloud: Cloud, snow: Snowflake, feather: Feather, gem: Gem,
  bookmark: Bookmark, smile: Smile, target: Target, compass: Compass, home: Home,
};

export interface StyleBit { icon?: string; color?: string }
export interface PropStyle extends StyleBit { options?: Record<string, StyleBit> }
export type StyleMap = Record<string, PropStyle>;

export const normKey = (s: string) => s.trim().toLowerCase();

/** Built-in defaults for the rhythm bundle (overridable). */
export const DEFAULT_STYLES: StyleMap = {
  "moon phase": { icon: "moon", options: {
    "new moon": { icon: "circle" }, "full moon": { icon: "sun" },
  } },
  "moon sign": { icon: "star" },
  "season": { icon: "leaf", options: {
    spring: { icon: "sprout" }, summer: { icon: "sun" }, autumn: { icon: "leaf" }, fall: { icon: "leaf" }, winter: { icon: "snow" },
  } },
  "cycle phase": { icon: "droplet" },
  "rhythm phase": { icon: "sparkles", options: {
    plan: { icon: "sprout", color: "#E3F1D6" }, grow: { icon: "sun", color: "#FBF2CF" },
    care: { icon: "heart", color: "#FCE6D2" }, "let go": { icon: "feather", color: "#FBE3E3" },
  } },
};

const LS = "careflow.notes.propertyStyles";
let styles: StyleMap = {};
const listeners = new Set<() => void>();
let userId: string | null = null;
let pending: StyleMap = {};
let saving = false;
let started = false;
let channel: ReturnType<typeof supabase.channel> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** Merge only changed fields, preserving unrelated choices from other devices. */
export function mergeStylePatch(base: StyleMap, patch: StyleMap): StyleMap {
  const next = { ...base };
  for (const [key, bit] of Object.entries(patch)) {
    const current = next[key] ?? {};
    const options = { ...current.options };
    for (const [option, value] of Object.entries(bit.options ?? {})) options[option] = { ...options[option], ...value };
    next[key] = { ...current, ...bit, ...(current.options || bit.options ? { options } : {}) };
  }
  return next;
}

function readCache(key: string): StyleMap {
  try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; }
}
function emit() {
  if (userId) {
    try {
      localStorage.setItem(`${LS}.${userId}`, JSON.stringify(styles));
      localStorage.setItem(`${LS}.${userId}.pending`, JSON.stringify(pending));
    } catch {}
  }
  listeners.forEach(l => l());
}
async function refresh() {
  const uid = userId;
  if (!uid) return;
  const { data, error } = await supabase.from("note_property_styles").select("styles").eq("user_id", uid).maybeSingle();
  if (uid !== userId || error) return;
  styles = mergeStylePatch((data?.styles ?? {}) as StyleMap, pending);
  emit();
}
async function flush() {
  const uid = userId;
  if (!uid || saving || !Object.keys(pending).length) return;
  saving = true;
  const patch = pending;
  pending = {};
  try {
    const { data, error } = await supabase.rpc("patch_note_property_styles", { p_patch: patch as any });
    if (uid !== userId) return;
    if (error) throw error;
    styles = mergeStylePatch(data as StyleMap, pending);
  } catch {
    if (uid === userId) pending = mergeStylePatch(patch, pending);
  } finally {
    saving = false;
    emit();
    if (Object.keys(pending).length) persist(5000);
  }
}
function persist(delay = 300) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void flush(); }, delay);
}
async function switchAccount(uid: string | null) {
  if (uid === userId) return;
  clearTimeout(saveTimer);
  if (channel) { void supabase.removeChannel(channel); channel = null; }
  userId = uid;
  pending = uid ? readCache(`${LS}.${uid}.pending`) : {};
  styles = uid ? readCache(`${LS}.${uid}`) : {};
  emit();
  if (!uid) return;
  channel = supabase.channel(`note-property-styles-${uid}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "note_property_styles", filter: `user_id=eq.${uid}` }, () => { void refresh(); })
    .subscribe(status => { if (status === "SUBSCRIBED") void refresh(); });
  await refresh();
  persist();
}
function startSync() {
  if (started) return;
  started = true;
  void supabase.auth.getSession().then(({ data }) => switchAccount(data.session?.user.id ?? null));
  supabase.auth.onAuthStateChange((_event, session) => { void switchAccount(session?.user.id ?? null); });
  const resume = () => { if (document.visibilityState === "visible") { void refresh(); persist(); } };
  window.addEventListener("focus", resume);
  window.addEventListener("online", resume);
  document.addEventListener("visibilitychange", resume);
}

/** Resolve a property's own style (user -> default). */
export function resolveProp(map: StyleMap, name: string): StyleBit {
  const k = normKey(name); const u = map[k]; const d = DEFAULT_STYLES[k];
  return { icon: u?.icon ?? d?.icon, color: u?.color ?? d?.color };
}
/** Resolve a choice's style: user global -> per-note color -> default. */
export function resolveOption(map: StyleMap, name: string, option: string, noteColor?: string): StyleBit {
  const k = normKey(name); const o = normKey(option);
  const u = map[k]?.options?.[o]; const d = DEFAULT_STYLES[k]?.options?.[o];
  return { icon: u?.icon ?? d?.icon, color: u?.color ?? noteColor ?? d?.color };
}

export function setPropStyle(name: string, bit: StyleBit) {
  if (!userId) return;
  const k = normKey(name);
  // JSON null explicitly clears an override on every device (undefined is omitted).
  const patch = { [k]: Object.fromEntries(Object.entries(bit).map(([key, value]) => [key, value ?? null])) } as StyleMap;
  styles = mergeStylePatch(styles, patch); pending = mergeStylePatch(pending, patch); emit(); persist();
}
export function setOptionStyle(name: string, option: string, bit: StyleBit) {
  if (!userId) return;
  const k = normKey(name); const o = normKey(option);
  const patch = { [k]: { options: { [o]: Object.fromEntries(Object.entries(bit).map(([key, value]) => [key, value ?? null])) } } } as StyleMap;
  styles = mergeStylePatch(styles, patch); pending = mergeStylePatch(pending, patch);
  emit(); persist();
}

export function usePropertyStyles(): StyleMap {
  const [, set] = useState(0);
  useEffect(() => { const l = () => set(n => n + 1); listeners.add(l); startSync(); return () => { listeners.delete(l); }; }, []);
  return styles;
}
