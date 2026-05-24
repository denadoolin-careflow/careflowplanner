import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Season = "barely_surviving" | "stabilizing" | "thriving";
export type Pillar = "home" | "health" | "care" | "heart" | "wealth" | "mind" | "time";

export const ALL_PILLARS: Pillar[] = ["home", "health", "care", "heart", "wealth", "mind", "time"];

export const PILLAR_META: Record<Pillar, { label: string; blurb: string; route: string }> = {
  home:   { label: "Home",   blurb: "Chores, meals, resets",            route: "/home-areas" },
  health: { label: "Health", blurb: "Appointments, symptoms, mood",     route: "/health" },
  care:   { label: "Care",   blurb: "Family, caregiving, connection",   route: "/caregiving" },
  heart:  { label: "Heart",  blurb: "Moon, cycle, emotional rhythm",    route: "/journal" },
  wealth: { label: "Wealth", blurb: "Bills, spending, subscriptions",   route: "/wealth" },
  mind:   { label: "Mind",   blurb: "Brain dumps, journaling, grounding", route: "/mental-load" },
  time:   { label: "Time",   blurb: "Calendar, routines, blocking",     route: "/calendar" },
};

export const SEASON_META: Record<Season, { label: string; tagline: string; topN: number }> = {
  barely_surviving: { label: "Barely Surviving", tagline: "Just the basics. We've got you.", topN: 2 },
  stabilizing:      { label: "Stabilizing",      tagline: "A little structure, gently.",     topN: 3 },
  thriving:         { label: "Thriving",         tagline: "Ready to build and grow.",        topN: 5 },
};

export const DEFAULT_MVP_ITEMS = [
  "Drink water",
  "Feed family",
  "One reset task",
  "One important task",
  "Rest",
];

export interface CareProfile {
  id?: string;
  user_id?: string;
  season: Season | null;
  top_n: number;
  mvp_items: string[];
  pillars_enabled: Pillar[];
  pillars_order: Pillar[];
  completed_at: string | null;
}

const EMPTY: CareProfile = {
  season: null,
  top_n: 3,
  mvp_items: DEFAULT_MVP_ITEMS,
  pillars_enabled: ALL_PILLARS,
  pillars_order: ALL_PILLARS,
  completed_at: null,
};

const CACHE_KEY = "careflow.careProfile";

function readCache(): CareProfile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CareProfile) : null;
  } catch { return null; }
}

function writeCache(p: CareProfile) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

export function useCareProfile() {
  const [profile, setProfile] = useState<CareProfile>(() => readCache() ?? EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("care_profile")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancel) return;
      if (data) {
        const next: CareProfile = {
          id: data.id,
          user_id: data.user_id,
          season: (data.season as Season | null) ?? null,
          top_n: data.top_n ?? 3,
          mvp_items: (data.mvp_items as string[]) ?? DEFAULT_MVP_ITEMS,
          pillars_enabled: (data.pillars_enabled as Pillar[]) ?? ALL_PILLARS,
          pillars_order: (data.pillars_order as Pillar[]) ?? ALL_PILLARS,
          completed_at: data.completed_at ?? null,
        };
        setProfile(next);
        writeCache(next);
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);

  const save = useCallback(async (patch: Partial<CareProfile>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = { ...profile, ...patch };
    setProfile(next);
    writeCache(next);
    await supabase.from("care_profile").upsert({
      user_id: user.id,
      season: next.season,
      top_n: next.top_n,
      mvp_items: next.mvp_items,
      pillars_enabled: next.pillars_enabled,
      pillars_order: next.pillars_order,
      completed_at: next.completed_at,
    }, { onConflict: "user_id" });
  }, [profile]);

  return { profile, loading, save };
}

export function careHeaderForSeason(s: Season | null): string {
  if (s === "barely_surviving") return "One small thing at a time. You're doing enough.";
  if (s === "thriving") return "Build with intention. Protect what matters.";
  if (s === "stabilizing") return "Gentle structure for a soft day.";
  return "Turn life's load into a gentle repeatable loop.";
}