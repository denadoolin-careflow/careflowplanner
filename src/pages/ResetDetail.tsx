import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Sparkles, Check, CircleDashed, BookHeart, Trash2, CalendarRange, CalendarDays, Pencil, Plus, X } from "lucide-react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

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

  async function updateChecklist(next: ChecklistItem[]) {
    if (!row) return;
    setRow({ ...row, checklist: next });
    const { error } = await supabase
      .from("period_reviews")
      .update({ checklist: next as any })
      .eq("id", row.id);
    if (error) toast.error("Could not save");
  }

  function toggle(id: string) {
    if (!row) return;
    void updateChecklist(row.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c));
  }
  function removeItem(id: string) {
    if (!row) return;
    void updateChecklist(row.checklist.filter(c => c.id !== id));
  }
  function addItem(label: string) {
    if (!row) return;
    const v = label.trim();
    if (!v) return;
    void updateChecklist([...row.checklist, { id: crypto.randomUUID(), label: v, done: false }]);
    setDraft("");
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

      {row && (
        <div className="flex justify-end">
          <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => setEditing(e => !e)} className="h-8 gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> {editing ? "Done editing" : "Edit checklist"}
          </Button>
        </div>
      )}

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

          {(row.checklist.length > 0 || editing) && (
            <SectionCard accent="calm" title={`Checklist · ${row.checklist.filter(c => c.done).length}/${row.checklist.length}`}>
              <div className="space-y-2 px-5 pb-5 text-sm">
                <ul className="space-y-1">
                  {row.checklist.map(c => (
                    <li key={c.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/40">
                      <button
                        type="button"
                        onClick={() => toggle(c.id)}
                        aria-label={c.done ? "Mark incomplete" : "Mark complete"}
                        className={cn(
                          "grid h-5 w-5 place-items-center rounded-full border transition-all",
                          c.done ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60",
                        )}
                      >
                        {c.done && <Check className="h-3 w-3" />}
                      </button>
                      <span className={cn("flex-1", c.done && "text-muted-foreground line-through")}>{c.label}</span>
                      {editing && (
                        <button
                          type="button"
                          onClick={() => removeItem(c.id)}
                          aria-label="Remove"
                          className="opacity-60 transition-opacity hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {editing && (
                  <form
                    onSubmit={(e) => { e.preventDefault(); addItem(draft); }}
                    className="flex items-center gap-2 pt-1"
                  >
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Add a step…"
                      className="h-9 rounded-xl border-border/60 bg-background/60 text-sm"
                    />
                    <Button type="submit" size="sm" variant="secondary" className="gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </form>
                )}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}