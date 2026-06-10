/**
 * Categorization + thematic metadata for cosmic events.
 * Pure derivations on top of the event catalog (no AI, no network).
 */
import { addDays, format, parseISO } from "date-fns";
import type { CosmicEvent } from "@/lib/cosmic/events";
import { eventsOnDay } from "@/lib/cosmic/events";
import { SIGN_ELEMENT, type Element } from "@/lib/cosmic/glyphs";
import type { Sign } from "@/lib/transits";
import { planetSign } from "@/lib/transits";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { getMoonSign } from "@/lib/zodiac";

export type EventCategory =
  | "moon" | "retrograde" | "ingress" | "personal" | "outer"
  | "love" | "career" | "home" | "growth" | "eclipse";

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  moon: "Moon",
  retrograde: "Retrogrades",
  ingress: "Ingresses",
  personal: "Personal",
  outer: "Outer",
  love: "Love",
  career: "Career",
  home: "Home",
  growth: "Growth",
  eclipse: "Eclipses",
};

const PERSONAL = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars"]);
const OUTER = new Set(["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]);

export function categoriesFor(e: CosmicEvent): EventCategory[] {
  const out = new Set<EventCategory>();
  if (e.kind === "phase" || e.kind === "voc") out.add("moon");
  if (e.kind === "eclipse") { out.add("eclipse"); out.add("moon"); }
  if (e.kind === "ingress") out.add("ingress");
  if (e.kind === "retrograde" || e.kind === "direct") out.add("retrograde");
  if (e.kind === "aspect" || e.kind === "cazimi") out.add("personal");
  if (e.planet && PERSONAL.has(e.planet)) out.add("personal");
  if (e.planet && OUTER.has(e.planet)) out.add("outer");
  if (e.planet === "Venus") { out.add("love"); out.add("home"); }
  if (e.planet === "Mars") { out.add("career"); out.add("growth"); }
  if (e.planet === "Mercury") out.add("career");
  if (e.planet === "Jupiter") out.add("growth");
  if (e.planet === "Saturn") { out.add("career"); out.add("growth"); }
  if (e.sign === "Cancer" || e.sign === "Taurus") out.add("home");
  if (e.sign === "Libra" || e.sign === "Pisces") out.add("love");
  if (e.sign === "Capricorn" || e.sign === "Virgo") out.add("career");
  if (e.sign === "Sagittarius" || e.sign === "Aquarius") out.add("growth");
  return Array.from(out);
}

export function elementFor(e: CosmicEvent, date: Date): Element | null {
  if (e.sign) return SIGN_ELEMENT[e.sign as Sign];
  if (e.kind === "phase" || e.kind === "eclipse" || e.kind === "voc") {
    const ms = getMoonSign(date);
    return SIGN_ELEMENT[ms.name as Sign] ?? null;
  }
  if ((e.kind === "aspect" || e.kind === "cazimi") && e.planet) {
    const s = planetSign(e.planet, date);
    return SIGN_ELEMENT[s as Sign] ?? null;
  }
  return null;
}

export function intensityFor(e: CosmicEvent): number {
  if (e.kind === "eclipse") return 5;
  if (e.kind === "cazimi") return 4;
  if (e.kind === "phase" && (e.phase === "full" || e.phase === "new")) return 4;
  if (e.kind === "retrograde" || e.kind === "direct") return 3;
  if (e.kind === "ingress") return 3;
  if (e.kind === "aspect") return 3;
  if (e.kind === "phase") return 2;
  return 1;
}

export interface FourFold { plan: string; care: string; grow: string; release: string; }

const SIGN_TONE: Record<Sign, { plan: string; care: string; grow: string; release: string }> = {
  Aries:       { plan: "fresh starts and brave yeses", care: "movement and short bursts of effort", grow: "doing the thing before you feel ready", release: "the need for permission" },
  Taurus:      { plan: "slow comforts and steady tending", care: "good food, warm textures, time outside", grow: "trusting your pace", release: "rushing toward outcomes" },
  Gemini:      { plan: "messages, errands, light shifts", care: "stimulating conversation and fresh air", grow: "asking better questions", release: "needing one final answer" },
  Cancer:      { plan: "home, family, soft homecoming", care: "early bedtime and a warm meal", grow: "letting yourself be cared for", release: "carrying everyone else's mood" },
  Leo:         { plan: "visible warmth and generous play", care: "joy that isn't productive", grow: "being seen on purpose", release: "shrinking to be palatable" },
  Virgo:       { plan: "lists, tidying, follow-through", care: "one clean surface and one tended body part", grow: "doing things well enough", release: "perfection as worthiness" },
  Libra:       { plan: "balance, conversations, asking for help", care: "beautiful spaces and shared meals", grow: "stating a preference clearly", release: "performing fairness" },
  Scorpio:     { plan: "honest depth — protect your energy", care: "early endings, fewer people", grow: "telling one truth you've been holding", release: "the loyalty that costs you" },
  Sagittarius: { plan: "one hopeful step, leave room to breathe", care: "novelty, books, longer walks", grow: "trusting your future self", release: "the urge to know exactly how" },
  Capricorn:   { plan: "steady ordinary work; pace over pressure", care: "structure that supports rest", grow: "respecting your own authority", release: "proving your worth through output" },
  Aquarius:    { plan: "thinking, planning, reaching out", care: "community without performance", grow: "naming what you actually need", release: "isolation disguised as independence" },
  Pisces:      { plan: "reflection — soften the to-do list", care: "water, music, naps", grow: "honoring intuition as data", release: "absorbing what isn't yours" },
};

function defaultFourFold(): FourFold {
  return {
    plan: "Move at the pace of kindness today.",
    care: "A glass of water, a small stretch.",
    grow: "Notice one small thing you're proud of.",
    release: "Let one item slide without guilt.",
  };
}

export function fourFoldFor(e: CosmicEvent): FourFold {
  if (e.kind === "phase") {
    switch (e.phase) {
      case "new": return { plan: "Sketch one quiet intention.", care: "Sleep early — start gentle.", grow: "Pick the smallest possible first step.", release: "Let go of mapping the whole cycle." };
      case "first-quarter": return { plan: "Choose one priority and protect it.", care: "Notice friction without judging it.", grow: "Recommit to the thing that's hard.", release: "Drop one optional task." };
      case "full": return { plan: "Celebrate or share what's ripe.", care: "Feel without fixing.", grow: "Reflect on what's lit up.", release: "Forgive an old story you keep replaying." };
      case "last-quarter": return { plan: "Edit your list — archive what's done.", care: "Rest before you push.", grow: "Notice what's outgrown its season.", release: "Let one habit, item, or task go." };
    }
  }
  if (e.kind === "eclipse") return { plan: "Don't sign or launch — postpone a week.", care: "Warm food, less news, more quiet.", grow: "Notice what surfaces — it's information.", release: "Loosen your grip on the outcome." };
  if (e.kind === "voc") return { plan: "Save big asks. Batch small tasks.", care: "Daydream. Take a walk.", grow: "Notice without acting yet.", release: "Permission to leave today unfinished." };
  if (e.kind === "retrograde" && e.planet) {
    const map: Record<string, FourFold> = {
      Mercury: { plan: "Reschedule big sends. Re-read before replying.", care: "Slower mornings. More white space.", grow: "Repair an old conversation you've avoided.", release: "Let go of being perfectly understood." },
      Venus:   { plan: "Pause new commitments — financial or romantic.", care: "Re-style what you have before buying more.", grow: "Revisit values: what actually matters?", release: "Release a relationship you've outgrown." },
      Mars:    { plan: "Conserve effort. Pick fewer battles.", care: "Rest is the productive choice.", grow: "Notice what you keep pushing against.", release: "Let go of the urgency story." },
      Jupiter: { plan: "Internal expansion — study, plan, don't launch.", care: "Limit inputs; pick one source of growth.", grow: "Refine the belief, not the brand.", release: "Release the 'more is more' default." },
      Saturn:  { plan: "Audit one structure. Repair, don't rebuild.", care: "Set one boundary that protects sleep.", grow: "Recommit to one long-term promise.", release: "Drop a 'should' that was never yours." },
    };
    return map[e.planet] ?? defaultFourFold();
  }
  if (e.kind === "direct") return { plan: "Translate the review into one forward step.", care: "Ease back in — don't sprint.", grow: "Apply one thing you learned.", release: "Release the delay story." };
  if (e.kind === "ingress" && e.sign) {
    const tone = SIGN_TONE[e.sign as Sign];
    return { plan: `Lean plans into ${tone.plan}.`, care: `Care looks like ${tone.care}.`, grow: `Growth lives in ${tone.grow}.`, release: `Release ${tone.release}.` };
  }
  return defaultFourFold();
}

export interface ThemeBuckets { emotional: string; relationships: string; career: string; family: string; growth: string; }

function defaultThemes(): ThemeBuckets {
  return { emotional: "An ordinary day, ordinary feelings.", relationships: "Be kind. Be specific.", career: "One small finished thing is a win.", family: "A check-in text counts.", growth: "Notice what you're learning." };
}

export function themesFor(e: CosmicEvent): ThemeBuckets {
  const sign = e.sign as Sign | undefined;
  const tone = sign ? SIGN_TONE[sign] : null;
  if (e.kind === "phase") {
    const lit = e.phase === "full" ? "what's culminating" : e.phase === "new" ? "what's beginning" : e.phase === "last-quarter" ? "what's ready to release" : "what's gaining traction";
    return { emotional: `Tender — feelings about ${lit} may surface.`, relationships: "Soft moves work better than big declarations.", career: "Use today for editing and reflection, not launching.", family: "Make space for one honest, kind conversation.", growth: tone ? `Grow into ${tone.grow}.` : `Grow by noticing ${lit}.` };
  }
  if (e.kind === "eclipse") return { emotional: "Bigger feelings than the day deserves — be gentle.", relationships: "Postpone hard talks. If you can't, listen first.", career: "Don't sign or launch this week.", family: "Old patterns may resurface — name them without acting.", growth: "Notice what's loud — it's a clue, not an order." };
  if (e.kind === "retrograde" && e.planet) {
    const map: Record<string, ThemeBuckets> = {
      Mercury: { emotional: "Misread tones — assume kindness.", relationships: "Re-read messages before sending.", career: "Slower decisions, better follow-up.", family: "An old conversation may want a redo.", growth: "Refine how you communicate." },
      Venus:   { emotional: "Old loves and longings echo.", relationships: "Don't define the new — revisit the old.", career: "Pause on financial commitments.", family: "Resentment about giving may surface — name it.", growth: "Re-check what you actually value." },
      Mars:    { emotional: "Frustration with no outlet — let it move.", relationships: "Tone matters more than message.", career: "Push less; pace more.", family: "Short fuses — pre-decide your responses.", growth: "Learn the difference between drive and depletion." },
      Jupiter: { emotional: "Hope feels quieter; that's okay.", relationships: "Re-examine generosity — is it mutual?", career: "Refine the plan; don't expand the brand.", family: "Less advice, more listening.", growth: "Find the truth inside the optimism." },
      Saturn:  { emotional: "A sober mood — honor it.", relationships: "Renegotiate one agreement clearly.", career: "Strengthen a structure that's wobbly.", family: "Set one quiet boundary.", growth: "Repair before you rebuild." },
    };
    return map[e.planet] ?? defaultThemes();
  }
  if (e.kind === "ingress" && sign && tone) {
    return { emotional: `Emotional weather leans toward ${tone.care}.`, relationships: `Conversations want ${tone.plan}.`, career: `Work goes well with ${tone.plan}.`, family: `At home, lean into ${tone.care}.`, growth: `Grow by ${tone.grow}.` };
  }
  if (e.kind === "voc") return { emotional: "Dreamy, drifty — that's fine.", relationships: "Save the big asks for tomorrow.", career: "Batch tasks; postpone decisions.", family: "Low-key time at home wins.", growth: "Practice doing less without guilt." };
  return defaultThemes();
}

export interface DaySnapshot {
  date: Date;
  events: CosmicEvent[];
  dominantElement: Element | null;
  moonPhase: ReturnType<typeof getMoonPhase>;
  moonGlyph: string;
  moonSign: string;
  hasRetro: boolean;
  hasEclipse: boolean;
  intensity: number;
  weatherScore: number;
  bestFor: string[];
  avoid: string[];
}

function bestAvoidFor(el: Element | null, hasEclipse: boolean, hasRetro: boolean, events: CosmicEvent[]) {
  const best = new Set<string>();
  const avoid = new Set<string>();
  if (el === "Fire") { best.add("Creativity"); best.add("Movement"); best.add("Bold starts"); }
  if (el === "Earth") { best.add("Planning"); best.add("Tidying"); best.add("Body care"); }
  if (el === "Air") { best.add("Conversations"); best.add("Writing"); best.add("Connecting"); }
  if (el === "Water") { best.add("Reflection"); best.add("Rest"); best.add("Journaling"); }
  if (events.some(e => e.phase === "full")) { best.add("Celebrating"); }
  if (events.some(e => e.phase === "new")) { best.add("Quiet intention"); }
  if (events.some(e => e.kind === "ingress")) best.add("Shifting plans");
  if (hasRetro) { avoid.add("New launches"); avoid.add("Signing contracts"); }
  if (hasEclipse) { avoid.add("Big decisions"); avoid.add("Hard conversations"); }
  if (events.some(e => e.kind === "voc")) avoid.add("Important asks");
  if (!avoid.size) avoid.add("Overscheduling");
  return { bestFor: Array.from(best).slice(0, 4), avoid: Array.from(avoid).slice(0, 3) };
}

export function snapshotForDay(date: Date): DaySnapshot {
  const events = eventsOnDay(date);
  const elements = new Map<Element, number>();
  for (const e of events) {
    const el = elementFor(e, date);
    if (el) elements.set(el, (elements.get(el) ?? 0) + intensityFor(e));
  }
  const moonSign = getMoonSign(date).name as Sign;
  const moonEl = SIGN_ELEMENT[moonSign];
  elements.set(moonEl, (elements.get(moonEl) ?? 0) + 2);
  const dominantElement = Array.from(elements.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const moonPhase = getMoonPhase(date);
  const moonGlyph = MOON_INFO[moonPhase].glyph;
  const hasRetro = events.some(e => e.kind === "retrograde");
  const hasEclipse = events.some(e => e.kind === "eclipse");
  const intensity = events.reduce((s, e) => s + intensityFor(e), 0);

  let score = 7;
  if (hasEclipse) score -= 3;
  if (hasRetro) score -= 1;
  if (events.some(e => e.kind === "voc")) score -= 1;
  if (events.some(e => e.phase === "full")) score += 1;
  if (events.some(e => e.phase === "new")) score += 1;
  if (events.some(e => e.kind === "ingress")) score += 1;
  score = Math.max(1, Math.min(10, score));

  const { bestFor, avoid } = bestAvoidFor(dominantElement, hasEclipse, hasRetro, events);
  return { date, events, dominantElement, moonPhase, moonGlyph, moonSign, hasRetro, hasEclipse, intensity, weatherScore: score, bestFor, avoid };
}

const snapCache = new Map<string, DaySnapshot>();
export function cachedSnapshot(date: Date): DaySnapshot {
  const key = format(date, "yyyy-MM-dd");
  const hit = snapCache.get(key);
  if (hit) return hit;
  const snap = snapshotForDay(date);
  snapCache.set(key, snap);
  return snap;
}

export function rangeSnapshots(from: Date, days: number): DaySnapshot[] {
  const out: DaySnapshot[] = [];
  for (let i = 0; i < days; i++) out.push(cachedSnapshot(addDays(from, i)));
  return out;
}

export function parseIsoDate(iso: string): Date { return parseISO(iso); }
