import { Home, Users, Leaf, Wallet, Sparkles, Moon, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Anchors are the "why" behind every action in CareFlow.
 * We ship 6 friendly defaults that map onto the existing
 * care_profile pillars; users can also add custom anchors.
 */
export type AnchorKey = string;

export interface AnchorMeta {
  key: AnchorKey;
  label: string;
  blurb: string;
  icon: LucideIcon;
  /** Tailwind tint classes. */
  tint: string;
  ring: string;
  /** Source pillar in care_profile (if mapped). */
  pillar?: string;
}

export const DEFAULT_ANCHORS: AnchorMeta[] = [
  { key: "home",       label: "Home",       blurb: "Your space and rhythm",       icon: Home,     tint: "bg-amber-500/15 text-amber-600",   ring: "ring-amber-500/40",  pillar: "home"   },
  { key: "family",     label: "Family",     blurb: "People who count on you",     icon: Users,    tint: "bg-rose-500/15 text-rose-600",     ring: "ring-rose-500/40",   pillar: "care"   },
  { key: "wellness",   label: "Wellness",   blurb: "Body, mood, energy",          icon: Leaf,     tint: "bg-emerald-500/15 text-emerald-600", ring: "ring-emerald-500/40", pillar: "health" },
  { key: "finances",   label: "Finances",   blurb: "Bills, savings, peace",       icon: Wallet,   tint: "bg-lime-600/15 text-lime-700",     ring: "ring-lime-500/40",   pillar: "wealth" },
  { key: "growth",     label: "Growth",     blurb: "Learning and becoming",       icon: Sparkles, tint: "bg-sky-500/15 text-sky-600",       ring: "ring-sky-500/40",    pillar: "mind"   },
  { key: "reflection", label: "Reflection", blurb: "Pause, journal, integrate",   icon: Moon,     tint: "bg-violet-500/15 text-violet-600", ring: "ring-violet-500/40", pillar: "heart"  },
];

export const ANCHOR_BY_KEY: Record<string, AnchorMeta> = Object.fromEntries(
  DEFAULT_ANCHORS.map((a) => [a.key, a]),
);

export function getAnchor(key?: string | null): AnchorMeta | undefined {
  if (!key) return undefined;
  return ANCHOR_BY_KEY[key];
}

export interface CustomAnchor {
  id: string;
  key: string;
  label: string;
  icon?: string | null;
  color?: string | null;
  pillar?: string | null;
  sort_order: number;
}

/** Loads default + custom anchors for the current user. */
export function useAnchors() {
  const [custom, setCustom] = useState<CustomAnchor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("anchors")
        .select("id,key,label,icon,color,pillar,sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });
      if (cancel) return;
      setCustom((data as CustomAnchor[]) ?? []);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);

  return { defaults: DEFAULT_ANCHORS, custom, loading };
}
