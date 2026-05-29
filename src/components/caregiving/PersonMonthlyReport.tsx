import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, Download, Trophy, AlertTriangle, Target, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { aiInvoke } from "@/lib/ai-invoke";
import { useProgressEntries, useProgressGoals, CATEGORY_LABEL } from "@/lib/person-progress";
import { checkinsStore, useCheckins, type CheckinResponse } from "@/lib/checkins";
import { useStore } from "@/lib/store";
import type { CareRecipient } from "@/lib/types";
import { addMonths, startOfMonth, endOfMonth, format, parseISO, isWithinInterval } from "date-fns";
import { toast } from "sonner";

interface ReportPayload {
  headline?: string;
  summary?: string;
  highlights?: { title: string; detail: string }[];
  concerns?: { title: string; detail: string }[];
  moodInsight?: string;
  checkinInsight?: string;
  suggestedGoals?: { title: string; category: string; why: string; firstStep: string; targetWindow: string }[];
  caregiverNote?: string;
}

function ageFrom(birth?: string): number | null {
  if (!birth) return null;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)));
}

function cacheKey(recipientId: string, monthIso: string) {
  return `monthly-report:${recipientId}:${monthIso}`;
}

export function PersonMonthlyReport({ recipient }: { recipient: CareRecipient }) {
  const { state } = useStore();
  const entries = useProgressEntries();
  const goals = useProgressGoals();
  const checkins = useCheckins();

  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [responses, setResponses] = useState<CheckinResponse[]>([]);
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingGoalIdx, setAddingGoalIdx] = useState<number | null>(null);

  const monthStart = monthAnchor;
  const monthEnd = endOfMonth(monthAnchor);
  const monthIso = format(monthStart, "yyyy-MM");
  const monthLabel = format(monthStart, "MMMM yyyy");

  // Load cached report from localStorage
  useEffect(() => {
    setError(null);
    try {
      const raw = localStorage.getItem(cacheKey(recipient.id, monthIso));
      if (raw) {
        const parsed = JSON.parse(raw);
        setPayload(parsed.payload ?? null);
        setGeneratedAt(parsed.generatedAt ?? null);
      } else {
        setPayload(null); setGeneratedAt(null);
      }
    } catch { setPayload(null); setGeneratedAt(null); }
  }, [recipient.id, monthIso]);

  // Pull all check-in responses for this recipient
  useEffect(() => {
    let cancelled = false;
    checkinsStore.listResponsesByRecipient(recipient.id, 500).then(r => {
      if (!cancelled) setResponses(r);
    });
    return () => { cancelled = true; };
  }, [recipient.id, checkins.length]);

  // Aggregate data for the selected month
  const aggregate = useMemo(() => {
    const inMonth = (iso: string) => {
      try { return isWithinInterval(parseISO(iso), { start: monthStart, end: monthEnd }); } catch { return false; }
    };
    const myEntries = entries.filter(e => e.recipient_id === recipient.id && inMonth(e.recorded_at));
    const myGoals = goals.filter(g => g.recipient_id === recipient.id);
    const myResp = responses.filter(r => inMonth(r.responded_at));

    const totals: Record<string, number> = {};
    myEntries.forEach(e => { totals[e.category] = (totals[e.category] ?? 0) + 1; });

    const milestones = myEntries
      .filter(e => e.category === "milestone")
      .slice(0, 12)
      .map(e => ({ label: e.label, date: e.recorded_at, notes: e.notes }));

    const moodNums = myEntries.filter(e => e.category === "mood" && e.value_numeric != null).map(e => e.value_numeric!);
    const moodAvg = moodNums.length ? Math.round((moodNums.reduce((a, b) => a + b, 0) / moodNums.length) * 10) / 10 : null;

    const healthCounts: Record<string, number> = {};
    myEntries.filter(e => e.category === "health").forEach(e => {
      healthCounts[e.label] = (healthCounts[e.label] ?? 0) + 1;
    });

    const moods = myResp.map(r => r.mood).filter((v): v is number => v != null);
    const energies = myResp.map(r => r.energy).filter((v): v is number => v != null);
    const moodAvgCi = moods.length ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10 : null;
    const energyAvg = energies.length ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10 : null;

    const tagCounts: Record<string, number> = {};
    myResp.forEach(r => (r.tags ?? []).forEach(t => { tagCounts[t] = (tagCounts[t] ?? 0) + 1; }));
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, count]) => ({ tag, count }));

    const notes = myResp.map(r => r.notes).filter((n): n is string => !!n && n.trim().length > 0).slice(0, 20);

    return {
      entryCount: myEntries.length,
      progress: { totals, recentMilestones: milestones, moodAvg, healthCounts },
      goals: myGoals.map(g => ({ title: g.title, status: g.status, current: g.current_value, target: g.target_value, unit: g.unit })),
      checkins: { count: myResp.length, moodAvg: moodAvgCi, energyAvg, topTags, notes },
    };
  }, [entries, goals, responses, recipient.id, monthStart, monthEnd]);

  const hasAnyData = aggregate.entryCount > 0 || aggregate.checkins.count > 0 || aggregate.goals.length > 0;

  const generate = useCallback(async () => {
    setGenerating(true); setError(null);
    try {
      const age = ageFrom(recipient.birthDate);
      const { data, error: err, quotaExceeded } = await aiInvoke<{ payload: ReportPayload; generatedAt: string }>(
        "ai-monthly-report",
        {
          body: {
            recipient: {
              id: recipient.id,
              name: recipient.name,
              kind: recipient.kind,
              age,
              zodiac: recipient.zodiac ?? null,
              diagnoses: recipient.diagnoses ?? [],
              diagnosisNotes: recipient.diagnosisNotes ?? null,
              notes: recipient.notes ?? null,
            },
            monthLabel,
            rangeStart: monthStart.toISOString(),
            rangeEnd: monthEnd.toISOString(),
            progress: aggregate.progress,
            goals: aggregate.goals,
            checkins: aggregate.checkins,
          },
        },
      );
      if (quotaExceeded) return;
      if (err) { setError(String((err as any)?.message ?? err)); return; }
      if (data?.payload) {
        setPayload(data.payload);
        const ts = data.generatedAt ?? new Date().toISOString();
        setGeneratedAt(ts);
        try {
          localStorage.setItem(cacheKey(recipient.id, monthIso), JSON.stringify({ payload: data.payload, generatedAt: ts }));
        } catch { /* storage full */ }
      }
    } catch (e) {
      setError(String((e as any)?.message ?? e));
    } finally {
      setGenerating(false);
    }
  }, [recipient, monthLabel, monthStart, monthEnd, monthIso, aggregate]);

  const addAsGoal = useCallback(async (idx: number) => {
    const g = payload?.suggestedGoals?.[idx];
    if (!g) return;
    setAddingGoalIdx(idx);
    try {
      const { progressStore } = await import("@/lib/person-progress");
      const cat = ["milestone","skill","mood","health","behavior","custom"].includes(g.category) ? g.category as any : "custom";
      await progressStore.upsertGoal({
        recipient_id: recipient.id,
        title: g.title,
        category: cat,
        notes: `${g.why}\n\nFirst step: ${g.firstStep}\nTarget: ${g.targetWindow}`,
        status: "active",
      });
      toast.success(`Added "${g.title}" to goals`);
    } catch (e: any) {
      toast.error("Could not add goal: " + (e?.message ?? e));
    } finally {
      setAddingGoalIdx(null);
    }
  }, [payload, recipient.id]);

  const downloadMarkdown = useCallback(() => {
    if (!payload) return;
    const lines: string[] = [];
    lines.push(`# Monthly report — ${recipient.name}`);
    lines.push(`_${monthLabel}_`);
    if (payload.headline) lines.push(`\n> ${payload.headline}`);
    if (payload.summary) lines.push(`\n## Summary\n${payload.summary}`);
    if (payload.highlights?.length) {
      lines.push(`\n## Highlights`);
      payload.highlights.forEach(h => lines.push(`- **${h.title}** — ${h.detail}`));
    }
    if (payload.concerns?.length) {
      lines.push(`\n## Concerns`);
      payload.concerns.forEach(c => lines.push(`- **${c.title}** — ${c.detail}`));
    }
    if (payload.moodInsight) lines.push(`\n## Mood & energy\n${payload.moodInsight}`);
    if (payload.checkinInsight) lines.push(`\n## Check-ins\n${payload.checkinInsight}`);
    if (payload.suggestedGoals?.length) {
      lines.push(`\n## Suggested next goals`);
      payload.suggestedGoals.forEach(g => {
        lines.push(`- **${g.title}** _(${g.category} · ${g.targetWindow})_`);
        lines.push(`  - Why: ${g.why}`);
        lines.push(`  - First step: ${g.firstStep}`);
      });
    }
    if (payload.caregiverNote) lines.push(`\n---\n_${payload.caregiverNote}_`);
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${recipient.name.replace(/\s+/g, "-")}-${monthIso}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }, [payload, recipient.name, monthLabel, monthIso]);

  const stamp = generatedAt ? new Date(generatedAt).toLocaleString() : null;
  const isCurrentMonth = monthIso === format(new Date(), "yyyy-MM");

  return (
    <div className="space-y-5">
      <div className="cozy-card gradient-warm p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Monthly report</div>
            <h3 className="mt-1 font-display text-2xl font-semibold leading-tight">{recipient.name} · {monthLabel}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {aggregate.entryCount} progress entries · {aggregate.checkins.count} check-ins · {aggregate.goals.length} active goals
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full border bg-card/60 p-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setMonthAnchor(m => addMonths(m, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs">{format(monthStart, "MMM yyyy")}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setMonthAnchor(m => addMonths(m, 1))} disabled={isCurrentMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {payload && (
              <Button variant="outline" size="sm" className="rounded-full" onClick={downloadMarkdown}>
                <Download className="mr-1.5 h-4 w-4" /> Export
              </Button>
            )}
            <Button onClick={generate} disabled={generating || !hasAnyData} className="rounded-full">
              {generating ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              {payload ? "Regenerate" : "Generate"}
            </Button>
          </div>
        </div>
        {stamp && <p className="mt-3 text-[11px] text-muted-foreground">Generated {stamp}</p>}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>

      {!hasAnyData && (
        <SectionCard title="Nothing logged yet for this month" accent="calm">
          <p className="text-sm text-muted-foreground">
            Log progress entries and complete a few check-ins, then return here to generate {recipient.name}'s monthly report.
          </p>
        </SectionCard>
      )}

      {hasAnyData && (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="Progress at a glance" accent="sage">
            <ul className="space-y-1.5 text-sm">
              {Object.entries(aggregate.progress.totals).length === 0 ? (
                <li className="text-muted-foreground">No entries logged.</li>
              ) : Object.entries(aggregate.progress.totals).map(([cat, n]) => (
                <li key={cat} className="flex justify-between rounded-lg bg-muted/40 px-3 py-1.5">
                  <span>{CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL] ?? cat}</span>
                  <span className="text-xs text-muted-foreground">{n}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard title="Check-ins" accent="calm">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Mood avg</div><div className="font-semibold">{aggregate.checkins.moodAvg ?? "—"}</div></div>
              <div className="rounded-lg bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Energy avg</div><div className="font-semibold">{aggregate.checkins.energyAvg ?? "—"}</div></div>
              <div className="rounded-lg bg-muted/40 p-2 col-span-2"><div className="text-xs text-muted-foreground">Responses</div><div className="font-semibold">{aggregate.checkins.count}</div></div>
            </div>
            {aggregate.checkins.topTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {aggregate.checkins.topTags.map(t => (
                  <span key={t.tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">{t.tag} · {t.count}</span>
                ))}
              </div>
            )}
          </SectionCard>
          <SectionCard title="Active goals" accent="warm">
            {aggregate.goals.length === 0 ? <p className="text-sm text-muted-foreground">No goals tracked yet.</p> : (
              <ul className="space-y-1.5 text-sm">
                {aggregate.goals.slice(0, 6).map((g, i) => (
                  <li key={i} className="rounded-lg bg-muted/40 px-3 py-1.5">
                    <div className="font-medium">{g.title}</div>
                    <div className="text-xs text-muted-foreground">{g.status}{g.target != null ? ` · ${g.current ?? 0}/${g.target}${g.unit ? ` ${g.unit}` : ""}` : ""}</div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}

      {generating && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      )}

      {payload && !generating && (
        <div className="space-y-4">
          {(payload.headline || payload.summary) && (
            <SectionCard title="The month in a glance" accent="calm">
              {payload.headline && <p className="text-base font-medium leading-relaxed">{payload.headline}</p>}
              {payload.summary && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{payload.summary}</p>}
            </SectionCard>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {payload.highlights && payload.highlights.length > 0 && (
              <SectionCard title="Highlights" accent="sage">
                <ul className="space-y-2">
                  {payload.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-sm">
                      <Trophy className="mt-0.5 h-4 w-4 text-secondary-foreground" />
                      <div><span className="font-medium">{h.title}</span><span className="block text-xs text-muted-foreground">{h.detail}</span></div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {payload.concerns && payload.concerns.length > 0 && (
              <SectionCard title="Watch list" accent="warm">
                <ul className="space-y-2">
                  {payload.concerns.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-accent" />
                      <div><span className="font-medium">{c.title}</span><span className="block text-xs text-muted-foreground">{c.detail}</span></div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {payload.moodInsight && (
              <SectionCard title="Mood & energy" accent="calm">
                <p className="text-sm leading-relaxed">{payload.moodInsight}</p>
              </SectionCard>
            )}

            {payload.checkinInsight && (
              <SectionCard title="Check-in patterns" accent="sage">
                <p className="text-sm leading-relaxed">{payload.checkinInsight}</p>
              </SectionCard>
            )}
          </div>

          {payload.suggestedGoals && payload.suggestedGoals.length > 0 && (
            <SectionCard title="Suggested next goals" subtitle="Tap to add to their goal tracker" accent="sage">
              <ul className="grid gap-2 sm:grid-cols-2">
                {payload.suggestedGoals.map((g, i) => (
                  <li key={i} className="rounded-xl bg-muted/40 p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Target className="mt-0.5 h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium">{g.title}</div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{g.category} · {g.targetWindow}</div>
                        <p className="mt-1 text-xs text-muted-foreground">{g.why}</p>
                        <p className="mt-1 text-xs"><span className="font-medium">First step:</span> {g.firstStep}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 w-full rounded-full text-xs"
                      disabled={addingGoalIdx === i}
                      onClick={() => addAsGoal(i)}
                    >
                      {addingGoalIdx === i ? "Adding…" : "Add to goals"}
                    </Button>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {payload.caregiverNote && (
            <SectionCard title="For you, caregiver" accent="warm">
              <p className="flex items-start gap-2 text-sm leading-relaxed">
                <Heart className="mt-0.5 h-4 w-4 text-accent" /> {payload.caregiverNote}
              </p>
            </SectionCard>
          )}
        </div>
      )}

      {/* placeholder to satisfy unused state lint when payload null */}
      {!payload && state.recipients.length === 0 && null}
    </div>
  );
}