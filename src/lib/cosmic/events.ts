/**
 * Builds the Cosmic Flow event catalog from local astronomy helpers.
 * Scans forward day-by-day and emits:
 *   - moon phase changes (new / first quarter / full / last quarter)
 *   - planetary ingresses (sign change vs previous day)
 *   - retrograde / direct stations
 *   - void-of-course moon windows
 *
 * Eclipses are surfaced when a New or Full Moon coincides with the Sun and
 * Moon being within ~1.5° of the lunar nodes (rough but good enough for UI).
 */
import { addDays, format } from "date-fns";
import {
  type Planet, type Sign,
  planetSign, isIngressDay, isRetrograde, isVoidOfCourse,
  SIGN_GLYPH, PLANET_GLYPH,
} from "@/lib/transits";
import { getMoonPhase, type MoonPhase } from "@/lib/moon";
import { getMoonSign } from "@/lib/zodiac";
import { encodeEventId, type CosmicEventKind } from "@/lib/cosmic/event-id";
import { aspectEventsOnDay } from "@/lib/cosmic/aspect-events";

export interface CosmicEvent {
  id: string;
  date: string;             // ISO yyyy-mm-dd
  kind: CosmicEventKind;
  planet?: Planet;
  sign?: Sign;
  phase?: MoonPhase;
  glyph: string;
  title: string;            // short label
  subtitle?: string;        // detail
  tone: "soft" | "warm" | "rest" | "warn";
  /** Aspect name for `kind === "aspect" | "cazimi"`. */
  aspect?: string;
  /** Second planet for aspect/cazimi events. */
  partner?: string;
}

const PLANETS: Planet[] = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

function iso(d: Date) { return format(d, "yyyy-MM-dd"); }

function phaseEvent(date: Date): CosmicEvent | null {
  const today = getMoonPhase(date);
  const yesterday = getMoonPhase(addDays(date, -1));
  const KEY: MoonPhase[] = ["new", "first-quarter", "full", "last-quarter"];
  if (!KEY.includes(today)) return null;
  if (today === yesterday) return null;
  const TITLE: Record<string, string> = {
    "new": "New Moon",
    "first-quarter": "First Quarter",
    "full": "Full Moon",
    "last-quarter": "Last Quarter",
  };
  const GLYPH: Record<string, string> = {
    "new": "🌑", "first-quarter": "🌓", "full": "🌕", "last-quarter": "🌗",
  };
  const moon = getMoonSign(date);
  const moonSign = moon.name as Sign;
  return {
    id: encodeEventId({ kind: "phase", date: iso(date), phase: today }),
    date: iso(date),
    kind: "phase",
    phase: today,
    sign: moonSign,
    glyph: `${GLYPH[today]} ${moon.symbol}`,
    title: `${TITLE[today]} in ${moonSign}`,
    subtitle: today === "full"
      ? `A culmination in ${moonSign} — honor what's lit.`
      : today === "new"
        ? `A fresh seed-point in ${moonSign}.`
        : `The Moon is in ${moonSign}.`,
    tone: today === "full" ? "warm" : today === "new" ? "soft" : "soft",
  };
}

function ingressEvents(date: Date): CosmicEvent[] {
  const out: CosmicEvent[] = [];
  for (const p of PLANETS) {
    if (isIngressDay(p, date)) {
      const sign = planetSign(p, date);
      out.push({
        id: encodeEventId({ kind: "ingress", date: iso(date), planet: p, sign }),
        date: iso(date),
        kind: "ingress",
        planet: p,
        sign,
        glyph: `${PLANET_GLYPH[p]}→${SIGN_GLYPH[sign]}`,
        title: `${p} enters ${sign}`,
        subtitle: `Energy shifts toward ${sign}.`,
        tone: "soft",
      });
    }
  }
  return out;
}

function stationEvents(date: Date): CosmicEvent[] {
  const out: CosmicEvent[] = [];
  for (const p of PLANETS) {
    const today = isRetrograde(p, date);
    const yesterday = isRetrograde(p, addDays(date, -1));
    if (today === yesterday) continue;
    if (today) {
      out.push({
        id: encodeEventId({ kind: "retrograde", date: iso(date), planet: p }),
        date: iso(date),
        kind: "retrograde",
        planet: p,
        glyph: `${PLANET_GLYPH[p]}℞`,
        title: `${p} stations retrograde`,
        subtitle: "A review season begins.",
        tone: p === "Mercury" || p === "Venus" || p === "Mars" ? "warn" : "rest",
      });
    } else {
      out.push({
        id: encodeEventId({ kind: "direct", date: iso(date), planet: p }),
        date: iso(date),
        kind: "direct",
        planet: p,
        glyph: `${PLANET_GLYPH[p]}D`,
        title: `${p} stations direct`,
        subtitle: "Forward motion returns.",
        tone: "soft",
      });
    }
  }
  return out;
}

function vocEvent(date: Date): CosmicEvent | null {
  if (!isVoidOfCourse(date)) return null;
  // emit once a day; tag with the Moon's current sign so the UI can show it
  const moon = getMoonSign(date);
  const moonSign = moon.name as Sign;
  return {
    id: encodeEventId({ kind: "voc", date: iso(date) }),
    date: iso(date),
    kind: "voc",
    sign: moonSign,
    glyph: `☾∅ ${moon.symbol}`,
    title: `Void-of-course Moon in ${moonSign}`,
    subtitle: `The Moon drifts through the final degrees of ${moonSign} — let the day breathe.`,
    tone: "rest",
  };
}

function eclipseEvent(date: Date): CosmicEvent | null {
  // Coarse: New/Full near a node. We approximate by checking that the
  // sun longitude is within 12° of the moon's ascending node, which has
  // mean longitude 125.04 - 0.0529539 * (JD - 2451545). Many full/new
  // moons miss this; that's fine — we'd rather miss than over-call.
  const today = getMoonPhase(date);
  if (today !== "new" && today !== "full") return null;
  const jd = date.getTime() / 86400000 + 2440587.5;
  const nodeLon = ((125.04 - 0.0529539 * (jd - 2451545)) % 360 + 360) % 360;
  // Sun longitude approx from doy
  const doy = (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000;
  const sunLon = ((280.46 + 0.9856474 * (jd - 2451545)) % 360 + 360) % 360;
  void doy;
  let diff = Math.abs(sunLon - nodeLon);
  if (diff > 180) diff = 360 - diff;
  const opp = Math.abs(diff - 180);
  const near = Math.min(diff, opp);
  if (near > 12) return null;
  const moon = getMoonSign(date);
  const moonSign = moon.name as Sign;
  const isLunar = today === "full";
  return {
    id: encodeEventId({ kind: "eclipse", date: iso(date), phase: today }),
    date: iso(date),
    kind: "eclipse",
    phase: today,
    sign: moonSign,
    glyph: `${isLunar ? "🌒🌕" : "🌑☀"} ${moon.symbol}`,
    title: `${isLunar ? "Lunar" : "Solar"} Eclipse in ${moonSign}`,
    subtitle: `A loud cosmic moment in ${moonSign} — go gently.`,
    tone: "warn",
  };
}

/** All events for a single day. */
export function eventsOnDay(date: Date): CosmicEvent[] {
  const out: CosmicEvent[] = [];
  const p = phaseEvent(date);
  if (p) out.push(p);
  const ec = eclipseEvent(date);
  if (ec) out.push(ec);
  out.push(...ingressEvents(date));
  out.push(...stationEvents(date));
  const v = vocEvent(date);
  if (v) out.push(v);
  // Aspects + cazimi between transiting planets (closest-to-exact day only).
  out.push(...aspectEventsOnDay(date));
  return out;
}

/** Range of upcoming events (default: next 30 days). */
export function upcomingEvents(from: Date = new Date(), days = 30): CosmicEvent[] {
  const out: CosmicEvent[] = [];
  for (let i = 0; i < days; i++) {
    out.push(...eventsOnDay(addDays(from, i)));
  }
  return out;
}