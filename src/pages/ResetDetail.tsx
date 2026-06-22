import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Sparkles, Check, CircleDashed, BookHeart, Trash2, CalendarRange, CalendarDays } from "lucide-react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Period = "week" | "month";
type ChecklistItem = { id: string; label: string; done: boolean };

type Row = {
  id: string;
  period: Period;
  period_start: string;
  reflection: string | null;
  intentions: string[];
  wins: string[];
  releases: string[];
  checklist: ChecklistItem[];
  content: any;
  created_at: string;
};

export default function ResetDetail() {
  const { period: pp, periodStart } = useParams<{ period?: string; periodStart?: string }>();
  const period: Period = pp === "month" ? "month" : "week";
  const navigate = useNavigate();
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user || !periodStart) { setLoading(false); return; }
      const { data } = await supabase
        .from("period_reviews")
        .select("*")
        .eq("user_id", u.user.id)
        .eq("kind", "reset")
        .eq("period", period)
        .eq("period_start", periodStart)
        .maybeSingle();
      if (data) {
        const r: any = data;
        setRow({
          id: r.id, period: r.period, period_start: r.period_start,
          reflection: r.reflection ?? "",
          intentions: r.intentions ?? [],
          wins: r.wins ?? [],
          releases: r.releases ?? [],
          checklist: Array.isArray(r.checklist) ? r.checklist : [],
          content: r.content,
          created_at: r.created_at,
        });
      }
      setLoading(false);
    })();
  }, [period, periodStart]);

  const PeriodIcon = period === "week" ? CalendarRange : CalendarDays;
  const heading = !periodStart ? "" : period === "week"
    ? `Week of ${format(parseISO(periodStart), "MMM d, yyyy")}`
    : format(parseISO(periodStart), "MMMM yyyy");

  async function remove() {
    if (!row) return;
    if (!confirm("Delete this reset?")) return;
    await supabase.from("period_reviews").delete().eq("id", row.id);
    toast.success("Reset deleted");
    navigate(`/reset/${period}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5">
          <Link to={`/reset/${period}`}><ArrowLeft className="h-3.5 w-3.5" /> Back to {period === "week" ? "weekly" : "monthly"} reset</Link>
        </Button>
        {row && (
          <Button size="sm" variant="ghost" onClick={remove} className="h-8 gap-1.5 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        )}
      </div>

      <header className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/20 text-secondary-foreground">
          <PeriodIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{heading || "Past reset"}</h1>
          <p className="text-sm text-muted-foreground">A saved {period === "week" ? "weekly" : "monthly"} reset — read with kindness.</p>
        </div>
      </header>

      {loading && <div className="rounded-2xl border border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">Loading…</div>}

      {!loading && !row && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No saved reset found for this {period}.
        </div>
      )}

      {row && (
        <>
          {row.content?.summary && (
            <SectionCard accent="sage" title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI summary</span>}>
              <div className="space-y-3 px-5 pb-5">
                <p className="font-display leading-relaxed text-foreground/90">{row.content.summary}</p>
                {Array.isArray(row.content?.wins) && row.content.wins.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Highlights</div>
                    <ul className="space-y-0.5 text-sm text-foreground/80">
                      {row.content.wins.map((w: string, i: number) => <li key={i}>• {w}</li>)}
                    </ul>
                  </div>
                )}
                {Array.isArray(row.content?.stale) && row.content.stale.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Needs tending</div>
                    <ul className="space-y-0.5 text-sm text-foreground/80">
                      {row.content.stale.map((w: string, i: number) => <li key={i}>· {w}</li>)}
                    </ul>
                  </div>
                )}
                {Array.isArray(row.content?.next_top_3) && row.content.next_top_3.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Suggested next top 3</div>
                    <ul className="space-y-1 text-sm text-foreground/85">
                      {row.content.next_top_3.map((t: any, i: number) => (
                        <li key={i}>
                          <div className="font-medium">{t.title}</div>
                          {t.why && <div className="text-xs text-muted-foreground">{t.why}</div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {row.reflection && (
            <SectionCard accent="warm" title={<span className="flex items-center gap-2"><BookHeart className="h-4 w-4" /> Reflection</span>}>
              <div className="px-5 pb-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{row.reflection}</p>
              </div>
            </SectionCard>
          )}

          {(row.wins.length > 0 || row.releases.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {row.wins.length > 0 && (
                <SectionCard accent="sage" title="Wins">
                  <ul className="space-y-1 px-5 pb-5 text-sm">{row.wins.map((w, i) => <li key={i}>· {w}</li>)}</ul>
                </SectionCard>
              )}
              {row.releases.length > 0 && (
                <SectionCard accent="calm" title="Releases">
                  <ul className="space-y-1 px-5 pb-5 text-sm">{row.releases.map((w, i) => <li key={i}>· {w}</li>)}</ul>
                </SectionCard>
              )}
            </div>
          )}

          {row.intentions.length > 0 && (
            <SectionCard accent="warm" title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Intentions</span>}>
              <div className="flex flex-wrap gap-1.5 px-5 pb-5">
                {row.intentions.map((t, i) => (
                  <span key={i} className="rounded-full bg-primary-soft/60 px-3 py-1 text-xs text-foreground/85">✦ {t}</span>
                ))}
              </div>
            </SectionCard>
          )}

          {row.checklist.length > 0 && (
            <SectionCard accent="calm" title={`Checklist · ${row.checklist.filter(c => c.done).length}/${row.checklist.length}`}>
              <ul className="space-y-1 px-5 pb-5 text-sm">
                {row.checklist.map(c => (
                  <li key={c.id} className={cn("flex items-center gap-2", c.done && "text-muted-foreground line-through")}>
                    {c.done ? <Check className="h-3.5 w-3.5 text-primary" /> : <CircleDashed className="h-3.5 w-3.5" />}
                    {c.label}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}