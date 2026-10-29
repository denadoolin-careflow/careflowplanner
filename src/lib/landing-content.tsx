import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_COLORS, type LandingColors } from "@/lib/landing-colors";

export type Testimonial = { quote: string; name: string; avatar: string };
export type SectionId = "hero" | "problem" | "phases" | "features" | "difference" | "who" | "philosophy" | "community" | "finalCta";

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "hero", label: "Top welcome" },
  { id: "problem", label: "The problem" },
  { id: "phases", label: "The four phases" },
  { id: "features", label: "Features" },
  { id: "difference", label: "The difference" },
  { id: "who", label: "Who it's for" },
  { id: "philosophy", label: "Philosophy lines" },
  { id: "community", label: "Testimonials" },
  { id: "finalCta", label: "Closing call to action" },
];

export type LandingDoc = {
  text: Record<string, string>;
  sections: Record<SectionId, boolean>;
  testimonials: Testimonial[];
  colors: LandingColors;
};

/** Editable copy with labels (shown in the dashboard) and defaults (current live copy). */
export const TEXT_FIELDS: { key: string; label: string; section: SectionId; multiline?: boolean; value: string }[] = [
  { key: "hero.eyebrow", label: "Eyebrow", section: "hero", value: "Plan ✦ Grow ✦ Care ✦ Let go" },
  { key: "hero.titleStart", label: "Headline (start)", section: "hero", value: "The all-in-one planner for the" },
  { key: "hero.titleHighlight", label: "Headline (highlight)", section: "hero", value: "beautiful chaos" },
  { key: "hero.titleEnd", label: "Headline (end)", section: "hero", value: "of family life." },
  { key: "hero.body", label: "Intro paragraph", section: "hero", multiline: true, value: "CareFlow Planner helps you simplify your days, care for what matters most, and make space for yourself — mentally, physically, and emotionally." },
  { key: "hero.ios", label: "iOS button", section: "hero", value: "Download for iOS" },
  { key: "hero.android", label: "Android button", section: "hero", value: "Download for Android" },
  { key: "hero.quiz", label: "Quiz button", section: "hero", value: "Take the Quiz" },
  { key: "hero.social", label: "Social proof", section: "hero", value: "Loved by 10,000+ caregivers" },
  { key: "hero.socialSub", label: "Social proof (soft)", section: "hero", value: "and growing every day." },
  { key: "hero.badge1", label: "Badge line 1", section: "hero", value: "Designed for caregivers." },
  { key: "hero.badge2", label: "Badge line 2", section: "hero", value: "Built for real life." },
  { key: "hero.moonTitle", label: "Moon card title", section: "hero", value: "Moon in Taurus Today" },
  { key: "hero.moonBody", label: "Moon card text", section: "hero", multiline: true, value: "A beautiful day for slowing down, grounding, and enjoying the little comforts." },
  { key: "hero.moonLink", label: "Moon card link", section: "hero", value: "View Moon Guide" },
  ...([
    ["Plan Your Days", "Organize tasks, routines, appointments and family schedules."],
    ["Care for What Matters", "Track health, medications, therapies, and important care needs."],
    ["Nourish Your Family", "Plan meals, manage groceries, recipes and pantry inventory."],
    ["Align with Nature", "Lunar guidance, astrology insights and cycle awareness."],
    ["Manage Your Money", "Budget, track expenses and plan for your family's future."],
  ] as const).flatMap(([t, b], i) => [
    { key: `features.${i}.title`, label: `Feature ${i + 1} title`, section: "features" as SectionId, value: t },
    { key: `features.${i}.body`, label: `Feature ${i + 1} text`, section: "features" as SectionId, multiline: true, value: b },
  ]),
  { key: "quiz.cardEyebrow", label: "Quiz card eyebrow", section: "quiz", value: "Caregiver Archetype Quiz" },
  { key: "quiz.cardTitle", label: "Quiz card title", section: "quiz", value: "Which kind of caregiver are you?" },
  { key: "quiz.cardBody", label: "Quiz card text", section: "quiz", multiline: true, value: "A 90-second quiz to shape your planner around the way you actually give." },
  { key: "quiz.cardCta", label: "Quiz card button", section: "quiz", value: "Take the Quiz" },
  { key: "quiz.eyebrow", label: "Middle eyebrow", section: "quiz", value: "Discover Your Caregiver Archetype" },
  { key: "quiz.title", label: "Middle headline", section: "quiz", value: "Understand your natural care style." },
  { key: "quiz.body", label: "Middle text", section: "quiz", multiline: true, value: "Our quick quiz reveals your Caregiver Archetype and creates a personalized planning rhythm that honors your energy, values, and real life." },
  { key: "archetypes.title", label: "Headline", section: "archetypes", value: "Which kind of caregiver are you?" },
  { key: "archetypes.body", label: "Subtext", section: "archetypes", multiline: true, value: "A 90-second quiz to shape your planner around the way you actually give." },
  { key: "community.eyebrow", label: "Eyebrow", section: "community", value: "Join a community that gets it" },
  { key: "community.title", label: "Headline", section: "community", value: "You're not alone in this." },
  { key: "community.body", label: "Text", section: "community", multiline: true, value: "CareFlow is more than an app — it's a community of caregivers supporting caregivers." },
  { key: "final.title", label: "Headline", section: "finalCta", value: "Your calm. Your rhythm. Your flow." },
  { key: "final.body", label: "Text", section: "finalCta", value: "Start your journey with CareFlow Planner today." },
  { key: "final.tagline", label: "Tagline", section: "finalCta", multiline: true, value: "Plan with intention. Care with love. Grow together." },
];

export const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { quote: "CareFlow has helped me go from overwhelmed to organized. I finally feel like I have a system that works for my family.", name: "Sarah M.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80" },
  { quote: "The lunar guidance and journal prompts are my favorite part. It keeps me grounded and reminds me to care for myself too.", name: "Melissa T.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&q=80" },
  { quote: "I love having everything in one place — appointments, meals, meds, tasks, and even budgeting. It's beautiful and functional!", name: "Jasmine R.", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&q=80" },
];

export const DEFAULT_DOC: LandingDoc = {
  text: Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, f.value])),
  sections: Object.fromEntries(SECTIONS.map((s) => [s.id, true])) as Record<SectionId, boolean>,
  testimonials: DEFAULT_TESTIMONIALS,
  colors: DEFAULT_COLORS,
};

/** Merges saved content over defaults so new fields always have copy. */
export function mergeDoc(saved: Partial<LandingDoc> | null | undefined): LandingDoc {
  return {
    text: { ...DEFAULT_DOC.text, ...(saved?.text ?? {}) },
    sections: { ...DEFAULT_DOC.sections, ...(saved?.sections ?? {}) },
    testimonials: Array.isArray(saved?.testimonials) ? saved!.testimonials! : DEFAULT_DOC.testimonials,
    colors: { preset: saved?.colors?.preset ?? DEFAULT_COLORS.preset, custom: { ...(saved?.colors?.custom ?? {}) } },
  };
}

const ROW_KEY = "main";

type Ctx = {
  doc: LandingDoc;
  loading: boolean;
  isAdmin: boolean;
  editing: boolean;
  setEditing: (v: boolean) => void;
  t: (key: string) => string;
  save: (next: LandingDoc) => Promise<boolean>;
  setText: (key: string, value: string) => Promise<boolean>;
};

const LandingCtx = createContext<Ctx | null>(null);

export function LandingContentProvider({ children, initialEditing = false }: { children: ReactNode; initialEditing?: boolean }) {
  const [doc, setDoc] = useState<LandingDoc>(DEFAULT_DOC);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(initialEditing);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("landing_content").select("content").eq("key", ROW_KEY).maybeSingle();
      if (alive) { setDoc(mergeDoc(data?.content as Partial<LandingDoc>)); setLoading(false); }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: admin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (alive) setIsAdmin(Boolean(admin));
    })();
    return () => { alive = false; };
  }, []);

  const save = useCallback(async (next: LandingDoc) => {
    const prev = doc;
    setDoc(next);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("landing_content")
      .upsert({ key: ROW_KEY, content: next as any, updated_by: user?.id ?? null });
    if (error) { setDoc(prev); toast.error("Couldn't save — admin access needed"); return false; }
    return true;
  }, [doc]);

  const setText = useCallback((key: string, value: string) => save({ ...doc, text: { ...doc.text, [key]: value } }), [doc, save]);

  const value = useMemo<Ctx>(() => ({
    doc, loading, isAdmin, editing: editing && isAdmin, setEditing,
    t: (k) => doc.text[k] ?? "", save, setText,
  }), [doc, loading, isAdmin, editing, save, setText]);

  return <LandingCtx.Provider value={value}>{children}</LandingCtx.Provider>;
}

export function useLandingContent() {
  const c = useContext(LandingCtx);
  if (!c) throw new Error("useLandingContent must be inside LandingContentProvider");
  return c;
}
