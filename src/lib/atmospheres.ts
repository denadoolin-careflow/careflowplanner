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
  | "mist";

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
];

export const DEFAULT_ATMOSPHERE: AtmosphereId = "sage-sanctuary";

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