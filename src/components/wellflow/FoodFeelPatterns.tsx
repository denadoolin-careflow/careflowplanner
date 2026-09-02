/**
 * "How foods feel" — which foods tend to sit well and which tend not to.
 * Descriptive summaries of what you recorded; not a diagnosis or an allergy test.
 */
import { SectionCard } from "@/components/cards/SectionCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { HeartPulse, Sparkles, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeelPatterns, type FoodFeelSummary } from "@/lib/wellflow/food-feel";

function FoodRow({ f, tone }: { f: FoodFeelSummary; tone: "good" | "rough" }) {
  return (
    <li className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{f.food}</p>
        <p className="truncate text-xs text-muted-foreground">
          {f.count} time{f.count === 1 ? "" : "s"}
          {f.topSymptoms.length ? ` · ${f.topSymptoms.map(s => s.symptom.toLowerCase()).join(", ")}` : ""}
        </p>
      </div>
      <span className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        tone === "good" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
      )}>
        {f.avgRating.toFixed(1)}/5
      </span>
    </li>
  );
}

export function FoodFeelPatterns({ days = 90 }: { days?: number }) {
  const { patterns, loading } = useFeelPatterns(days);

  return (
    <SectionCard
      title="How foods feel"
      subtitle="Patterns from what you noticed after eating"
      accent="sage"
      collapsibleId="wellflow-food-feel"
    >
      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
      ) : patterns.total === 0 ? (
        <EmptyState
          icon={<HeartPulse className="h-6 w-6 text-muted-foreground" aria-hidden />}
          title="No notes yet"
          hint="After logging a meal, tap “How did that feel?” A couple of notes per food is enough to start seeing patterns."
        />
      ) : (
        <div className="space-y-4">
          {patterns.notes.length > 0 && (
            <ul className="space-y-1.5">
              {patterns.notes.map((n, i) => (
                <li key={i} className="flex gap-2 rounded-2xl bg-muted/30 px-3 py-2 text-sm">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          )}

          {patterns.helpers.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Feel good and energizing
              </p>
              <ul className="space-y-1.5">
                {patterns.helpers.map(f => <FoodRow key={f.food} f={f} tone="good" />)}
              </ul>
            </div>
          )}

          {patterns.drainers.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingDown className="h-3 w-3" /> Tend to drain or upset
              </p>
              <ul className="space-y-1.5">
                {patterns.drainers.map(f => <FoodRow key={f.food} f={f} tone="rough" />)}
              </ul>
            </div>
          )}

          {patterns.symptomCounts.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Most noticed
              </p>
              <div className="flex flex-wrap gap-1.5">
                {patterns.symptomCounts.slice(0, 8).map(s => (
                  <span key={s.symptom} className="rounded-full bg-muted/40 px-2.5 py-1 text-xs">
                    {s.symptom} <span className="tabular-nums opacity-70">×{s.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            These are observations from your own notes, not a diagnosis. If something keeps feeling
            wrong, that's worth raising with your clinician.
          </p>
        </div>
      )}
    </SectionCard>
  );
}
