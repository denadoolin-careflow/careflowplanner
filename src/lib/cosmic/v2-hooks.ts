/**
 * Cosmic Flow v2 client hooks — chart cache, daily guidance, chapters,
 * journal insights, transit interpretations.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { aiInvoke } from "@/lib/ai-invoke";
import { computeNatalV2, hashBirth, type BirthInputV2, type NatalChartV2 } from "@/lib/cosmic/chart";
import { computeProgressions, progressedMoonNextIngress } from "@/lib/cosmic/astro/progressions";
import { nextSolarReturn, nextLunarReturn, nextSaturnReturn, nextJupiterReturn } from "@/lib/cosmic/astro/returns";
import { computeProfection, houseTopics } from "@/lib/cosmic/astro/profections";
import { eclipseActivations } from "@/lib/cosmic/astro/eclipses";
import { getTransitsForDate } from "@/lib/transits";
import { getMoonPhase, getIllumination } from "@/lib/moon";
import { bodySign } from "@/lib/cosmic/astro/bodies";

/* ---------- Chart (cached) ---------- */
export function useNatalChart(birth: BirthInputV2 | null) {
  const chart = useMemo(() => birth ? computeNatalV2(birth) : null, [birth]);
  // Background: persist to chart cache table
  useEffect(() => {
    if (!birth || !chart) return;
    const hash = hashBirth(birth);
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      await (supabase as any).from("cosmic_chart_cache").upsert({
        user_id: u.user.id, birth_hash: hash, chart, computed_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    })();
  }, [birth, chart]);
  return chart;
}

/* ---------- Daily guidance ---------- */
export interface DailyGuidance {
  guidance_date: string;
  headline: string;
  body: string;
  suggested_actions: string[];
  gentle_reminder?: string;
  journal_prompt?: string;
  mood_tags?: string[];
}

export function useDailyGuidance(chart: NatalChartV2 | null, date: Date = new Date()) {
  const iso = date.toISOString().slice(0, 10);
  const [data, setData] = useState<DailyGuidance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    setLoading(true); setError(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setLoading(false); return; }
      if (!force) {
        const { data: existing } = await (supabase as any)
          .from("cosmic_daily_guidance")
          .select("*").eq("user_id", u.user.id).eq("guidance_date", iso).maybeSingle();
        if (existing) { setData(existing as any); setLoading(false); return; }
      }
      const phase = getMoonPhase(date);
      const moonSign = bodySign("Moon", date);
      const transits = getTransitsForDate(date).map(t => ({ kind: t.kind, planet: t.planet, sign: t.sign, detail: t.detail }));
      const profection = chart?.houses ? computeProfection(new Date(chart.birth.date), chart.houses.ascendantSign, date) : null;
      const prog = chart?.birth ? computeProgressions(new Date(chart.birth.date), date) : null;
      const payload = {
        date: iso,
        active: transits,
        moon: { phase, sign: moonSign, illumination: Math.round(getIllumination(date) * 100) },
        natal: chart ? { sun: chart.planets.find(p => p.body === "Sun")?.sign, moon: chart.planets.find(p => p.body === "Moon")?.sign, ascendant: chart.houses?.ascendantSign, chartRuler: chart.chartRuler } : undefined,
        progressed: prog ? { moonSign: prog.progressedMoon.sign, moonPhase: prog.progressedMoon.lunarPhase, sunSign: prog.progressedSun.sign } : undefined,
        profection: profection ? { house: profection.house, sign: profection.profectedSign, timeLord: profection.timeLord, topics: houseTopics(profection.house) } : undefined,
      };
      const { data: ai, error: err } = await aiInvoke("ai-cosmic-daily", { body: payload });
      if (err || !ai) { setError("Couldn't generate guidance right now."); setLoading(false); return; }
      const row = {
        user_id: u.user.id,
        guidance_date: iso,
        headline: (ai as any).headline ?? "Today's Cosmic Guidance",
        body: (ai as any).body ?? "",
        suggested_actions: (ai as any).suggested_actions ?? [],
        gentle_reminder: (ai as any).gentle_reminder ?? null,
        journal_prompt: (ai as any).journal_prompt ?? null,
        mood_tags: (ai as any).mood_tags ?? [],
        source_signals: payload,
      };
      await (supabase as any).from("cosmic_daily_guidance").upsert(row, { onConflict: "user_id,guidance_date" });
      setData(row as any);
    } finally { setLoading(false); }
  }, [iso, chart, date]);

  useEffect(() => { void refresh(false); }, [refresh]);
  return { data, loading, error, refresh };
}

/* ---------- Chapter ---------- */
export interface Chapter {
  id?: string;
  chapter_theme: string;
  summary: string;
  characters: string[];
  lessons: string[];
  practices: string[];
  reflection_prompt?: string;
  valid_from: string;
  valid_to: string;
  generated_at?: string;
}

export function useCurrentChapter(chart: NatalChartV2 | null) {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    setLoading(true); setError(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setLoading(false); return; }
      const today = new Date();
      const todayISO = today.toISOString().slice(0, 10);
      if (!force) {
        const { data: existing } = await (supabase as any)
          .from("cosmic_chapters").select("*")
          .eq("user_id", u.user.id).gte("valid_to", todayISO)
          .order("valid_from", { ascending: false }).limit(1).maybeSingle();
        if (existing) { setChapter(existing as any); setLoading(false); return; }
      }
      const birthD = chart?.birth ? new Date(chart.birth.date) : new Date();
      const prof = chart?.houses ? computeProfection(birthD, chart.houses.ascendantSign, today) : null;
      const prog = chart?.birth ? computeProgressions(birthD, today) : null;
      const transits = getTransitsForDate(today).map(t => ({ label: t.label, detail: t.detail }));
      const natalLons = chart?.planets.map(p => p.longitude) ?? [];
      const eclipses = eclipseActivations(natalLons, today);

      // Journal themes — pull recent ones if available
      const { data: themes } = await (supabase as any)
        .from("cosmic_journal_themes").select("themes").eq("user_id", u.user.id)
        .order("period_end", { ascending: false }).limit(1).maybeSingle();
      const journalThemes = (themes?.themes ?? []) as string[];

      const payload = {
        natal: chart ? {
          sun: chart.planets.find(p => p.body === "Sun")?.sign,
          moon: chart.planets.find(p => p.body === "Moon")?.sign,
          ascendant: chart.houses?.ascendantSign,
          chartRuler: chart.chartRuler,
          dominantElement: chart.dominants.dominantElement,
          dominantModality: chart.dominants.dominantModality,
        } : {},
        transits,
        progressed: prog ? { moonSign: prog.progressedMoon.sign, moonPhase: prog.progressedMoon.lunarPhase, sunSign: prog.progressedSun.sign, solarArc: prog.solarArc } : {},
        profection: prof ? { house: prof.house, sign: prof.profectedSign, timeLord: prof.timeLord, topics: houseTopics(prof.house) } : {},
        returns: {
          nextSolarReturn: nextSolarReturn(birthD, today)?.toISOString().slice(0, 10) ?? null,
          nextSaturnReturn: nextSaturnReturn(birthD, today)?.toISOString().slice(0, 10) ?? null,
          nextJupiterReturn: nextJupiterReturn(birthD, today)?.toISOString().slice(0, 10) ?? null,
        },
        eclipses,
        journalThemes,
      };
      const { data: ai, error: err } = await aiInvoke("ai-cosmic-chapter", { body: payload });
      if (err || !ai) { setError("Couldn't generate chapter right now."); setLoading(false); return; }
      const validFrom = todayISO;
      const validTo = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
      const row = {
        user_id: u.user.id,
        chapter_theme: (ai as any).chapter_theme ?? "Your Current Chapter",
        summary: (ai as any).summary ?? "",
        characters: (ai as any).characters ?? [],
        lessons: (ai as any).lessons ?? [],
        practices: (ai as any).practices ?? [],
        reflection_prompt: (ai as any).reflection_prompt ?? null,
        source_signals: payload,
        valid_from: validFrom,
        valid_to: validTo,
      };
      const { data: inserted } = await (supabase as any).from("cosmic_chapters").insert(row).select("*").maybeSingle();
      setChapter((inserted ?? row) as any);
    } finally { setLoading(false); }
  }, [chart]);

  useEffect(() => { if (chart) void refresh(false); }, [chart, refresh]);
  return { chapter, loading, error, refresh };
}

/* ---------- Transit interpretation (lazy + cached) ---------- */
export async function fetchTransitInterpretation(eventId: string, payload: any) {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return null;
  const { data: existing } = await (supabase as any)
    .from("cosmic_transit_interpretations").select("*")
    .eq("user_id", u.user.id).eq("event_id", eventId).maybeSingle();
  if (existing) return existing;
  const { data: ai, error: err } = await aiInvoke("ai-cosmic-transit", { body: payload });
  if (err || !ai) return null;
  const row = {
    user_id: u.user.id, event_id: eventId,
    technical: (ai as any).technical ?? "",
    meaning: (ai as any).meaning ?? "",
    emotional: (ai as any).emotional ?? "",
    practical: (ai as any).practical ?? "",
    growth: (ai as any).growth ?? "",
    careflow: (ai as any).careflow ?? { tasks: [], habits: [], routines: [], journaling: [] },
  };
  await (supabase as any).from("cosmic_transit_interpretations").upsert(row, { onConflict: "user_id,event_id" });
  return row;
}

/* ---------- Journal insights ---------- */
export interface JournalInsights {
  themes: string[]; patterns: string[]; breakthroughs: string[];
  reflection_prompt?: string; entry_count: number;
  period_start?: string; period_end?: string;
}

export function useJournalInsights() {
  const [insights, setInsights] = useState<JournalInsights | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const today = new Date();
      const periodStart = new Date(today.getTime() - 90 * 86400000).toISOString().slice(0, 10);
      const periodEnd = today.toISOString().slice(0, 10);
      if (!force) {
        const { data: existing } = await (supabase as any)
          .from("cosmic_journal_themes").select("*").eq("user_id", u.user.id)
          .order("period_end", { ascending: false }).limit(1).maybeSingle();
        if (existing && existing.period_end === periodEnd) { setInsights(existing as any); return; }
      }
      const { data: entries } = await (supabase as any)
        .from("journal_entries").select("created_at,body")
        .eq("user_id", u.user.id).gte("created_at", periodStart)
        .order("created_at", { ascending: false }).limit(60);
      const entryList = (entries ?? []).map((e: any) => ({ date: String(e.created_at).slice(0, 10), text: String(e.body ?? "") }));
      const transits = getTransitsForDate(today).map(t => t.label);
      const { data: ai } = await aiInvoke("ai-cosmic-journal-insights", { body: { entries: entryList, activeTransits: transits } });
      if (!ai) return;
      const row = {
        user_id: u.user.id,
        period_start: periodStart, period_end: periodEnd,
        themes: (ai as any).themes ?? [],
        patterns: (ai as any).patterns ?? [],
        breakthroughs: (ai as any).breakthroughs ?? [],
        reflection_prompt: (ai as any).reflection_prompt ?? null,
        entry_count: entryList.length,
      };
      await (supabase as any).from("cosmic_journal_themes").insert(row);
      setInsights(row as any);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(false); }, [refresh]);
  return { insights, loading, refresh };
}