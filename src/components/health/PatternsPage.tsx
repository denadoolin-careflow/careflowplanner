import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, type CyclePhase } from "@/lib/cycle";
import { TrendingUp, Heart, Sparkles, Moon } from "lucide-react";

const RANGES = [
  { key: 14, label: "14d" },
  { key: 30, label: "30d" },
  { key: 90, label: "90d" },
] as const;

const PHASE_COLORS: Record<CyclePhase, string> = {
  menstrual: "hsl(0 60% 60%)",
  follicular: "hsl(45 70% 60%)",
  ovulatory: "hsl(145 50% 50%)",
  luteal: "hsl(280 40% 60%)",
};

type MentalLog = {
  date: string;
  mood_score: number | null;
  anxiety: number | null;
  focus: number | null;
  sensory_load: number | null;
  emotions: string[] | null;
  gratitude: string | null;
  support_needed: string | null;
  intention: string | null;
};

type CheckIn = {
  date: string;
  mood: string | null;
  stress: string | null;
  sleep_hours: number | null;
  mindfulness_minutes: number | null;
  intention: string | null;
};

const STRESS_VAL: Record<string, number> = { calm: 1, mild: 2, tense: 3, high: 4 };
const MOOD_VAL: Record<string, number> = { rough: 1, low: 2, ok: 3, good: 4, great: 5 };

const METRIC_META: Record<string, { label: string; color: string; high: string; low: string }> = {
  mood:    { label: "Mood",    color: "hsl(145 50% 50%)", high: "brighter", low: "lower" },
  anxiety: { label: "Anxiety", color: "hsl(20 70% 60%)",  high: "higher",  low: "calmer" },
  focus:   { label: "Focus",   color: "hsl(220 60% 60%)", high: "sharper", low: "fuzzier" },
  sleep:   { label: "Sleep",   color: "hsl(265 50% 65%)", high: "longer",  low: "shorter" },
  stress:  { label: "Stress",  color: "hsl(0 60% 60%)",   high: "tenser",  low: "calmer" },
};

function strengthLabel(r: number) {
  const a = Math.abs(r);
  if (a >= 0.7) return "strong";
  if (a >= 0.4) return "moderate";
  if (a >= 0.2) return "gentle";
  return "faint";
}

function CorrelationCard({ a, b, r, n, rank }: { a: string; b: string; r: number; n: number; rank: number }) {
  const ma = METRIC_META[a], mb = METRIC_META[b];
  const positive = r >= 0;
  const pct = Math.round(Math.abs(r) * 100);
  const phrase = positive
    ? `When ${ma.label.toLowerCase()} is ${ma.high}, ${mb.label.toLowerCase()} tends to be ${mb.high}.`
    : `When ${ma.label.toLowerCase()} is ${ma.high}, ${mb.label.toLowerCase()} tends to be ${mb.low}.`;
  return (
    <div
      className="rounded-2xl border border-border/50 bg-card/70 p-4"
      style={{ borderLeft: `3px solid ${positive ? ma.color : mb.color}` }}
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>#{rank} · {strengthLabel(r)}</span>
        <span>{n} days</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Pill label={ma.label} color={ma.color} />
        <span className="text-xs text-muted-foreground">{positive ? "↗ moves with" : "↘ moves opposite"}</span>
        <Pill label={mb.label} color={mb.color} />
      </div>
      <p className="mt-2 text-sm leading-snug">{phrase}</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: positive ? ma.color : mb.color }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground/80">
        r = {r >= 0 ? "+" : ""}{r.toFixed(2)}
      </p>
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  );
}

export default function PatternsPage({ uid }: { uid: string }) {
  const { periods, settings } = useCycle();
  const [range, setRange] = useState<14 | 30 | 90>(30);
  const [mental, setMental] = useState<MentalLog[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);

  useEffect(() => {
    const since = new Date(); since.setDate(since.getDate() - range);
    const sinceIso = since.toISOString().slice(0, 10);
    Promise.all([
      supabase.from("mental_health_logs").select("date, mood_score, anxiety, focus, sensory_load, emotions, gratitude, support_needed, intention")
        .eq("user_id", uid).gte("date", sinceIso).order("date"),
      supabase.from("health_checkins").select("date, mood, stress, sleep_hours, mindfulness_minutes, intention")
        .eq("user_id", uid).gte("date", sinceIso).order("date"),
    ]).then(([m, c]) => {
      setMental((m.data as MentalLog[]) ?? []);
      setCheckins((c.data as CheckIn[]) ?? []);
    });
  }, [uid, range]);

  // ------ Combined daily trend ------
  const trend = useMemo(() => {
    const days: any[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const m = mental.find(x => x.date === iso);
      const c = checkins.find(x => x.date === iso);
      days.push({
        date: iso.slice(5),
        mood: m?.mood_score ?? (c?.mood ? MOOD_VAL[c.mood] : null),
        anxiety: m?.anxiety ?? null,
        focus: m?.focus ?? null,
        stress: c?.stress ? STRESS_VAL[c.stress] : null,
      });
    }
    return days;
  }, [mental, checkins, range]);

  // ------ Emotion frequency ------
  const emotionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mental.forEach(m => (m.emotions ?? []).forEach(e => { counts[e] = (counts[e] || 0) + 1; }));
    return Object.entries(counts).map(([emotion, count]) => ({ emotion, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [mental]);

  // ------ By cycle phase ------
  const byPhase = useMemo(() => {
    if (!settings.enabled) return null;
    const buckets: Record<CyclePhase, { mood: number[]; anxiety: number[]; stress: number[]; emotions: Record<string, number> }> = {
      menstrual: { mood: [], anxiety: [], stress: [], emotions: {} },
      follicular: { mood: [], anxiety: [], stress: [], emotions: {} },
      ovulatory: { mood: [], anxiety: [], stress: [], emotions: {} },
      luteal: { mood: [], anxiety: [], stress: [], emotions: {} },
    };
    const phaseFor = (iso: string) => {
      const d = new Date(iso + "T00:00:00");
      return getPhaseInfo(d, periods, settings)?.phase ?? null;
    };
    mental.forEach(m => {
      const p = phaseFor(m.date); if (!p) return;
      if (m.mood_score != null) buckets[p].mood.push(m.mood_score);
      if (m.anxiety != null) buckets[p].anxiety.push(m.anxiety);
      (m.emotions ?? []).forEach(e => { buckets[p].emotions[e] = (buckets[p].emotions[e] || 0) + 1; });
    });
    checkins.forEach(c => {
      const p = phaseFor(c.date); if (!p) return;
      if (c.mood && MOOD_VAL[c.mood]) buckets[p].mood.push(MOOD_VAL[c.mood]);
      if (c.stress && STRESS_VAL[c.stress]) buckets[p].stress.push(STRESS_VAL[c.stress]);
    });
    const avg = (a: number[]) => a.length ? Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10 : 0;
    return (Object.keys(buckets) as CyclePhase[]).map(phase => ({
      phase: phase[0].toUpperCase() + phase.slice(1),
      key: phase,
      mood: avg(buckets[phase].mood),
      anxiety: avg(buckets[phase].anxiety),
      stress: avg(buckets[phase].stress),
      topEmotion: Object.entries(buckets[phase].emotions).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
      logs: buckets[phase].mood.length + buckets[phase].stress.length,
    }));
  }, [mental, checkins, periods, settings]);

  // ------ Intentions / gratitude / support log ------
  const intentions = useMemo(() => {
    return mental
      .filter(m => m.gratitude || m.support_needed)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [mental]);

  // ------ Correlations across mood / anxiety / focus / sleep / stress ------
  const correlations = useMemo(() => {
    const byDate = new Map<string, { mood?: number; anxiety?: number; focus?: number; sleep?: number; stress?: number }>();
    mental.forEach(m => {
      const row = byDate.get(m.date) ?? {};
      if (m.mood_score != null) row.mood = m.mood_score;
      if (m.anxiety != null) row.anxiety = m.anxiety;
      if (m.focus != null) row.focus = m.focus;
      byDate.set(m.date, row);
    });
    checkins.forEach(c => {
      const row = byDate.get(c.date) ?? {};
      if (row.mood == null && c.mood && MOOD_VAL[c.mood]) row.mood = MOOD_VAL[c.mood];
      if (c.stress && STRESS_VAL[c.stress]) row.stress = STRESS_VAL[c.stress];
      if (c.sleep_hours != null) row.sleep = Number(c.sleep_hours);
      byDate.set(c.date, row);
    });
    const rows = Array.from(byDate.values());
    const metrics = ["mood", "anxiety", "focus", "sleep", "stress"] as const;
    type M = (typeof metrics)[number];

    const pearson = (a: number[], b: number[]) => {
      const n = a.length;
      if (n < 4) return null;
      const ma = a.reduce((s, x) => s + x, 0) / n;
      const mb = b.reduce((s, x) => s + x, 0) / n;
      let num = 0, da = 0, db = 0;
      for (let i = 0; i < n; i++) {
        const xa = a[i] - ma, xb = b[i] - mb;
        num += xa * xb; da += xa * xa; db += xb * xb;
      }
      const denom = Math.sqrt(da * db);
      if (denom === 0) return null;
      return num / denom;
    };

    const pairs: { a: M; b: M; r: number; n: number }[] = [];
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const a = metrics[i], b = metrics[j];
        const xs: number[] = [], ys: number[] = [];
        rows.forEach(r => {
          if (r[a] != null && r[b] != null) { xs.push(r[a]!); ys.push(r[b]!); }
        });
        const r = pearson(xs, ys);
        if (r != null) pairs.push({ a, b, r, n: xs.length });
      }
    }
    return pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  }, [mental, checkins]);

  const topCorrelations = correlations.slice(0, 3);

  // ------ Intention patterns over time ------
  const intentionTimeline = useMemo(() => {
    const map = new Map<string, { date: string; checkin?: string; mental?: string }>();
    checkins.forEach(c => {
      if (!c.intention) return;
      const row = map.get(c.date) ?? { date: c.date };
      row.checkin = c.intention;
      map.set(c.date, row);
    });
    mental.forEach(m => {
      if (!m.intention) return;
      const row = map.get(m.date) ?? { date: m.date };
      row.mental = m.intention;
      map.set(m.date, row);
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [mental, checkins]);

  const intentionWords = useMemo(() => {
    const stop = new Set(["the","a","an","to","of","and","with","in","on","for","my","be","is","i","am","this","that","at","it","as","by","from","but","or","so","do","not"]);
    const counts: Record<string, number> = {};
    intentionTimeline.forEach(r => {
      const txt = [r.checkin, r.mental].filter(Boolean).join(" ").toLowerCase();
      txt.replace(/[^\p{L}\s']/gu, " ").split(/\s+/).forEach(w => {
        const word = w.trim();
        if (word.length < 3 || stop.has(word)) return;
        counts[word] = (counts[word] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [intentionTimeline]);

  const intentionFlow = useMemo(() => {
    const days: { date: string; count: number; label: string; intentions: string[] }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const row = intentionTimeline.find(r => r.date === iso);
      const arr = [row?.checkin, row?.mental].filter(Boolean) as string[];
      days.push({ date: iso, label: iso.slice(5), count: arr.length, intentions: arr });
    }
    return days;
  }, [intentionTimeline, range]);

  // Radar data for phase × wellbeing
  const radarData = useMemo(() => {
    if (!byPhase) return [];
    return byPhase.map(p => ({ phase: p.phase, Mood: p.mood, Calm: 5 - p.anxiety, Ease: 5 - p.stress }));
  }, [byPhase]);

  const totalEntries = mental.length + checkins.length;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="cozy-card p-6" style={{ background: "linear-gradient(160deg, hsl(145 32% 95%) 0%, hsl(40 45% 96%) 100%)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card/70">
              <TrendingUp className="h-5 w-5 text-primary/70" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Patterns & reflections</p>
              <h2 className="font-display text-3xl">Your inner weather</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Soft trends from your check-ins and reflections. {totalEntries} entries in this window.
              </p>
            </div>
          </div>
          <div className="flex gap-1 rounded-full bg-card/60 p-1">
            {RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => setRange(r.key as 14 | 30 | 90)}
                className={`rounded-full px-3 py-1 text-xs transition-all ${range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {totalEntries === 0 ? (
        <div className="cozy-card p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-primary/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            Log a few check-ins or mental health reflections, then your patterns will bloom here.
          </p>
        </div>
      ) : (
        <>
          {/* Trend chart */}
          <div className="cozy-card p-5">
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Mood · Anxiety · Focus over time</p>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="mood" stroke="hsl(145 50% 50%)" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="anxiety" stroke="hsl(20 70% 60%)" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="focus" stroke="hsl(220 60% 60%)" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Correlation insights */}
          <div className="cozy-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary/70" />
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Strongest relationships · last {range} days
              </p>
            </div>
            {topCorrelations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Log a few more paired check-ins and reflections to surface patterns.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {topCorrelations.map((c, i) => (
                  <CorrelationCard key={`${c.a}-${c.b}`} rank={i + 1} {...c} />
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] italic text-muted-foreground/80">
              Soft observations, not diagnoses. Patterns need {`>`}4 paired days to appear.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Emotion frequency */}
            <div className="cozy-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary/70" />
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Most-felt emotions</p>
              </div>
              {emotionCounts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No emotions tagged yet.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={emotionCounts} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="emotion" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Phase radar */}
            <div className="cozy-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Moon className="h-4 w-4 text-primary/70" />
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Wellbeing by cycle phase</p>
              </div>
              {!byPhase ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Enable cyclical tracking to see phase patterns.</p>
              ) : radarData.every(d => d.Mood === 0 && d.Calm === 5 && d.Ease === 5) ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Not enough logs across phases yet.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="phase" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }} angle={90} />
                      <Radar name="Mood" dataKey="Mood" stroke="hsl(145 50% 50%)" fill="hsl(145 50% 50%)" fillOpacity={0.3} />
                      <Radar name="Calm" dataKey="Calm" stroke="hsl(195 50% 55%)" fill="hsl(195 50% 55%)" fillOpacity={0.2} />
                      <Radar name="Ease" dataKey="Ease" stroke="hsl(40 60% 60%)" fill="hsl(40 60% 60%)" fillOpacity={0.2} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Phase cards */}
          {byPhase && (
            <div className="cozy-card p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Phase signatures</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {byPhase.map(p => (
                  <div
                    key={p.key}
                    className="rounded-2xl border border-border/40 bg-card/60 p-4"
                    style={{ borderLeft: `3px solid ${PHASE_COLORS[p.key as CyclePhase]}` }}
                  >
                    <p className="font-display text-lg">{p.phase}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.logs} entries</p>
                    <div className="mt-3 space-y-1 text-xs">
                      <Row label="Mood" value={p.mood} max={5} />
                      <Row label="Anxiety" value={p.anxiety} max={5} />
                      <Row label="Stress" value={p.stress} max={4} />
                    </div>
                    <p className="mt-3 text-[11px] capitalize text-muted-foreground">
                      Most-felt: <span className="font-medium text-foreground/80">{p.topEmotion}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Intention patterns over time */}
          {intentionTimeline.length > 0 && (
            <div className="cozy-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary/70" />
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Intention patterns · last {range} days
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Days you set an intention</p>
                  <div className="flex h-20 items-end gap-1">
                    {intentionFlow.map(d => (
                      <div
                        key={d.date}
                        title={d.intentions.length ? `${d.date}: ${d.intentions.join(" · ")}` : d.date}
                        className="flex-1 rounded-t-md transition-all"
                        style={{
                          height: d.count ? `${30 + d.count * 35}%` : "6%",
                          background: d.count
                            ? `hsl(145 50% ${65 - d.count * 8}%)`
                            : "hsl(var(--muted))",
                          minHeight: 4,
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>{intentionFlow[0]?.label}</span>
                    <span>{intentionFlow[intentionFlow.length - 1]?.label}</span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {intentionTimeline.length} of {range} days held an intention
                    {intentionTimeline.length > 0 && (
                      <> · {Math.round((intentionTimeline.length / range) * 100)}% consistency</>
                    )}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Recurring words</p>
                  {intentionWords.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground/70">Not enough to chart yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {intentionWords.map(w => (
                        <span
                          key={w.word}
                          className="rounded-full bg-primary/10 px-3 py-1 text-xs"
                          style={{ fontSize: `${11 + Math.min(w.count, 5)}px` }}
                        >
                          {w.word}
                          <span className="ml-1 text-muted-foreground">×{w.count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <ol className="mt-5 space-y-2 border-t border-border/40 pt-4">
                {intentionTimeline.slice(0, 8).map(r => (
                  <li key={r.date} className="flex gap-3 text-sm">
                    <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {r.date.slice(5)}
                    </span>
                    <div className="flex-1 space-y-1">
                      {r.checkin && <p>🌿 <span className="italic">{r.checkin}</span></p>}
                      {r.mental && <p>💭 <span className="italic">{r.mental}</span></p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Intentions / gratitude scroll */}
          {intentions.length > 0 && (
            <div className="cozy-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary/70" />
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Recent gratitude & support</p>
              </div>
              <ul className="space-y-2">
                {intentions.map(i => (
                  <li key={i.date} className="rounded-xl bg-muted/40 px-4 py-3 text-sm">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{i.date}</p>
                    {i.gratitude && <p className="mt-1 italic">✨ {i.gratitude}</p>}
                    {i.support_needed && <p className="mt-1 text-muted-foreground">💚 {i.support_needed}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span><span>{value || "–"}</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}