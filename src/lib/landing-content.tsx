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
  { key: "nav.cta", label: "Top bar button", section: "hero", value: "Join the Waitlist" },
  { key: "hero.eyebrow", label: "Eyebrow", section: "hero", value: "Plan ✦ Grow ✦ Care ✦ Let Go" },
  { key: "hero.title", label: "Headline", section: "hero", value: "Life is more than a to-do list." },
  { key: "hero.sub", label: "Subheadline", section: "hero", value: "Find your rhythm. Make space for what matters." },
  { key: "hero.body", label: "Intro paragraph", section: "hero", multiline: true, value: "Meet CareFlow — an intentional life planner designed to bring your plans, routines, goals, and everyday responsibilities into one peaceful space." },
  { key: "hero.body2", label: "Second paragraph", section: "hero", multiline: true, value: "Because a meaningful life isn't about doing more. It's about making room for what matters most." },
  { key: "hero.primary", label: "Main button", section: "hero", value: "Join the Waitlist" },
  { key: "hero.secondary", label: "Second button", section: "hero", value: "Explore CareFlow" },
  { key: "hero.note", label: "Italic note", section: "hero", value: "Less overwhelm. More intention. A life that flows." },
  { key: "hero.social", label: "Social proof", section: "hero", value: "Loved by 10,000+ caregivers" },
  { key: "hero.socialSub", label: "Social proof (soft)", section: "hero", value: "and growing every day." },
  { key: "hero.badge1", label: "Badge line 1", section: "hero", value: "Designed for caregivers." },
  { key: "hero.badge2", label: "Badge line 2", section: "hero", value: "Built for real life." },
  { key: "hero.moonTitle", label: "Moon card title", section: "hero", value: "Moon in Taurus Today" },
  { key: "hero.moonBody", label: "Moon card text", section: "hero", multiline: true, value: "A beautiful day for slowing down, grounding, and enjoying the little comforts." },
  { key: "hero.moonLink", label: "Moon card link", section: "hero", value: "View Moon Guide" },
  { key: "problem.title", label: "Headline", section: "problem", multiline: true, value: "You weren't meant to carry it all in your head." },
  { key: "problem.body1", label: "Paragraph 1", section: "problem", multiline: true, value: "The appointments. The endless to-do lists. The meals to plan. The people who need you. The goals you keep putting off." },
  { key: "problem.body2", label: "Paragraph 2", section: "problem", multiline: true, value: "Life can feel like a hundred moving pieces, and somehow you're expected to hold them all together." },
  { key: "problem.body3", label: "Paragraph 3", section: "problem", multiline: true, value: "Most productivity tools ask you to do more, move faster, and stay on top of everything." },
  { key: "problem.turn", label: "Turning line", section: "problem", value: "CareFlow takes a different approach." },
  { key: "problem.question", label: "Big question", section: "problem", multiline: true, value: "What if planning your life felt less like managing a never-ending checklist and more like creating space to breathe?" },
  { key: "way.title", label: "Intro headline", section: "phases", multiline: true, value: "A softer way to plan. A more intentional way to live." },
  { key: "way.body", label: "Intro text", section: "phases", multiline: true, value: "Life isn't linear. Your energy shifts, your priorities evolve, and some days require more care than action. CareFlow helps you move with those changes through four meaningful phases." },
  ...([
    ["Plan", "Create clarity.", "Turn scattered thoughts into meaningful intentions. Organize your tasks, projects, schedules, and priorities without the mental clutter.", "Make space for what comes next."],
    ["Grow", "Nurture what matters.", "Make progress toward your goals, build supportive habits, and give your ideas room to become something meaningful.", "Small steps are still progress."],
    ["Care", "Honor what needs you.", "Create rhythms for your wellbeing, your home, and the people you love. Support your responsibilities without forgetting yourself.", "You deserve care, too."],
    ["Let Go", "Release what no longer serves you.", "Reflect, reset, simplify, and make peace with what doesn't need to be carried into tomorrow.", "Not everything needs to be done to be enough."],
  ] as const).flatMap(([name, lead, body, note], i) => [
    { key: `phases.${i}.name`, label: `Phase ${i + 1} name`, section: "phases" as SectionId, value: name },
    { key: `phases.${i}.lead`, label: `Phase ${i + 1} headline`, section: "phases" as SectionId, value: lead },
    { key: `phases.${i}.body`, label: `Phase ${i + 1} text`, section: "phases" as SectionId, multiline: true, value: body },
    { key: `phases.${i}.note`, label: `Phase ${i + 1} note`, section: "phases" as SectionId, value: note },
  ]),
  { key: "way.close", label: "Closing line", section: "phases", value: "Four phases. One natural rhythm. Your life, in flow." },
  { key: "features.title", label: "Headline", section: "features", multiline: true, value: "Everything in its place. Everything connected." },
  { key: "features.sub", label: "Subtext", section: "features", value: "One thoughtful home for the many pieces of your life." },
  ...([
    ["Your Daily Flow", "A peaceful dashboard that brings your priorities, routines, upcoming events, and daily intentions together."],
    ["Intentional Planning", "Organize your tasks, projects, calendars, and responsibilities around what matters today."],
    ["Goals & Growth", "Nurture your dreams, track meaningful progress, and celebrate the little wins along the way."],
    ["Home & Family Care", "Make everyday living easier with household routines, meal planning, caregiving tools, and shared responsibilities."],
    ["Wellbeing & Reflection", "Check in with yourself, track your energy, journal your thoughts, and build rhythms that support your wellbeing."],
    ["Lunar & Seasonal Living", "Reconnect with your natural rhythm through moon phases, seasonal reflections, and intentional guidance."],
  ] as const).flatMap(([t, b], i) => [
    { key: `features.${i}.title`, label: `Feature ${i + 1} title`, section: "features" as SectionId, value: t },
    { key: `features.${i}.body`, label: `Feature ${i + 1} text`, section: "features" as SectionId, multiline: true, value: b },
  ]),
  { key: "difference.title", label: "Headline", section: "difference", multiline: true, value: "Productivity shouldn't come at the cost of your peace." },
  { key: "difference.body1", label: "Paragraph 1", section: "difference", value: "Traditional planners focus on how much you accomplish." },
  { key: "difference.body2", label: "Paragraph 2", section: "difference", value: "CareFlow focuses on how intentionally you live." },
  { key: "difference.body3", label: "Paragraph 3", section: "difference", value: "It's not about filling every hour, checking every box, or creating the perfect routine." },
  { key: "difference.body4", label: "Paragraph 4", section: "difference", multiline: true, value: "It's about having a place where your plans, your people, your dreams, and your wellbeing can coexist." },
  { key: "difference.close", label: "Closing line", section: "difference", value: "Where progress and rest both have a place." },
  { key: "who.title", label: "Headline", section: "who", multiline: true, value: "Made for the beautifully full lives we lead." },
  { key: "who.item1", label: "Line 1", section: "who", value: "For the parents carrying invisible mental loads." },
  { key: "who.item2", label: "Line 2", section: "who", value: "For the caregivers balancing everyone else's needs with their own." },
  { key: "who.item3", label: "Line 3", section: "who", value: "For the dreamers with a hundred ideas and never enough time." },
  { key: "who.item4", label: "Line 4", section: "who", value: "For the overwhelmed minds craving a little simplicity." },
  { key: "who.item5", label: "Line 5", section: "who", multiline: true, value: "For anyone ready to stop merely managing life and start living it with intention." },
  { key: "who.close", label: "Closing line", section: "who", multiline: true, value: "You don't need to do it all. You need a rhythm that works for you." },
  { key: "philosophy.line1", label: "Big line 1", section: "philosophy", value: "Plan with intention." },
  { key: "philosophy.line2", label: "Big line 2", section: "philosophy", value: "Grow with purpose." },
  { key: "philosophy.line3", label: "Big line 3", section: "philosophy", value: "Care with compassion." },
  { key: "philosophy.line4", label: "Big line 4", section: "philosophy", value: "Let go with grace." },
  { key: "philosophy.body1", label: "Small line 1", section: "philosophy", value: "Some days you'll plan." },
  { key: "philosophy.body2", label: "Small line 2", section: "philosophy", value: "Some days you'll make progress." },
  { key: "philosophy.body3", label: "Small line 3", section: "philosophy", multiline: true, value: "Some days you'll need to slow down and care for what's in front of you." },
  { key: "philosophy.body4", label: "Small line 4", section: "philosophy", multiline: true, value: "And some days, the most meaningful thing you can do is let something go." },
  { key: "philosophy.body5", label: "Small line 5", section: "philosophy", value: "Every phase belongs." },
  { key: "philosophy.body6", label: "Small line 6", section: "philosophy", value: "Every season matters." },
  { key: "philosophy.close", label: "Closing line", section: "philosophy", value: "And you are allowed to move at your own pace." },
  { key: "community.eyebrow", label: "Eyebrow", section: "community", value: "Join a community that gets it" },
  { key: "community.title", label: "Headline", section: "community", value: "You're not alone in this." },
  { key: "community.body", label: "Text", section: "community", multiline: true, value: "CareFlow is more than an app — it's a community of caregivers supporting caregivers." },
  { key: "final.title", label: "Headline", section: "finalCta", multiline: true, value: "Make space for the life you want to live." },
  { key: "final.sub", label: "Subheadline", section: "finalCta", value: "A calmer mind. A more intentional day. A little less to carry." },
  { key: "final.body", label: "Text", section: "finalCta", multiline: true, value: "CareFlow helps you create the space to plan, grow, care, and let go — one day at a time." },
  { key: "final.primary", label: "Main button", section: "finalCta", value: "Join the Waitlist" },
  { key: "final.secondary", label: "Second button", section: "finalCta", value: "Discover the Four Phases" },
  { key: "final.note", label: "Italic note", section: "finalCta", value: "Your life doesn't need to be perfect to find its flow." },
  { key: "footer.line", label: "Footer line", section: "finalCta", value: "A more intentional way to plan your life." },
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
    // Safety net: never leave the page stuck on "Loading…" if a request stalls.
    const timer = setTimeout(() => { if (alive) setLoading(false); }, 8000);
    (async () => {
      try {
        const { data } = await supabase.from("landing_content").select("content").eq("key", ROW_KEY).maybeSingle();
        if (alive) setDoc(mergeDoc(data?.content as Partial<LandingDoc>));
      } catch { /* fall back to defaults */ }
      if (alive) { setLoading(false); clearTimeout(timer); }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data: admin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
        if (alive) setIsAdmin(Boolean(admin));
      } catch { /* not admin */ }
    })();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  const save = useCallback(async (next: LandingDoc) => {
    const prev = doc;
    setDoc(next);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("landing_content")
      .upsert({ key: ROW_KEY, content: next as any, updated_by: session?.user?.id ?? null });
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
