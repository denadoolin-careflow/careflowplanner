import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Loader2, RefreshCw, BookOpen, Sparkles, ChevronDown, NotebookPen, CalendarPlus, Crown, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { useNatalChart, useCurrentChapter, useJournalInsights } from "@/lib/cosmic/v2-hooks";
import { NatalWheel } from "@/components/cosmic/NatalWheel";
import { DIGNITY_MEANING } from "@/lib/cosmic/sky";
import { appendToTodaysNote } from "@/lib/astro-suite/tarot-pulls";
import { chapterReading } from "@/lib/cosmic/chapter-context";

const PHASES = ["New", "Crescent", "First Quarter", "Gibbous", "Full", "Disseminating", "Last Quarter", "Balsamic"];
const ord = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

export default function CosmicChapter() {
  const { row, loading: rowLoading } = useBirthChart();
  const birth = useMemo(() => row ? { date: row.birth_date, time: row.birth_time, tz: row.birth_tz, lat: row.birth_lat, lng: row.birth_lng, place: row.birth_place, house_system: "whole-sign" as const } : null,
    [row?.birth_date, row?.birth_time, row?.birth_tz, row?.birth_lat, row?.birth_lng]);
  const chart = useNatalChart(birth);
  const { insights } = useJournalInsights();
  const { addTask } = useStore() as any;

  const year = useMemo(() => {
    if (!chart) return null;
    return chapterReading(chart);
  }, [chart]);
  const { chapter, loading, error, refresh } = useCurrentChapter(chart, year);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-3 pb-28 sm:p-6">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2"><Link to="/cosmic-flow"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
      </header>

      {rowLoading && !row ? (
        <div className="cozy-card p-5 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Reading your year…</div>
      ) : !chart || !year ? (
        <div className="cozy-card p-5 text-sm">
          <p className="font-medium">Add your birth details to read your year.</p>
          <Button asChild size="sm" className="mt-3"><Link to="/cosmic-flow/birth-chart">Add birth chart</Link></Button>
        </div>
      ) : (
        <>
          {/* 1. Summary */}
          <section className="cozy-card p-5 sm:p-6" style={{ borderLeft: "4px solid hsl(var(--primary))" }}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">What to expect this year</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl">A {ord(year.tl.profection.house)}-house year with {year.tl.lord}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">{year.summary.text}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
              <div><p className="text-xs font-medium text-muted-foreground">Lean into</p><ul className="mt-1 ml-4 list-disc">{year.summary.lean.map(x => <li key={x}>{x}</li>)}</ul></div>
              <div><p className="text-xs font-medium text-muted-foreground">Go gently with</p><ul className="mt-1 ml-4 list-disc">{year.summary.gentle.map(x => <li key={x}>{x}</li>)}</ul></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={async () => {
                try { await appendToTodaysNote(`📖 My year ahead — ${year.summary.text}\n\n`); toast.success("Added to today's note"); } catch { toast.error("Couldn't add to today's note"); }
              }}><NotebookPen className="mr-1 h-3.5 w-3.5" />Journal this</Button>
              <Button size="sm" variant="outline" onClick={async () => {
                await addTask?.({ title: `Year focus: ${year.summary.lean[0]}`, cosmic_tag: "chapter" }); toast.success("Added to Planner");
              }}><CalendarPlus className="mr-1 h-3.5 w-3.5" />Send focus to Planner</Button>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {/* 2. Time lord */}
            <Panel icon={<Crown className="h-4 w-4 text-primary" />} title={`Time lord: ${year.tl.lord}`} sub={`Age ${year.tl.profection.age} · ${year.tl.profection.yearStarts} → ${year.tl.profection.yearEnds}`}>
              <p>Your profection has reached the <strong>{ord(year.tl.profection.house)} house</strong> ({year.tl.profection.profectedSign}): {year.tl.topics}.</p>
              <p className="mt-2">{year.tl.lord} rules the year, bringing themes of {year.tl.style}.</p>
              {year.tl.natalSign && <p className="mt-2 text-muted-foreground">In your birth chart {year.tl.lord} sits in {year.tl.natalSign}{year.tl.natalHouse ? ` (house ${year.tl.natalHouse})` : ""}{year.tl.natalDignity ? ` — ${year.tl.natalDignity}: ${DIGNITY_MEANING[year.tl.natalDignity]}` : ""}</p>}
              <div className="mt-3 rounded-xl bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">{year.tl.lord} right now</p>
                <p>Moving through {year.tl.nowSign}, your {ord(year.tl.nowHouse)} house{year.tl.nowRetrograde ? " — retrograde, a time to review rather than push" : ""}.</p>
                {year.tl.aspects.length > 0
                  ? <ul className="mt-1 ml-4 list-disc">{year.tl.aspects.slice(0, 4).map(a => <li key={a.aspect + a.natal}><span className="capitalize">{a.aspect}</span> your natal {a.natal} ({a.orb.toFixed(1)}°) — a moment this year's story comes into focus</li>)}</ul>
                  : <p className="text-muted-foreground">No close contacts to your chart right now — a steady stretch.</p>}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Next year ({year.tl.profection.yearEnds}): {ord(year.tl.next.house)} house, ruled by {year.tl.next.timeLord}.</p>
            </Panel>

            {/* 3. Solar return */}
            <Panel icon={<Sun className="h-4 w-4 text-primary" />} title="Solar return" sub={`Began ${format(year.sr.last, "MMM d, yyyy · h:mm a")} · next in ${year.sr.daysToNext} days`}>
              <p>The Sun lands in your birthday chart's <strong>{ord(year.sr.sunHouse)} house</strong>: {year.sr.sunHouseMeaning} are where this year's energy goes.</p>
              {year.sr.rising && <p className="mt-2">{year.sr.rising} rises in this year's chart — the tone and style you'll meet the year with.</p>}
              <p className="mt-2">The Moon in {year.sr.moonSign} ({ord(year.sr.moonHouse)} house) shows where you'll need emotional care.</p>
              {year.sr.angular.length > 0 && <p className="mt-2">Strong this year (on the chart's angles): <strong>{year.sr.angular.join(", ")}</strong>.</p>}
              {year.sr.usesWholeSignFromSun && <p className="mt-2 text-xs text-muted-foreground">Without a birth place, houses are counted from the Sun's sign — add your birthplace for a fuller reading.</p>}
              <div className="mt-3 max-w-[16rem] mx-auto"><NatalWheel chart={year.sr.chart} showAspects={false} /></div>
            </Panel>

            {/* 4. Moon cycles */}
            <Panel icon={<Moon className="h-4 w-4 text-primary" />} title={`Progressed moon: ${year.pl.phase}`} sub={`A life-season of about 3½ years · since ${year.pl.enteredYear}`} className="md:col-span-2">
              <div className="flex gap-1" aria-label="Progressed moon cycle">
                {PHASES.map((p, i) => (
                  <div key={p} className="flex-1">
                    <div className={cn("h-2 rounded-full bg-muted", i < year.pl.index && "bg-secondary/60")}>
                      {i === year.pl.index && <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(year.pl.progress * 100)}%` }} />}
                    </div>
                    <p className={cn("mt-1 text-[10px] text-center text-muted-foreground", i === year.pl.index && "font-medium text-foreground")}>{p}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3">{year.pl.copy.asks}</p>
              <p className="mt-1 text-xs text-muted-foreground">Next: {year.pl.nextPhase}, around {year.pl.nextYear}.</p>
              <div className="mt-3 rounded-xl bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">This month's Moon · {year.mm.waxing ? "waxing" : "waning"}</p>
                <ul className="mt-1 space-y-0.5">{year.mm.next.map(l => (
                  <li key={l.date.toISOString()}>{l.kind === "new" ? "🌑 New" : "🌕 Full"} Moon in {l.sign} · {format(l.date, "EEE, MMM d")} · your {ord(l.house)} house{l.eclipseSeason ? " · eclipse season" : ""}</li>
                ))}</ul>
                <Link to="/cosmic-flow/moon" className="mt-1 inline-block text-xs text-primary hover:underline">Moon & Rituals →</Link>
              </div>
            </Panel>
          </div>
        </>
      )}

      {/* 5. AI chapter */}
      <section className="cozy-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Your written chapter</p>
            <h2 className="font-display text-xl flex items-center gap-2 mt-1"><BookOpen className="h-4 w-4 text-primary" />{chapter?.chapter_theme ?? (loading ? "Synthesizing…" : "No chapter yet")}</h2>
            {chapter?.valid_from && <p className="text-xs text-muted-foreground mt-1">Chapter window: {chapter.valid_from} → {chapter.valid_to}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={() => refresh(true)} disabled={loading || !year}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCw className="h-4 w-4 mr-1" />Regenerate</>}
          </Button>
        </div>
        {error && <p role="status" className="mt-3 text-sm text-muted-foreground">{error}</p>}
        {chapter && <div className="prose prose-sm dark:prose-invert mt-4 max-w-none">{chapter.summary.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>}
        {chapter && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Block title="Major Characters" items={chapter.characters} />
            <Block title="Lessons" items={chapter.lessons} />
            <Block title="Helpful Practices" items={chapter.practices} />
          </div>
        )}
        {chapter?.reflection_prompt && (
          <div className="mt-4 rounded-xl bg-muted/40 p-4">
            <p className="text-xs font-medium text-muted-foreground">Reflection</p>
            <p className="mt-1 text-[15px] italic">"{chapter.reflection_prompt}"</p>
            <Button asChild size="sm" className="mt-3"><Link to={`/journal?prompt=${encodeURIComponent(chapter.reflection_prompt)}`}>Open journal</Link></Button>
          </div>
        )}
      </section>

      {insights && (insights.themes.length || insights.patterns.length) ? (
        <section className="cozy-card p-4 sm:p-5">
          <h3 className="font-display text-base flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" />Recent Journal Threads</h3>
          <Block title="Themes" items={insights.themes} />
          <Block title="Patterns" items={insights.patterns} />
          <Block title="Breakthroughs" items={insights.breakthroughs} />
        </section>
      ) : null}
    </div>
  );
}

function Panel({ icon, title, sub, children, className }: { icon: ReactNode; title: string; sub: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={cn("cozy-card p-4 sm:p-5 text-sm", className)}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-start justify-between gap-2 text-left">
        <div>
          <p className="font-display text-lg flex items-center gap-1.5">{icon}{title}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && <div className="mt-3 leading-relaxed">{children}</div>}
    </section>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="mt-1 ml-4 list-disc text-[13.5px]">{items.map(i => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}
