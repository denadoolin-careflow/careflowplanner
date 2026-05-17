import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Plus } from "lucide-react";

interface Row {
  date: string;
  word: string | null;
  intention: string | null;
  top_three: any;
  rating?: number | null;
}

export default function PlanTimeline() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) { setLoading(false); return; }
      const [iRes, rRes] = await Promise.all([
        supabase.from("daily_intentions")
          .select("date,word,intention,top_three")
          .eq("user_id", uid).order("date", { ascending: false }).limit(120),
        supabase.from("daily_reviews")
          .select("date,rating").eq("user_id", uid),
      ]);
      const ratingMap = new Map((rRes.data ?? []).map(r => [r.date, r.rating]));
      setRows((iRes.data ?? []).map(r => ({ ...r, rating: ratingMap.get(r.date) ?? null })));
      setLoading(false);
    })();
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-warm flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Timeline</p>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Daily plans</h2>
          <p className="mt-1 text-sm text-muted-foreground">Every saved intention, in reverse chronological order.</p>
        </div>
        <Button onClick={() => navigate(`/plan/${today}`)}>
          <Plus className="mr-1 h-4 w-4" /> Plan today
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="cozy-card p-8 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="font-display text-lg font-semibold">No daily plans yet</p>
          <p className="text-sm text-muted-foreground">Start with today's intention.</p>
          <Button className="mt-4" onClick={() => navigate(`/plan/${today}`)}>Plan today</Button>
        </div>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-border/60 pl-6">
          {rows.map(r => {
            const top = Array.isArray(r.top_three) ? r.top_three as string[] : [];
            return (
              <li key={r.date} className="relative">
                <span className="absolute -left-[31px] top-3 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                <Link to={`/plan/${r.date}`} className="block cozy-card cozy-card-hover p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {format(parseISO(r.date), "EEEE")}
                      </div>
                      <div className="font-display text-lg font-semibold">
                        {format(parseISO(r.date), "MMM d, yyyy")}
                      </div>
                    </div>
                    {r.word && (
                      <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium">
                        {r.word}
                      </span>
                    )}
                  </div>
                  {r.intention && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{r.intention}</p>}
                  {top.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {top.map((t, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-accent/30 px-2 py-0.5 text-[11px]">
                          <Star className="h-3 w-3" /> {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.rating != null && (
                    <div className="mt-2 text-xs text-muted-foreground">Rated {r.rating}/5</div>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}