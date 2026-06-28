import { useEffect, useState, useCallback } from "react";

/** Atmosphere = immersive emotional environment (color + mood + typography + ambient feel). */
export type AtmosphereId =
  | "sage-sanctuary"
  | "moonlit-plum"
  | "soft-linen"
  | "coastal-calm"
  | "golden-hearth"
  | "dark-sage-glass"
  | "dawn"
  | "mist"
  | "blossom"
  | "peony-bloom"
  | "wisteria-drift"
  | "hibiscus-coast"
  | "cherry-mist"
  | "meadow-dew"
  | "lilac-rain"
  | "harvest-ember"
  | "amber-orchard"
  | "foggy-pine"
  | "snowfall-hush"
  | "evergreen-hearth"
  | "frosted-plum";

export type AtmosphereVibe = {
  /** how strong the gradients feel */
  gradient: "whisper" | "soft" | "rich" | "cinematic";
  /** ambient glow strength */
  glow: "none" | "subtle" | "warm" | "luminous";
  /** glassmorphism on cards */
  glass: boolean;
  /** prefers dark mode */
  prefersDark: boolean;
  /** animation register */
  animation: "still" | "breath" | "drift";
};

export type Atmosphere = {
  id: AtmosphereId;
  name: string;
  tagline: string;
  mood: string[];
  bestFor: string[];
  /** 4-6 hex swatches for the preview card */
  palette: string[];
  /** Google Font family names already loaded in index.html */
  fontDisplay: string;
  fontBody: string;
  vibe: AtmosphereVibe;
};

export const ATMOSPHERES: Atmosphere[] = [
  {
    id: "sage-sanctuary",
    name: "Sage Sanctuary",
    tagline: "Grounded, nurturing, emotionally safe.",
    mood: ["grounded", "nurturing", "balanced"],
    bestFor: ["Everyday planning", "Home management", "Caregiving"],
    palette: ["#A8B29A", "#6F7C65", "#F7F3EC", "#D4A96A", "#4C3A4F", "#EDE6DA"],
    fontDisplay: "Fraunces",
    fontBody: "Inter",
    vibe: { gradient: "soft", glow: "subtle", glass: false, prefersDark: false, animation: "breath" },
  },
  {
    id: "moonlit-plum",
    name: "Moonlit Plum",
    tagline: "Reflective, cozy, a little magical.",
    mood: ["reflective", "magical", "introspective"],
    bestFor: ["Journaling", "Moon tracking", "Nighttime planning"],
    palette: ["#6C5A73", "#B7A6C2", "#F4EFEA", "#D9B16E", "#35263D"],
    fontDisplay: "Cormorant Garamond",
    fontBody: "Inter",
    vibe: { gradient: "rich", glow: "luminous", glass: true, prefersDark: true, animation: "drift" },
  },
  {
    id: "soft-linen",
    name: "Soft Linen",
    tagline: "Low stimulation. Pure quiet.",
    mood: ["minimal", "airy", "peaceful"],
    bestFor: ["Burnout days", "Focus sessions", "Neurodivergent-friendly"],
    palette: ["#DCCBB8", "#B89C84", "#FAF7F2", "#B9C4B1", "#5C5048"],
    fontDisplay: "Playfair Display",
    fontBody: "DM Sans",
    vibe: { gradient: "whisper", glow: "none", glass: false, prefersDark: false, animation: "still" },
  },
  {
    id: "coastal-calm",
    name: "Coastal Calm",
    tagline: "Restorative and spacious.",
    mood: ["restorative", "spacious", "cleansing"],
    bestFor: ["Reset days", "Routines", "Gentle productivity"],
    palette: ["#8FAFA5", "#AFC8D0", "#F5F7F4", "#D6B184", "#405B5D"],
    fontDisplay: "Fraunces",
    fontBody: "Plus Jakarta Sans",
    vibe: { gradient: "soft", glow: "subtle", glass: false, prefersDark: false, animation: "breath" },
  },
  {
    id: "golden-hearth",
    name: "Golden Hearth",
    tagline: "Warm, nurturing, homemaking.",
    mood: ["warm", "comforting", "homely"],
    bestFor: ["Meals", "Family planning", "Seasonal routines"],
    palette: ["#C89A52", "#B56E52", "#F5EBDD", "#8A9275", "#5A4636"],
    fontDisplay: "Fraunces",
    fontBody: "Inter",
    vibe: { gradient: "rich", glow: "warm", glass: false, prefersDark: false, animation: "breath" },
  },
  {
    id: "dark-sage-glass",
    name: "Dark Sage Glass",
    tagline: "Premium, cinematic, deep focus.",
    mood: ["focused", "luxurious", "cinematic"],
    bestFor: ["Dark mode", "Focus mode", "Deep work"],
    palette: ["#1F2A24", "#2D3A33", "#8EA68C", "#D8B06A", "#F5F2EB"],
    fontDisplay: "Playfair Display",
    fontBody: "Plus Jakarta Sans",
    vibe: { gradient: "cinematic", glow: "luminous", glass: true, prefersDark: true, animation: "drift" },
  },
  {
    id: "dawn",
    name: "Dawn",
    tagline: "Hopeful, fresh-start, warm productivity.",
    mood: ["hopeful", "energizing", "warm"],
    bestFor: ["Morning routines", "Weekly resets", "Planning sessions"],
    palette: ["#F4C6A8", "#E0A85B", "#FAF4EC", "#D98873", "#B56E52", "#AAB59B"],
    fontDisplay: "Fraunces",
    fontBody: "DM Sans",
    vibe: { gradient: "rich", glow: "warm", glass: false, prefersDark: false, animation: "breath" },
  },
  {
    id: "mist",
    name: "Mist",
    tagline: "Quiet. Grounded. Reduce-overwhelm mode.",
    mood: ["quiet", "cooling", "safe"],
    bestFor: ["Low-energy days", "Nervous system regulation", "Overwhelm recovery"],
    palette: ["#D9D8D4", "#BFC1BB", "#C9D1C7", "#F6F5F1", "#9CA8A8", "#5F6662"],
    fontDisplay: "Playfair Display",
    fontBody: "DM Sans",
    vibe: { gradient: "whisper", glow: "none", glass: false, prefersDark: false, animation: "still" },
  },
  {
    id: "blossom",
    name: "Blossom",
    tagline: "Soft, feminine, emotionally nurturing.",
    mood: ["soft", "feminine", "comforting", "gentle joy"],
    bestFor: ["Self-care", "Journaling", "Emotional reset", "Cozy routines", "Heart-centered planning"],
    palette: ["#D98FAF", "#E8B7C8", "#FAF2F5", "#B57C95", "#D8B06A", "#B7C1AE"],
    fontDisplay: "Cormorant Garamond",
    fontBody: "Plus Jakarta Sans",
    vibe: { gradient: "rich", glow: "warm", glass: true, prefersDark: false, animation: "breath" },
  },
  {
    id: "peony-bloom",
    name: "Peony Bloom",
    tagline: "Sun-warmed petals and porch breezes.",
    mood: ["tender", "romantic", "light"],
    bestFor: ["Journaling", "Gentle planning", "Summer mornings"],
    palette: ["#F7C8D1", "#F4A6B8", "#FBF4EE", "#B5D3C2", "#E8C77E", "#7A5563"],
    fontDisplay: "Cormorant Garamond",
    fontBody: "Plus Jakarta Sans",
    vibe: { gradient: "soft", glow: "warm", glass: true, prefersDark: false, animation: "breath" },
  },
  {
    id: "wisteria-drift",
    name: "Wisteria Drift",
    tagline: "Lavender shade on a long July afternoon.",
    mood: ["dreamy", "cooling", "contemplative"],
    bestFor: ["Afternoon resets", "Creative drift", "Slow reading"],
    palette: ["#C9B8E0", "#A99BC9", "#F4F0F8", "#CFE2D5", "#E8C77E", "#6E5A8A"],
    fontDisplay: "Fraunces",
    fontBody: "DM Sans",
    vibe: { gradient: "soft", glow: "subtle", glass: true, prefersDark: false, animation: "drift" },
  },
  {
    id: "hibiscus-coast",
    name: "Hibiscus Coast",
    tagline: "Coral blossoms over turquoise tide.",
    mood: ["bright", "restorative", "breezy"],
    bestFor: ["Travel", "Beach days", "Energetic summer planning"],
    palette: ["#FFB8A1", "#FF9E83", "#FFF6EE", "#9CD3D0", "#F2C879", "#6B4A52"],
    fontDisplay: "Fraunces",
    fontBody: "Plus Jakarta Sans",
    vibe: { gradient: "rich", glow: "warm", glass: false, prefersDark: false, animation: "breath" },
  },
  // ───── Spring ─────
  {
    id: "cherry-mist",
    name: "Cherry Mist",
    tagline: "First petals after a long thaw.",
    mood: ["fresh", "tender", "hopeful"],
    bestFor: ["Spring mornings", "Gentle planning", "New beginnings"],
    palette: ["#F8D2DA", "#E8A8B5", "#F5F8FB", "#B9D5E8", "#E8C77E", "#6E4F58"],
    fontDisplay: "Fraunces",
    fontBody: "Plus Jakarta Sans",
    vibe: { gradient: "soft", glow: "subtle", glass: true, prefersDark: false, animation: "breath" },
  },
  {
    id: "meadow-dew",
    name: "Meadow Dew",
    tagline: "Morning grass and open windows.",
    mood: ["fresh", "energizing", "clear"],
    bestFor: ["Spring resets", "Outdoor planning", "Bright focus"],
    palette: ["#C8DDB0", "#9BBE82", "#FBF9EC", "#F4E2A3", "#A8C8D9", "#4F6244"],
    fontDisplay: "Fraunces",
    fontBody: "DM Sans",
    vibe: { gradient: "soft", glow: "subtle", glass: false, prefersDark: false, animation: "breath" },
  },
  {
    id: "lilac-rain",
    name: "Lilac Rain",
    tagline: "Gentle April showers.",
    mood: ["dreamy", "cooling", "soft"],
    bestFor: ["Rainy days", "Slow journaling", "Reflection"],
    palette: ["#D8C8E4", "#B8A2D0", "#F4F2F8", "#CBD6DD", "#E0CDB4", "#5A4A6B"],
    fontDisplay: "Cormorant Garamond",
    fontBody: "DM Sans",
    vibe: { gradient: "whisper", glow: "subtle", glass: true, prefersDark: false, animation: "drift" },
  },
  // ───── Fall ─────
  {
    id: "harvest-ember",
    name: "Harvest Ember",
    tagline: "Wood smoke and golden hour.",
    mood: ["warm", "grounding", "cozy"],
    bestFor: ["Autumn evenings", "Hearth planning", "Comfort routines"],
    palette: ["#D67A45", "#A8512E", "#F4E4CE", "#8A6A3F", "#6B3A2A", "#2E1F18"],
    fontDisplay: "Fraunces",
    fontBody: "Inter",
    vibe: { gradient: "rich", glow: "warm", glass: false, prefersDark: false, animation: "breath" },
  },
  {
    id: "amber-orchard",
    name: "Amber Orchard",
    tagline: "Cider on the porch.",
    mood: ["warm", "abundant", "homely"],
    bestFor: ["Seasonal cooking", "Family rituals", "Gratitude"],
    palette: ["#E0A152", "#C25C3A", "#FBF1DC", "#8A9B6E", "#B4663C", "#4A2E22"],
    fontDisplay: "Fraunces",
    fontBody: "Plus Jakarta Sans",
    vibe: { gradient: "rich", glow: "warm", glass: false, prefersDark: false, animation: "breath" },
  },
  {
    id: "foggy-pine",
    name: "Foggy Pine",
    tagline: "Cold pine and quiet trails.",
    mood: ["grounded", "introspective", "cool"],
    bestFor: ["Deep focus", "Outdoor planning", "Rainy afternoons"],
    palette: ["#3A4A40", "#5C7062", "#D8DDD6", "#9BAA9F", "#C7A878", "#1C2620"],
    fontDisplay: "Playfair Display",
    fontBody: "Plus Jakarta Sans",
    vibe: { gradient: "rich", glow: "subtle", glass: true, prefersDark: true, animation: "drift" },
  },
  // ───── Winter ─────
  {
    id: "snowfall-hush",
    name: "Snowfall Hush",
    tagline: "First snow at dusk.",
    mood: ["quiet", "spacious", "still"],
    bestFor: ["Winter mornings", "Reset days", "Mindful focus"],
    palette: ["#E6EDF2", "#C4D1DC", "#F8FAFC", "#A3B4C2", "#D4C7A8", "#475568"],
    fontDisplay: "Playfair Display",
    fontBody: "DM Sans",
    vibe: { gradient: "whisper", glow: "subtle", glass: true, prefersDark: false, animation: "still" },
  },
  {
    id: "evergreen-hearth",
    name: "Evergreen Hearth",
    tagline: "Firelight under the tree.",
    mood: ["warm", "festive", "rooted"],
    bestFor: ["Holiday planning", "Family evenings", "Cozy work"],
    palette: ["#2E4A34", "#C0432A", "#F4E8D2", "#D4A14C", "#6E8A6A", "#1A2A20"],
    fontDisplay: "Fraunces",
    fontBody: "Inter",
    vibe: { gradient: "rich", glow: "warm", glass: false, prefersDark: false, animation: "breath" },
  },
  {
    id: "frosted-plum",
    name: "Frosted Plum",
    tagline: "Long nights, soft candlelight.",
    mood: ["reflective", "intimate", "magical"],
    bestFor: ["Winter journaling", "Evening rituals", "Slow reflection"],
    palette: ["#7A6488", "#A893B8", "#E8E4EE", "#C9D6DC", "#D4B98A", "#2E2438"],
    fontDisplay: "Cormorant Garamond",
    fontBody: "DM Sans",
    vibe: { gradient: "rich", glow: "luminous", glass: true, prefersDark: true, animation: "drift" },
  },
];

export const DEFAULT_ATMOSPHERE: AtmosphereId = "sage-sanctuary";

/** Seasonal collections for the picker. Some atmospheres feel right in multiple seasons. */
export type Season = "spring" | "summer" | "fall" | "winter" | "anytime";

export const SEASONS: Array<{ id: Season; label: string; emoji: string; atmospheres: AtmosphereId[] }> = [
  {
    id: "spring",
    label: "Spring",
    emoji: "🌸",
    atmospheres: ["cherry-mist", "meadow-dew", "lilac-rain", "blossom", "dawn"],
  },
  {
    id: "summer",
    label: "Summer",
    emoji: "☀️",
    atmospheres: ["peony-bloom", "wisteria-drift", "hibiscus-coast", "coastal-calm"],
  },
  {
    id: "fall",
    label: "Fall",
    emoji: "🍂",
    atmospheres: ["harvest-ember", "amber-orchard", "foggy-pine", "golden-hearth"],
  },
  {
    id: "winter",
    label: "Winter",
    emoji: "❄️",
    atmospheres: ["snowfall-hush", "evergreen-hearth", "frosted-plum", "mist", "moonlit-plum", "dark-sage-glass"],
  },
  {
    id: "anytime",
    label: "Anytime",
    emoji: "✨",
    atmospheres: ["sage-sanctuary", "soft-linen"],
  },
];

export function getAtmosphere(id: AtmosphereId | string | null | undefined): Atmosphere {
  return ATMOSPHERES.find(a => a.id === id) ?? ATMOSPHERES[0];
}

// ───────────── auto-switch rules ─────────────

export type AutoRules = {
  enabled: boolean;
  morning: AtmosphereId;       // 5-11
  afternoon: AtmosphereId;     // 12-17
  evening: AtmosphereId;       // 18-21
  night: AtmosphereId;         // 22-4
  lowEnergy: AtmosphereId;
  focus: AtmosphereId;
  fullMoon: AtmosphereId;
};

export const DEFAULT_AUTO_RULES: AutoRules = {
  enabled: false,
  morning: "dawn",
  afternoon: "sage-sanctuary",
  evening: "moonlit-plum",
  night: "dark-sage-glass",
  lowEnergy: "mist",
  focus: "dark-sage-glass",
  fullMoon: "moonlit-plum",
};

export type AutoContext = {
  hour: number;
  lowEnergy?: boolean;
  focus?: boolean;
  moonPhase?: string | null;
};

/** Resolve which atmosphere should be active given context + rules. Priority: focus > lowEnergy > moon > time. */
export function resolveAutoAtmosphere(rules: AutoRules, ctx: AutoContext): AtmosphereId {
  if (ctx.focus) return rules.focus;
  if (ctx.lowEnergy) return rules.lowEnergy;
  if (ctx.moonPhase && /full/i.test(ctx.moonPhase)) return rules.fullMoon;
  const h = ctx.hour;
  if (h >= 5 && h < 12) return rules.morning;
  if (h >= 12 && h < 18) return rules.afternoon;
  if (h >= 18 && h < 22) return rules.evening;
  return rules.night;
}

// ───────────── store ─────────────

const K_CURRENT = "careflow:atmosphere";
const K_FAV = "careflow:atmosphere:favorites";
const K_RECENT = "careflow:atmosphere:recent";
const K_AUTO = "careflow:atmosphere:auto";

function readId(): AtmosphereId {
  if (typeof localStorage === "undefined") return DEFAULT_ATMOSPHERE;
  const v = localStorage.getItem(K_CURRENT) as AtmosphereId | null;
  return v && ATMOSPHERES.some(a => a.id === v) ? v : DEFAULT_ATMOSPHERE;
}
function readFavs(): AtmosphereId[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(K_FAV) ?? "[]"); } catch { return []; }
}
function readRecent(): AtmosphereId[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(K_RECENT) ?? "[]"); } catch { return []; }
}
function readAuto(): AutoRules {
  if (typeof localStorage === "undefined") return DEFAULT_AUTO_RULES;
  try {
    const raw = localStorage.getItem(K_AUTO);
    return raw ? { ...DEFAULT_AUTO_RULES, ...JSON.parse(raw) } : DEFAULT_AUTO_RULES;
  } catch { return DEFAULT_AUTO_RULES; }
}

function applyAtmosphere(id: AtmosphereId) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.setAttribute("data-atmosphere", id);
  // smooth transition
  html.classList.add("atmo-transition");
  window.setTimeout(() => html.classList.remove("atmo-transition"), 700);
}

let _current: AtmosphereId = readId();
let _favs: AtmosphereId[] = readFavs();
let _recent: AtmosphereId[] = readRecent();
let _auto: AutoRules = readAuto();
const listeners = new Set<() => void>();
applyAtmosphere(_current);

function emit() { listeners.forEach(fn => fn()); }

export function getCurrentAtmosphere(): AtmosphereId { return _current; }

export function setAtmosphere(id: AtmosphereId, opts?: { silent?: boolean }) {
  _current = id;
  try { localStorage.setItem(K_CURRENT, id); } catch { /* */ }
  applyAtmosphere(id);
  if (!opts?.silent) {
    _recent = [id, ..._recent.filter(x => x !== id)].slice(0, 6);
    try { localStorage.setItem(K_RECENT, JSON.stringify(_recent)); } catch { /* */ }
  }
  emit();
}

export function toggleFavorite(id: AtmosphereId) {
  _favs = _favs.includes(id) ? _favs.filter(x => x !== id) : [..._favs, id];
  try { localStorage.setItem(K_FAV, JSON.stringify(_favs)); } catch { /* */ }
  emit();
}

export function setAutoRules(rules: Partial<AutoRules>) {
  _auto = { ..._auto, ...rules };
  try { localStorage.setItem(K_AUTO, JSON.stringify(_auto)); } catch { /* */ }
  emit();
}

export function useAtmosphere() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force(x => x + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  const setById = useCallback((id: AtmosphereId) => setAtmosphere(id), []);
  return {
    current: _current,
    atmosphere: getAtmosphere(_current),
    favorites: _favs,
    recent: _recent,
    auto: _auto,
    set: setById,
    toggleFavorite,
    setAutoRules,
  };
}

/** Hook that runs auto-switch resolution when rules.enabled is true. */
export function useAutoAtmosphereResolver(ctx: { lowEnergy?: boolean; focus?: boolean; moonPhase?: string | null }) {
  const { auto } = useAtmosphere();
  useEffect(() => {
    if (!auto.enabled) return;
    const tick = () => {
      const next = resolveAutoAtmosphere(auto, {
        hour: new Date().getHours(),
        lowEnergy: ctx.lowEnergy,
        focus: ctx.focus,
        moonPhase: ctx.moonPhase,
      });
      if (next !== getCurrentAtmosphere()) setAtmosphere(next, { silent: true });
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [auto, ctx.lowEnergy, ctx.focus, ctx.moonPhase]);
}