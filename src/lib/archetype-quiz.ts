import type { AtmosphereId } from "./atmospheres";

/** Caregiver Archetype Quiz: data, types, scoring, persistence. */

export type ArchetypeId =
  | "mental-load-carrier"
  | "burnt-out-caregiver"
  | "reset-seeker"
  | "neurodivergent-navigator"
  | "gentle-homemaker"
  | "moon-guided-planner"
  | "rebuilding-dreamer"
  | "quiet-provider"
  | "burnt-out-protector"
  | "rebuilding-father"
  | "neurodivergent-dad"
  | "emotional-anchor"
  | "overextended-helper"
  | "soft-systems-thinker"
  | "cyclical-planner";

export type Identity =
  | "mom" | "dad" | "caregiver" | "neurodivergent" | "partner"
  | "homemaker" | "creative" | "nonbinary" | "multi-role" | "private";

export const IDENTITIES: { id: Identity; label: string; emoji: string }[] = [
  { id: "mom", label: "Mom", emoji: "🌸" },
  { id: "dad", label: "Dad", emoji: "🌲" },
  { id: "caregiver", label: "Caregiver", emoji: "💗" },
  { id: "neurodivergent", label: "Neurodivergent", emoji: "🧠" },
  { id: "partner", label: "Partner", emoji: "🤍" },
  { id: "homemaker", label: "Homemaker", emoji: "🏡" },
  { id: "creative", label: "Creative", emoji: "✨" },
  { id: "nonbinary", label: "Nonbinary", emoji: "🌈" },
  { id: "multi-role", label: "Multi-role caregiver", emoji: "🌿" },
  { id: "private", label: "Prefer not to say", emoji: "🕊️" },
];

export type PlanningStyle =
  | "soft-structured-prioritization"
  | "minimum-viable-day"
  | "rhythm-based-resets"
  | "visual-flexible-planning"
  | "rhythmic-homemaking"
  | "energy-aware-planning"
  | "gentle-growth-planning";

export const PLANNING_STYLE_LABEL: Record<PlanningStyle, string> = {
  "soft-structured-prioritization": "Soft structured prioritization",
  "minimum-viable-day": "Minimum viable day",
  "rhythm-based-resets": "Rhythm-based resets",
  "visual-flexible-planning": "Visual flexible planning",
  "rhythmic-homemaking": "Rhythmic homemaking",
  "energy-aware-planning": "Energy-aware planning",
  "gentle-growth-planning": "Gentle growth planning",
};

export type Archetype = {
  id: ArchetypeId;
  title: string;
  quote: string;
  description: string;
  insight: string;
  struggles: string[];
  planningStyle: PlanningStyle;
  atmosphere: AtmosphereId;
  dashboard: string[];
  routines: string[];
  affirmation: string;
  ctaLabel: string;
  /** soft mood gradient pair (hsl) for the result hero */
  hue: [string, string];
};

export const ARCHETYPES: Archetype[] = [
  {
    id: "mental-load-carrier",
    title: "The Mental Load Carrier",
    quote: "If I don't remember it, nobody will.",
    description:
      "You carry invisible responsibilities for everyone around you and rarely get to fully rest mentally.",
    insight:
      "Your nervous system is in constant scan-mode. You don't need more discipline — you need a place to put it all down.",
    struggles: ["remembering everything", "emotional labor", "decision fatigue", "household management"],
    planningStyle: "soft-structured-prioritization",
    atmosphere: "sage-sanctuary",
    dashboard: ["Today view", "Brain dump", "Family hub", "Weekly reset"],
    routines: ["Morning brain dump", "Evening download", "Sunday soft reset"],
    affirmation: "You do not have to carry everything at once.",
    ctaLabel: "Set up my soft sanctuary",
    hue: ["152 28% 76%", "42 38% 80%"],
  },
  {
    id: "burnt-out-caregiver",
    title: "The Burnt-Out Caregiver",
    quote: "I'm functioning… but barely.",
    description:
      "You've been surviving for so long your nervous system barely remembers what rest feels like.",
    insight:
      "You don't need a bigger plan. You need permission to do less, and a system that protects what little energy you have.",
    struggles: ["exhaustion", "overstimulation", "burnout", "emotional depletion"],
    planningStyle: "minimum-viable-day",
    atmosphere: "moonlit-plum",
    dashboard: ["Low-energy mode", "Tiny tasks", "Recovery routines", "Exhale journal"],
    routines: ["3-thing day", "Evening exhale", "Sensory cooldown"],
    affirmation: "Rest is productive too.",
    ctaLabel: "Begin my recovery rhythm",
    hue: ["280 22% 60%", "260 24% 72%"],
  },
  {
    id: "reset-seeker",
    title: "The Reset Seeker",
    quote: "I just want life to feel manageable again.",
    description:
      "You crave a fresh start, gentle routines, and systems that help life feel lighter again.",
    insight:
      "You bloom with rituals of return. Small resets, kindly repeated, are your superpower.",
    struggles: ["inconsistency", "clutter overwhelm", "restarting routines", "losing momentum"],
    planningStyle: "rhythm-based-resets",
    atmosphere: "blossom",
    dashboard: ["Home reset", "Weekly reset", "Habit tracker", "Cleaning zones"],
    routines: ["10-minute tidy", "Sunday reset", "Seasonal refresh"],
    affirmation: "One small reset counts.",
    ctaLabel: "Begin a gentle reset",
    hue: ["340 60% 80%", "20 60% 86%"],
  },
  {
    id: "neurodivergent-navigator",
    title: "The Neurodivergent Navigator",
    quote: "My brain needs flexibility, not pressure.",
    description:
      "Your brain works beautifully differently, and traditional productivity systems often create shame instead of support.",
    insight:
      "You aren't behind. You're wired for nonlinear brilliance — your tools just need to bend with you.",
    struggles: ["executive dysfunction", "sensory overwhelm", "task paralysis", "nonlinear energy"],
    planningStyle: "visual-flexible-planning",
    atmosphere: "coastal-calm",
    dashboard: ["Visual routines", "Drag-and-drop planning", "Gentle reminders", "Focus timer"],
    routines: ["Visual day plan", "Body-doubling timer", "Sensory-safe wind down"],
    affirmation: "You are not failing. Your brain needs a softer system.",
    ctaLabel: "Build my visual system",
    hue: ["190 40% 72%", "160 30% 80%"],
  },
  {
    id: "gentle-homemaker",
    title: "The Gentle Homemaker",
    quote: "Home is how I care for people.",
    description:
      "You find peace in nurturing spaces, meaningful routines, and caring for the emotional atmosphere of home.",
    insight:
      "Tending a home is real work. Your rhythms deserve as much care as the people they hold.",
    struggles: ["overextending yourself", "perfectionism", "never feeling 'done'"],
    planningStyle: "rhythmic-homemaking",
    atmosphere: "dawn",
    dashboard: ["Meal planning", "Home hub", "Seasonal resets", "Routine cards"],
    routines: ["Morning hearth", "Meal rhythm", "Seasonal home reset"],
    affirmation: "A cared-for home includes you too.",
    ctaLabel: "Set my hearth rhythm",
    hue: ["32 70% 80%", "18 60% 78%"],
  },
  {
    id: "moon-guided-planner",
    title: "The Moon-Guided Planner",
    quote: "I plan with energy, not just time.",
    description:
      "You naturally notice emotional cycles, energy shifts, and rhythms tied to rest, reflection, and intuition.",
    insight:
      "Your power lives in cycles. Honoring your phases is not avoidance — it's strategy.",
    struggles: ["forcing productivity", "emotional fluctuations", "burnout from pushing too hard"],
    planningStyle: "energy-aware-planning",
    atmosphere: "moonlit-plum",
    dashboard: ["Moon phase widgets", "Energy tracking", "Journal prompts", "Reflective planning"],
    routines: ["New moon intention", "Full moon release", "Daily energy check-in"],
    affirmation: "You are allowed to move in cycles.",
    ctaLabel: "Tune my cycle rhythm",
    hue: ["270 32% 60%", "320 30% 72%"],
  },
  {
    id: "rebuilding-dreamer",
    title: "The Rebuilding Dreamer",
    quote: "I care for everyone… but I still have dreams too.",
    description:
      "You're rebuilding identity, routines, creativity or life after burnout, grief, motherhood, caregiving, or survival mode.",
    insight:
      "Begin again, gently. Tiny steps in the direction of your real self count as growth.",
    struggles: ["motivation", "identity loss", "fear of starting again", "inconsistency"],
    planningStyle: "gentle-growth-planning",
    atmosphere: "sage-sanctuary",
    dashboard: ["Creative projects", "Vision board", "Tiny goals", "Encouragement prompts"],
    routines: ["Morning page", "Weekly tiny win", "Identity check-in"],
    affirmation: "You are allowed to begin again slowly.",
    ctaLabel: "Begin again, gently",
    hue: ["140 28% 68%", "60 40% 80%"],
  },
  {
    id: "quiet-provider",
    title: "The Quiet Provider",
    quote: "I carry the weight quietly.",
    description:
      "You're dependable, protective, and emotionally reserved — carrying pressure internally so others don't have to.",
    insight:
      "Steadiness is a gift, but you deserve a place to set it down. Letting support in is also strength.",
    struggles: ["carrying pressure internally", "emotional decompression", "financial weight"],
    planningStyle: "soft-structured-prioritization",
    atmosphere: "dark-sage-glass",
    dashboard: ["Today view", "Priority focus", "Wealth hub", "Quiet journal"],
    routines: ["Morning priorities", "Evening decompress", "Weekly review"],
    affirmation: "Strong does not mean alone.",
    ctaLabel: "Set my steady base",
    hue: ["150 18% 35%", "42 28% 60%"],
  },
  {
    id: "burnt-out-protector",
    title: "The Burnt-Out Protector",
    quote: "I'm exhausted, but I still show up.",
    description:
      "You're emotionally drained and overstretched, feeling pressure to remain strong while rarely resting fully.",
    insight:
      "Protecting everyone has cost you. Recovery isn't weakness — it's how you stay in this for the long run.",
    struggles: ["emotional drainage", "pressure to be strong", "no real rest"],
    planningStyle: "minimum-viable-day",
    atmosphere: "mist",
    dashboard: ["Low-energy mode", "Minimum viable day", "Recovery routines", "Quiet journal"],
    routines: ["3-thing day", "Body scan", "Evening shut-down"],
    affirmation: "You're allowed to put the armor down.",
    ctaLabel: "Begin my recovery",
    hue: ["210 14% 55%", "150 18% 60%"],
  },
  {
    id: "rebuilding-father",
    title: "The Rebuilding Father",
    quote: "I'm trying to become someone healthier.",
    description:
      "Growth-oriented and rebuilding identity — healing from burnout or survival mode while wanting stability and purpose.",
    insight:
      "You're allowed to want more for yourself and still be a good provider. Both can be true.",
    struggles: ["rebuilding identity", "burnout recovery", "hopeful but overwhelmed"],
    planningStyle: "gentle-growth-planning",
    atmosphere: "golden-hearth",
    dashboard: ["Tiny goals", "Habit tracker", "Routines", "Encouragement prompts"],
    routines: ["Morning movement", "One step forward", "Sunday reflection"],
    affirmation: "Sustainable growth is the real flex.",
    ctaLabel: "Build my steady momentum",
    hue: ["32 60% 60%", "20 50% 50%"],
  },
  {
    id: "neurodivergent-dad",
    title: "The Neurodivergent Dad",
    quote: "My brain works differently.",
    description:
      "Analytical, hyperfocused, and easily overwhelmed by clutter or transitions — you need a system that flexes.",
    insight:
      "Your brain isn't a bug. The right scaffolding turns your wiring into your edge.",
    struggles: ["transitions", "visual clutter", "executive function"],
    planningStyle: "visual-flexible-planning",
    atmosphere: "dark-sage-glass",
    dashboard: ["Visual routines", "Kanban board", "Focus timer", "Brain dump"],
    routines: ["Visual day plan", "Focus blocks", "Transition cues"],
    affirmation: "Your brain deserves a softer system.",
    ctaLabel: "Build my visual system",
    hue: ["155 22% 40%", "200 22% 50%"],
  },
  {
    id: "emotional-anchor",
    title: "The Emotional Anchor",
    quote: "People come to me to feel safe.",
    description:
      "You hold steady ground for the people around you — quietly absorbing emotion and keeping everyone afloat.",
    insight:
      "Anchors need anchors too. Naming what you carry is the first act of release.",
    struggles: ["absorbing others' emotions", "guilt around rest", "feeling invisible"],
    planningStyle: "soft-structured-prioritization",
    atmosphere: "sage-sanctuary",
    dashboard: ["Today view", "Journal", "Care loop", "Brain dump"],
    routines: ["Morning grounding", "Emotional check-in", "Evening release"],
    affirmation: "Holding others does not mean abandoning yourself.",
    ctaLabel: "Anchor my own rhythm",
    hue: ["152 22% 62%", "200 24% 74%"],
  },
  {
    id: "overextended-helper",
    title: "The Overextended Helper",
    quote: "I'll get to me… eventually.",
    description:
      "You give first and rest last. Saying yes feels safer than risking someone else's disappointment.",
    insight:
      "Boundaries aren't walls — they're the shape that lets you keep helping for the long run.",
    struggles: ["over-giving", "boundary fatigue", "self-care guilt"],
    planningStyle: "minimum-viable-day",
    atmosphere: "soft-linen",
    dashboard: ["Low-energy mode", "Minimum viable day", "Self-care routines", "Journal"],
    routines: ["Boundary check-in", "Daily 'me' window", "Evening exhale"],
    affirmation: "You are allowed to choose yourself today.",
    ctaLabel: "Make space for me too",
    hue: ["35 50% 84%", "20 40% 80%"],
  },
  {
    id: "soft-systems-thinker",
    title: "The Soft Systems Thinker",
    quote: "I want structure that breathes.",
    description:
      "You love systems — but only ones that flex with your real life. Rigidity makes you bristle; softness makes you bloom.",
    insight:
      "You don't need stricter rules. You need beautiful scaffolds you'd actually want to live inside.",
    struggles: ["over-designing systems", "starting over", "rigidity fatigue"],
    planningStyle: "visual-flexible-planning",
    atmosphere: "coastal-calm",
    dashboard: ["Custom dashboard", "Visual routines", "Kanban board", "Habit tracker"],
    routines: ["Weekly review", "Tuesday tune-up", "Friday wind-down"],
    affirmation: "Your structure is allowed to be soft.",
    ctaLabel: "Design my soft system",
    hue: ["190 36% 70%", "210 28% 80%"],
  },
  {
    id: "cyclical-planner",
    title: "The Cyclical Planner",
    quote: "My energy moves in seasons.",
    description:
      "You plan with rhythm, not rigidity — honoring rest phases, creative phases, and seasons of doing.",
    insight:
      "Linear plans were never made for you. Your magic is in working *with* the wave.",
    struggles: ["pushing through cycles", "calendar guilt", "fluctuating capacity"],
    planningStyle: "energy-aware-planning",
    atmosphere: "moonlit-plum",
    dashboard: ["Moon phase widgets", "Energy tracking", "Rhythm forecast", "Journal prompts"],
    routines: ["Cycle check-in", "Phase planning", "Rest rituals"],
    affirmation: "Your cycles are not interruptions. They are the plan.",
    ctaLabel: "Plan with my cycle",
    hue: ["270 30% 62%", "300 26% 74%"],
  },
];

export function getArchetype(id: ArchetypeId | string | null | undefined): Archetype {
  return ARCHETYPES.find(a => a.id === id) ?? ARCHETYPES[0];
}

// ────────────── Quiz Questions ──────────────

export type QuestionOption = {
  label: string;
  /** archetype score weights */
  weights: Partial<Record<ArchetypeId, number>>;
  /** optional atmosphere bias */
  atmosphere?: AtmosphereId;
};

export type Question = {
  id: string;
  prompt: string;
  helper?: string;
  options: QuestionOption[];
};

/** Weight aliases to keep options short. */
const w = {
  mental: (n = 2) => ({ "mental-load-carrier": n, "emotional-anchor": n - 1, "overextended-helper": n - 1 } as Partial<Record<ArchetypeId, number>>),
  burnt: (n = 2) => ({ "burnt-out-caregiver": n, "burnt-out-protector": n, "overextended-helper": n - 1 } as Partial<Record<ArchetypeId, number>>),
  reset: (n = 2) => ({ "reset-seeker": n, "gentle-homemaker": n - 1 } as Partial<Record<ArchetypeId, number>>),
  nd: (n = 2) => ({ "neurodivergent-navigator": n, "neurodivergent-dad": n - 1, "soft-systems-thinker": n - 1 } as Partial<Record<ArchetypeId, number>>),
  home: (n = 2) => ({ "gentle-homemaker": n, "reset-seeker": n - 1 } as Partial<Record<ArchetypeId, number>>),
  moon: (n = 2) => ({ "moon-guided-planner": n, "cyclical-planner": n, "rebuilding-dreamer": n - 1 } as Partial<Record<ArchetypeId, number>>),
  rebuild: (n = 2) => ({ "rebuilding-dreamer": n, "rebuilding-father": n } as Partial<Record<ArchetypeId, number>>),
  quiet: (n = 2) => ({ "quiet-provider": n, "emotional-anchor": n - 1 } as Partial<Record<ArchetypeId, number>>),
  soft: (n = 2) => ({ "soft-systems-thinker": n, "neurodivergent-navigator": n - 1 } as Partial<Record<ArchetypeId, number>>),
};

function merge(...parts: Partial<Record<ArchetypeId, number>>[]): Partial<Record<ArchetypeId, number>> {
  const out: Partial<Record<ArchetypeId, number>> = {};
  for (const p of parts) for (const [k, v] of Object.entries(p)) out[k as ArchetypeId] = (out[k as ArchetypeId] ?? 0) + (v ?? 0);
  return out;
}

export const QUESTIONS: Question[] = [
  {
    id: "day-feel",
    prompt: "How does your day usually feel?",
    helper: "There's no wrong answer — just notice what's true today.",
    options: [
      { label: "Constantly overloaded", weights: w.mental() },
      { label: "Chaotic but hopeful", weights: merge(w.rebuild(), w.reset(1)) },
      { label: "Structured but exhausting", weights: w.quiet() },
      { label: "Emotionally heavy", weights: merge(w.burnt(), w.mental(1)) },
      { label: "Drifting without routine", weights: merge(w.reset(), w.rebuild(1)) },
      { label: "Full of ideas but hard to organize", weights: merge(w.nd(), w.soft(1)) },
      { label: "Deeply caring but depleted", weights: merge(w.burnt(), { "emotional-anchor": 1 }) },
      { label: "Cyclical and energy-sensitive", weights: w.moon() },
    ],
  },
  {
    id: "struggle",
    prompt: "What do you struggle with most?",
    options: [
      { label: "Remembering everything", weights: w.mental() },
      { label: "Starting tasks", weights: w.nd() },
      { label: "Finishing tasks", weights: merge(w.nd(1), w.rebuild(1)) },
      { label: "Emotional burnout", weights: w.burnt() },
      { label: "Decision fatigue", weights: w.mental() },
      { label: "Cleaning overwhelm", weights: w.reset() },
      { label: "Meal planning", weights: w.home() },
      { label: "Time management", weights: w.soft() },
      { label: "Self-care guilt", weights: { "overextended-helper": 2, "burnt-out-caregiver": 1, "emotional-anchor": 1 } },
      { label: "Sensory overwhelm", weights: w.nd() },
      { label: "Feeling isolated", weights: { "quiet-provider": 2, "emotional-anchor": 1 } },
    ],
  },
  {
    id: "support",
    prompt: "What kind of support sounds best?",
    options: [
      { label: "Gentle reminders", weights: merge(w.mental(1), w.nd(1)) },
      { label: "Calm routines", weights: merge(w.home(), w.reset(1)) },
      { label: "Flexible planning", weights: merge(w.nd(), w.soft(1)) },
      { label: "Emotional support", weights: merge(w.burnt(1), { "emotional-anchor": 2 }) },
      { label: "Visual structure", weights: merge(w.nd(), w.soft(1)) },
      { label: "Motivation boosts", weights: w.rebuild() },
      { label: "Rest encouragement", weights: w.burnt() },
      { label: "Energy-aware planning", weights: w.moon() },
      { label: "Minimalist systems", weights: { "soft-systems-thinker": 2, "quiet-provider": 1 } },
    ],
  },
  {
    id: "aesthetic",
    prompt: "What aesthetic feels safest?",
    helper: "We'll set this as your starting atmosphere — change it any time.",
    options: [
      { label: "Sage sanctuary", weights: w.mental(1), atmosphere: "sage-sanctuary" },
      { label: "Moonlit plum", weights: w.moon(1), atmosphere: "moonlit-plum" },
      { label: "Soft blossom", weights: w.reset(1), atmosphere: "blossom" },
      { label: "Forest grounding", weights: w.quiet(1), atmosphere: "dark-sage-glass" },
      { label: "Cozy dawn", weights: w.home(1), atmosphere: "dawn" },
      { label: "Ocean calm", weights: w.nd(1), atmosphere: "coastal-calm" },
      { label: "Minimal cream", weights: { "soft-systems-thinker": 2, "overextended-helper": 1 }, atmosphere: "soft-linen" },
      { label: "Dark sage glass", weights: { "quiet-provider": 2, "neurodivergent-dad": 1 }, atmosphere: "dark-sage-glass" },
      { label: "Golden warmth", weights: w.home(1), atmosphere: "golden-hearth" },
    ],
  },
  {
    id: "overwhelm",
    prompt: "How do you react when overwhelmed?",
    options: [
      { label: "Freeze", weights: w.nd() },
      { label: "Overwork", weights: merge(w.quiet(), w.mental(1)) },
      { label: "Shut down", weights: w.burnt() },
      { label: "Avoid tasks", weights: merge(w.nd(1), w.rebuild(1)) },
      { label: "Hyperfocus", weights: w.nd() },
      { label: "Emotionally spiral", weights: { "emotional-anchor": 2, "burnt-out-caregiver": 1 } },
      { label: "Help everyone else first", weights: { "overextended-helper": 2, "emotional-anchor": 1 } },
      { label: "Rest and retreat", weights: w.moon() },
    ],
  },
];

export type QuizAnswers = Record<string, number>; // questionId -> option index

export function scoreQuiz(answers: QuizAnswers): {
  archetype: Archetype;
  ranking: { archetype: Archetype; score: number }[];
  atmosphereVote: AtmosphereId | null;
} {
  const totals = new Map<ArchetypeId, number>();
  let atmosphereVote: AtmosphereId | null = null;
  for (const q of QUESTIONS) {
    const idx = answers[q.id];
    if (idx == null) continue;
    const opt = q.options[idx];
    if (!opt) continue;
    if (opt.atmosphere) atmosphereVote = opt.atmosphere;
    for (const [k, v] of Object.entries(opt.weights)) {
      totals.set(k as ArchetypeId, (totals.get(k as ArchetypeId) ?? 0) + (v ?? 0));
    }
  }
  const ranking = ARCHETYPES
    .map(a => ({ archetype: a, score: totals.get(a.id) ?? 0 }))
    .sort((a, b) => b.score - a.score);
  return { archetype: ranking[0]?.archetype ?? ARCHETYPES[0], ranking, atmosphereVote };
}

// ────────────── Persistence ──────────────

const K_RESULT = "careflow:quiz:result";
const K_PROGRESS = "careflow:quiz:progress";

export type QuizResult = {
  archetype: ArchetypeId;
  identity: Identity | null;
  atmosphere: AtmosphereId;
  planningStyle: PlanningStyle;
  takenAt: string;
};

export function saveQuizResult(r: QuizResult) {
  try { localStorage.setItem(K_RESULT, JSON.stringify(r)); } catch { /* */ }
}

export function loadQuizResult(): QuizResult | null {
  try {
    const raw = localStorage.getItem(K_RESULT);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearQuizResult() {
  try { localStorage.removeItem(K_RESULT); } catch { /* */ }
}

export type QuizProgress = {
  identity: Identity | null;
  answers: QuizAnswers;
  step: number;
};

export function saveQuizProgress(p: QuizProgress) {
  try { localStorage.setItem(K_PROGRESS, JSON.stringify(p)); } catch { /* */ }
}

export function loadQuizProgress(): QuizProgress | null {
  try {
    const raw = localStorage.getItem(K_PROGRESS);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearQuizProgress() {
  try { localStorage.removeItem(K_PROGRESS); } catch { /* */ }
}