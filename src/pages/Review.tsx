import { useState } from "react";
import { Sparkles, Check, RefreshCw, Trophy, AlertTriangle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { format } from "date-fns";

interface ReviewData {
  summary?: string;
  wins?: string[];
  stale?: string[];
  next_top_3?: { task_id?: string; title: string; why?: string }[];
}

export default function Review() {
  const { updateTask } = useStore();
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ReviewData | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-weekly-review", { body: {} });
      if (error) throw error;
      setReview((data as any)?.review ?? null);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate review");
    } finally {
      setLoading(false);
    }
  };

  const acceptTop = async (taskId?: string) => {
    if (!taskId) return;
    await updateTask(taskId, { isTopThree: true, status: "active" });
    toast.success("Pinned to your top 3");
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 md:p-6">
      <header className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Weekly Review</h1>
          <p className="text-sm text-muted-foreground">A gentle look back at your week and a soft push for the next one.</p>
        </div>
        <Button onClick={run} disabled={loading} className="gap-1.5">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {review ? "Regenerate" : "Generate"}
        </Button>
      </header>

      {!review && !loading && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">
          Tap <strong>Generate</strong> to create your review for the week of {format(new Date(), "MMM d")}.
        </div>
      )}

      {loading && !review && (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">
          Looking back at your week…
        </div>
      )}

      {review && (
        <div className="space-y-4">
          {review.summary && (
            <section className="cozy-card p-5">
              <p className="font-display text-lg leading-relaxed">{review.summary}</p>
            </section>
          )}

          {review.wins && review.wins.length > 0 && (
            <section className="cozy-card p-5">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-primary" /> Wins this week
              </h3>
              <ul className="space-y-1.5 text-sm">
                {review.wins.map((w, i) => <li key={i} className="text-foreground/85">• {w}</li>)}
              </ul>
            </section>
          )}

          {review.stale && review.stale.length > 0 && (
            <section className="cozy-card p-5">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-warm-foreground" /> Worth a check-in
              </h3>
              <ul className="space-y-1.5 text-sm text-foreground/85">
                {review.stale.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </section>
          )}

          {review.next_top_3 && review.next_top_3.length > 0 && (
            <section className="cozy-card p-5">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <Target className="h-4 w-4 text-primary" /> Suggested top 3 for next week
              </h3>
              <ul className="space-y-2">
                {review.next_top_3.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{t.title}</div>
                      {t.why && <div className="mt-0.5 text-xs text-muted-foreground">{t.why}</div>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => acceptTop(t.task_id)} disabled={!t.task_id} className="gap-1.5 shrink-0">
                      <Check className="h-3.5 w-3.5" /> Pin
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}