/**
 * Daily Moon aspect guide — exact local times of Moon aspects (conjunction,
 * sextile, square, trine, opposition) to the planets plus Moon sign
 * ingresses, computed on-device from the astronomy engine.
 */
import { bodyLongitude, type ExtPlanet } from "@/lib/cosmic/astro/bodies";
import { format } from "date-fns";

export type MoonAspectName = "conjunction" | "sextile" | "square" | "trine" | "opposition";
export const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"] as const;
const TARGETS: [number, MoonAspectName][] = [[0,"conjunction"],[60,"sextile"],[90,"square"],[120,"trine"],[180,"opposition"],[240,"trine"],[270,"square"],[300,"sextile"]];
const PLANETS: ExtPlanet[] = ["Sun","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"];
const norm = (x: number) => ((x % 360) + 360) % 360;

export const ASPECT_GUIDE: Record<MoonAspectName, { glyph: string; tone: string; feel: string; focus: string; actions: string[] }> = {
  conjunction: { glyph: "☌", tone: "Blending", feel: "Feelings and this theme merge — focus feels strong.", focus: "Begin & align", actions: ["Start one meaningful task", "Set a short intention"] },
  sextile: { glyph: "✶", tone: "Supportive", feel: "A small, friendly opening if you act on it.", focus: "Connect & reach out", actions: ["Send that message or email", "Book an appointment"] },
  square: { glyph: "□", tone: "Stretching", feel: "Some friction that nudges you to adjust.", focus: "Tackle & adjust", actions: ["Clear one stuck chore", "Hold a gentle boundary"] },
  trine: { glyph: "△", tone: "Flowing", feel: "Things come more easily — good momentum.", focus: "Create & care", actions: ["Do your most important work", "Make time for something restoring"] },
  opposition: { glyph: "☍", tone: "Balancing", feel: "A pull between your needs and others'.", focus: "Reflect & balance", actions: ["Check in with someone", "Don't over-commit — trim one thing"] },
};

export const PLANET_AREA: Record<string, string> = {
  Sun: "energy & purpose", Mercury: "talks, plans & errands", Venus: "comfort, love & money", Mars: "drive & physical tasks",
  Jupiter: "growth & generosity", Saturn: "duty, structure & limits", Uranus: "change & surprises", Neptune: "rest, intuition & dreams", Pluto: "deep change & letting go",
};

export interface MoonDayEvent {
  id: string; time: Date; kind: "aspect" | "ingress";
  aspect?: MoonAspectName; planet?: string; sign: string; label: string; advice: string; actions: string[];
}

function moonDiff(p: ExtPlanet, t: Date) { return norm(bodyLongitude("Moon", t) - bodyLongitude(p, t)); }

/** Find the time within [a,b] where f crosses target (f increasing, wrapped). */
function bisect(f: (t: Date) => number, target: number, a: number, b: number) {
  for (let i = 0; i < 18; i++) {
    const m = (a + b) / 2;
    const v = norm(f(new Date(m)) - target + 180) - 180;
    if (v < 0) a = m; else b = m;
  }
  return new Date((a + b) / 2);
}

function crossed(prev: number, next: number, target: number) {
  const a = norm(prev - target + 180) - 180, b = norm(next - target + 180) - 180;
  return a < 0 && b >= 0 && b - a < 90;
}

export function moonEventsOnDay(day: Date): MoonDayEvent[] {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const H = 3600000, out: MoonDayEvent[] = [];
  const signAt = (t: Date) => SIGNS[Math.floor(norm(bodyLongitude("Moon", t)) / 30)];
  for (let h = 0; h < 24; h++) {
    const a = start + h * H, b = a + H;
    for (const p of PLANETS) {
      const da = moonDiff(p, new Date(a)), db = moonDiff(p, new Date(b));
      for (const [angle, name] of TARGETS) {
        if (!crossed(da, db, angle)) continue;
        const time = bisect(t => moonDiff(p, t), angle, a, b);
        const g = ASPECT_GUIDE[name];
        out.push({ id: `${p}-${name}-${time.getTime()}`, time, kind: "aspect", aspect: name, planet: p, sign: signAt(time),
          label: `Moon ${g.glyph} ${name} ${p}`, advice: `${g.focus} around ${PLANET_AREA[p]}. ${g.feel}`, actions: g.actions });
      }
    }
    const la = bodyLongitude("Moon", new Date(a)), lb = bodyLongitude("Moon", new Date(b));
    const boundary = Math.ceil(norm(la) / 30) * 30 % 360;
    if (crossed(la, lb, boundary)) {
      const time = bisect(t => bodyLongitude("Moon", t), boundary, a, b);
      const sign = SIGNS[Math.round(boundary / 30) % 12];
      out.push({ id: `ingress-${time.getTime()}`, time, kind: "ingress", sign, label: `Moon enters ${sign}`,
        advice: `The emotional tone shifts to ${sign}. Before this, tidy loose ends and rest; after, begin fresh.`, actions: ["Wrap up and tidy before the shift"] });
    }
  }
  return out.sort((x, y) => x.time.getTime() - y.time.getTime());
}

export function moonSignOn(day: Date) {
  return SIGNS[Math.floor(norm(bodyLongitude("Moon", new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0))) / 30)];
}

export function astroSeekUrl() { return "https://horoscopes.astro-seek.com/moon-aspects-calendar"; }

/** Markdown checklist for the daily note. */
export function buildMoonAspectsMarkdown(day: Date): string {
  const ev = moonEventsOnDay(day);
  const lines = ["", `## 🌙 Moon aspects · Moon in ${moonSignOn(day)}`, ""];
  if (!ev.length) lines.push("_No exact Moon aspects today — a steady day._");
  for (const e of ev) {
    lines.push(`**${format(e.time, "h:mm a")} · ${e.label}** — ${e.advice}`);
    for (const a of e.actions) lines.push(`- [ ] ${a}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function appendMoonAspects(body: string, day: Date) {
  return `${(body ?? "").replace(/\s+$/, "")}\n${buildMoonAspectsMarkdown(day)}`;
}

/* ---------- Preferences (device-local) ---------- */
export interface MoonGuidePrefs { dayRhythm: boolean; timeline: boolean; autoDailyNote: boolean; }
const KEY = "careflow:moon-guide-prefs";
const DEFAULTS: MoonGuidePrefs = { dayRhythm: true, timeline: false, autoDailyNote: false };
export function getMoonGuidePrefs(): MoonGuidePrefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return DEFAULTS; }
}
export function setMoonGuidePrefs(p: Partial<MoonGuidePrefs>) {
  localStorage.setItem(KEY, JSON.stringify({ ...getMoonGuidePrefs(), ...p }));
  window.dispatchEvent(new Event("careflow:moon-guide-prefs"));
}

/** A 1-hour planner block centred on the exact time, snapped to 15 min and kept within the day. */
export function moonBlockFor(e: MoonDayEvent) {
  const mins = e.time.getHours() * 60 + e.time.getMinutes();
  const start = Math.min(Math.max(Math.round((mins - 30) / 15) * 15, 0), 23 * 60);
  const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const focus = e.aspect ? ASPECT_GUIDE[e.aspect].focus : "Wrap up & reset";
  return { title: `🌙 ${focus} · ${e.label}`, startTime: hm(start), endTime: hm(start + 60), estMinutes: 60 };
}

const REFLECT_PROMPT: Record<MoonAspectName | "ingress", string> = {
  conjunction: "What did I begin or feel strongly about today?",
  sextile: "Which small opening did I notice, and did I take it?",
  square: "Where did I feel friction, and what did I adjust?",
  trine: "What came easily today, and how can I keep it going?",
  opposition: "Where did I balance my needs with someone else's?",
  ingress: "How did my mood shift as the Moon changed sign?",
};

/** Markdown reflection block for one Moon event, for the daily note. */
export function buildMoonReflection(e: MoonDayEvent): string {
  const prompt = REFLECT_PROMPT[e.aspect ?? "ingress"];
  return [`### 🌙 ${format(e.time, "h:mm a")} · ${e.label}${e.kind === "aspect" ? ` in ${e.sign}` : ""}`, `_${e.advice}_`, "", `**Reflect:** ${prompt}`, "", "- "].join("\n");
}
