import { useEffect, useMemo, useState } from "react";
import { Sparkles, RefreshCw, Trophy, AlertTriangle, Target, CalendarRange, CalendarDays, Trash2, BookHeart, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { format, parseISO, startOfWeek, startOfMonth } from "date-fns";
import { SectionCard } from "@/components/cards/SectionCard";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { CareLoopIndicator } from "@/components/care/CareLoopIndicator";

interface ReviewData {
  summary?: string;
  wins?: string[];
  stale?: string[];
  next_top_3?: { task_id?: string; title: string; why?: string }[];
}
type PeriodRow = {
  id: string;
  period: "week" | "month";
  kind: "review" | "reset";
  period_start: string;
  content: ReviewData | null;
  reflection: string | null;
  intentions: string[];
  wins: string[];
  releases: string[];
  created_at: string;
};

export default function Review() {
  const { updateTask } = useStore();
  const [tab, setTab] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PeriodRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    const { data } = await supabase.from("period_reviews")
      .select("*")
      .eq("user_id", u.user.id)
      .eq("kind", "review")
      .order("period_start", { ascending: false })
      .limit(60);
    setRows((data as any[] | null) ?? []);
  };
  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(() => rows.filter(r => r.period === tab), [rows, tab]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-weekly-review", {
        body: { period: tab },
      });
      if (error) throw error;
      const review = (data as any)?.review as ReviewData | null;
      if (!review) throw new Error("Empty review");
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("Not signed in");
      const start = tab === "week"
        ? startOfWeek(new Date(), { weekStartsOn: 1 })
        : startOfMonth(new Date());
      const period_start = start.toISOString().slice(0, 10);
      const { data: inserted, error: insErr } = await supabase.from("period_reviews").insert({
        user_id: u.user.id,
        period: tab,
        kind: "review",
        period_start,
        content: review as any,
        wins: review.wins ?? [],
      }).select().single();
      if (insErr) throw insErr;
      toast.success(`${tab === "week" ? "Weekly" : "Monthly"} review saved`);
      setOpenId((inserted as any).id);
      await refresh();
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

  const removeRow = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await supabase.from("period_reviews").delete().eq("id", id);
    setRows(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 md:p-6">
      <CareLoopIndicator active="exhale" />
      <header className="flex flex-wrap items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <BookHeart className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
          <p className="text-sm text-muted-foreground">A gentle timeline of your weeks and months — saved as you reflect.</p>
        </div>
        <Button onClick={generate} disabled={loading} className="gap-1.5">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate {tab === "week" ? "weekly" : "monthly"}
        </Button>
      </header>

      <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 text-sm w-fit">
        {([
          { id: "week", label: "Weekly", icon: CalendarRange },
          { id: "month", label: "Monthly", icon: CalendarDays },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors",
              tab === t.id ? "bg-primary-soft text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
        <Link
          to={`/reset/${tab}`}
          className="ml-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Reset & reflect
        </Link>
      </div>

      {filtered.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">
          No {tab === "week" ? "weekly" : "monthly"} reviews yet. Tap <strong>Generate</strong> to begin your timeline.
        </div>
      )}

      <div className="relative space-y-3">
        {filtered.length > 0 && (
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border/60" aria-hidden />
        )}
        {filtered.map(row => {
          const expanded = openId === row.id;
          const startD = parseISO(row.period_start);
          const label = tab === "week"
            ? `Week of ${format(startD, "MMM d, yyyy")}`
            : format(startD, "MMMM yyyy");
          const c = row.content ?? {};
          return (
            <div key={row.id} className="relative pl-8">
              <div className="absolute left-1.5 top-5 grid h-3 w-3 place-items-center rounded-full bg-primary ring-4 ring-background" />
              <SectionCard className="!p-0">
                <button
                  type="button"
                  onClick={() => setOpenId(expanded ? null : row.id)}
                  className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="min-w-0">
                    <div className="font-display text-base font-semibold">{label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Saved {format(parseISO(row.created_at), "MMM d, h:mm a")}
                    </div>
                    {!expanded && c.summary && (
                      <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{c.summary}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void removeRow(row.id); }}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {expanded
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                </button>
                {expanded && (
                  <div className="space-y-3 px-5 pb-5">
                    {c.summary && (
                      <p className="font-display text-base leading-relaxed text-foreground/90">{c.summary}</p>
                    )}
                    {c.wins && c.wins.length > 0 && (
                      <div className="rounded-2xl bg-secondary-soft/40 p-4">
                        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                          <Trophy className="h-4 w-4 text-primary" /> Wins
                        </h3>
                        <ul className="space-y-1 text-sm text-foreground/85">
                          {c.wins.map((w, i) => <li key={i}>• {w}</li>)}
                        </ul>
                      </div>
                    )}
                    {c.stale && c.stale.length > 0 && (
                      <div className="rounded-2xl bg-warm-soft/40 p-4">
                        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                          <AlertTriangle className="h-4 w-4" /> Worth a check-in
                        </h3>
                        <ul className="space-y-1 text-sm text-foreground/85">
                          {c.stale.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                      </div>
                    )}
                    {c.next_top_3 && c.next_top_3.length > 0 && (
                      <div className="rounded-2xl bg-primary-soft/40 p-4">
                        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                          <Target className="h-4 w-4 text-primary" /> Suggested top 3
                        </h3>
                        <ul className="space-y-2 text-sm">
                          {c.next_top_3.map((n, i) => (
                            <li key={i} className="flex items-start justify-between gap-3 rounded-xl bg-background/60 p-2.5">
                              <div className="min-w-0">
                                <div className="font-medium">{n.title}</div>
                                {n.why && <div className="text-xs text-muted-foreground">{n.why}</div>}
                              </div>
                              {n.task_id && (
                                <Button size="sm" variant="ghost" onClick={() => acceptTop(n.task_id)}>Pin</Button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}
