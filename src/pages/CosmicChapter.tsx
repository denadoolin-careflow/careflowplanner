import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { useNatalChart, useCurrentChapter, useJournalInsights } from "@/lib/cosmic/v2-hooks";

export default function CosmicChapter() {
  const { row } = useBirthChart();
  const chart = useNatalChart(row ? { date: row.birth_date, time: row.birth_time, tz: row.birth_tz, lat: row.birth_lat, lng: row.birth_lng, place: row.birth_place, house_system: "whole-sign" } : null);
  const { chapter, loading, refresh } = useCurrentChapter(chart);
  const { insights } = useJournalInsights();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-3 pb-28 sm:p-6">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2"><Link to="/cosmic-flow"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <Button variant="outline" size="sm" onClick={() => refresh(true)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCw className="h-4 w-4 mr-1" />Regenerate</>}
        </Button>
      </header>

      <div className="cozy-card p-6" style={{ borderLeft: "4px solid hsl(var(--primary))" }}>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Your Current Chapter</p>
        <h1 className="font-display text-3xl flex items-center gap-2 mt-1">
          <BookOpen className="h-5 w-5 text-primary" />
          {chapter?.chapter_theme ?? (loading ? "Synthesizing…" : "No chapter yet")}
        </h1>
        {chapter?.valid_from && <p className="text-xs text-muted-foreground mt-1">Chapter window: {chapter.valid_from} → {chapter.valid_to}</p>}

        {chapter && (
          <div className="prose prose-sm dark:prose-invert mt-4 max-w-none">
            {chapter.summary.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}
      </div>

      {chapter && (
        <div className="grid gap-3 md:grid-cols-2">
          <Block title="Major Characters" items={chapter.characters} />
          <Block title="Lessons" items={chapter.lessons} />
          <Block title="Helpful Practices" items={chapter.practices} fullWidth />
        </div>
      )}

      {chapter?.reflection_prompt && (
        <section className="cozy-card p-4 sm:p-5 bg-muted/40">
          <p className="text-xs font-medium text-muted-foreground">Reflection</p>
          <p className="mt-1 text-[15px] italic">"{chapter.reflection_prompt}"</p>
          <Button asChild size="sm" className="mt-3"><Link to={`/journal?prompt=${encodeURIComponent(chapter.reflection_prompt)}`}>Open journal</Link></Button>
        </section>
      )}

      {insights && (insights.themes.length || insights.patterns.length) && (
        <section className="cozy-card p-4 sm:p-5">
          <h3 className="font-display text-base flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" />Recent Journal Threads</h3>
          {insights.themes.length > 0 && <Block title="Themes" items={insights.themes} compact />}
          {insights.patterns.length > 0 && <Block title="Patterns" items={insights.patterns} compact />}
          {insights.breakthroughs.length > 0 && <Block title="Breakthroughs" items={insights.breakthroughs} compact />}
        </section>
      )}
    </div>
  );
}

function Block({ title, items, fullWidth, compact }: { title: string; items: string[]; fullWidth?: boolean; compact?: boolean }) {
  if (!items?.length) return null;
  return (
    <div className={`${compact ? "mt-3" : "cozy-card p-4"} ${fullWidth ? "md:col-span-2" : ""}`}>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="mt-1 ml-4 list-disc text-[13.5px]">{items.map(i => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}