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
let styles: StyleMap = (() => { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } })();
const listeners = new Set<() => void>();
let loaded = false;
let userId: string | null = null;

function emit() { try { localStorage.setItem(LS, JSON.stringify(styles)); } catch {} listeners.forEach(l => l()); }

async function load() {
  if (loaded) return; loaded = true;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  userId = user.id;
  const { data } = await (supabase as any).from("note_property_styles").select("styles").eq("user_id", user.id).maybeSingle();
  if (data?.styles) { styles = { ...styles, ...data.styles }; emit(); }
}

let saveTimer: any;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!userId) return;
    (supabase as any).from("note_property_styles").upsert({ user_id: userId, styles, updated_at: new Date().toISOString() }).then(() => {});
  }, 500);
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
  const k = normKey(name);
  styles = { ...styles, [k]: { ...styles[k], ...bit } }; emit(); persist();
}
export function setOptionStyle(name: string, option: string, bit: StyleBit) {
  const k = normKey(name); const o = normKey(option); const cur = styles[k] ?? {};
  styles = { ...styles, [k]: { ...cur, options: { ...cur.options, [o]: { ...cur.options?.[o], ...bit } } } };
  emit(); persist();
}

export function usePropertyStyles(): StyleMap {
  const [, set] = useState(0);
  useEffect(() => { const l = () => set(n => n + 1); listeners.add(l); load(); return () => { listeners.delete(l); }; }, []);
  return styles;
}
