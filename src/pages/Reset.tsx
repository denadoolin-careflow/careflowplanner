import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Sparkles, RefreshCw, CalendarRange, CalendarDays, Plus, X, Check, Flower2, Trash2, BookHeart, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/cards/SectionCard";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CareLoopIndicator } from "@/components/care/CareLoopIndicator";
import { aiInvoke } from "@/lib/ai-invoke";

type Period = "week" | "month";
type ChecklistItem = { id: string; label: string; done: boolean };

const DEFAULTS: Record<Period, ChecklistItem[]> = {
  week: [
    { id: "inbox", label: "Clear the inbox", done: false },
    { id: "calendar", label: "Look at the week ahead", done: false },
    { id: "top3", label: "Pick a soft top 3 for next week", done: false },
    { id: "rest", label: "Plan one moment of real rest", done: false },
    { id: "habits", label: "Notice habits — celebrate, don't shame", done: false },
  ],
  month: [
    { id: "review", label: "Read last month's reflection", done: false },
    { id: "goals", label: "Check in with goals — adjust gently", done: false },
    { id: "projects", label: "Archive what's done, pause what's stalled", done: false },
    { id: "budget", label: "Quick money check-in", done: false },
    { id: "calendar", label: "Glance at the month ahead", done: false },
    { id: "intention", label: "Set one soft intention", done: false },
  ],
};

const PROMPTS: Record<Period, string[]> = {
  week: [
    "What is one thing I'm proud of this week?",
    "What felt heavy, and what can I release?",
    "What gave me energy?",
    "What does next week need more of?",
  ],
  month: [
    "What story did this month tell?",
    "What am I quietly celebrating?",
    "What am I outgrowing?",
    "What seed am I planting for next month?",
  ],
};

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

export default function Reset() {
  const { period: periodParam } = useParams<{ period?: string }>();
  const period: Period = periodParam === "month" ? "month" : "week";
  const navigate = useNavigate();

  const [anchor, setAnchor] = useState<Date>(new Date());
  const [current, setCurrent] = useState<Row | null>(null);
  const [history, setHistory] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const start = period === "week"
    ? startOfWeek(anchor, { weekStartsOn: 1 })
    : startOfMonth(anchor);
  const end = period === "week" ? endOfWeek(start, { weekStartsOn: 1 }) : endOfMonth(start);
  const periodStart = start.toISOString().slice(0, 10);
  const rangeLabel = period === "week"
    ? `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`
    : format(start, "MMMM yyyy");

  useEffect(() => { void load(); }, [period, periodStart]);

  async function load() {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { data } = await supabase.from("period_reviews")
        .select("*")
        .eq("user_id", u.user.id)
        .eq("kind", "reset")
        .eq("period", period)
        .order("period_start", { ascending: false })
        .limit(30);
      const rows = ((data as any[]) ?? []).map(normalize);
      const today = rows.find(r => r.period_start === periodStart);
      setCurrent(today ?? null);
      setHistory(rows.filter(r => r.period_start !== periodStart));
      if (!today) {
        // create blank
        const { data: u2 } = await supabase.auth.getUser();
        if (!u2?.user) return;
        const { data: inserted } = await supabase.from("period_reviews").insert({
          user_id: u2.user.id,
          period,
          kind: "reset",
          period_start: periodStart,
          checklist: DEFAULTS[period] as any,
        }).select().single();
        if (inserted) setCurrent(normalize(inserted));
      }
    } finally {
      setLoading(false);
    }
  }

  function normalize(r: any): Row {
    const cl = Array.isArray(r.checklist) && r.checklist.length > 0 ? r.checklist : DEFAULTS[r.period as Period];
    return {
      id: r.id, period: r.period, period_start: r.period_start,
      reflection: r.reflection ?? "",
      intentions: r.intentions ?? [],
      wins: r.wins ?? [],
      releases: r.releases ?? [],
      checklist: cl,
      content: r.content,
      created_at: r.created_at,
    };
  }

  async function patch(updates: Partial<Row>) {
    if (!current) return;
    const merged = { ...current, ...updates };
    setCurrent(merged);
    await supabase.from("period_reviews").update({
      reflection: merged.reflection,
      intentions: merged.intentions,
      wins: merged.wins,
      releases: merged.releases,
      checklist: merged.checklist as any,
      content: merged.content,
    }).eq("id", current.id);
  }

  function toggleCheck(id: string) {
    if (!current) return;
    const next = current.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c);
    void patch({ checklist: next });
  }

  async function generateAi() {
    setAiLoading(true);
    try {
      const { data, error } = await aiInvoke("ai-weekly-review", { body: { period } });
      if (error) throw error;
      const review = (data as any)?.review;
      setAiSummary(review?.summary ?? null);
      await patch({ content: review });
      toast.success("Gentle summary ready");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate");
    } finally {
      setAiLoading(false);
    }
  }

  const PeriodIcon = period === "week" ? CalendarRange : CalendarDays;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 md:p-6">
      <CareLoopIndicator active="exhale" />
      <header className="flex flex-wrap items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/20 text-secondary-foreground">
          <Flower2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {period === "week" ? "Weekly" : "Monthly"} Reset & Reflect
          </h1>
          <p className="text-sm text-muted-foreground">{rangeLabel} · a soft pause to land before you leap</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 text-xs">
          {(["week","month"] as const).map(p => (
            <button
              key={p}
              onClick={() => navigate(`/reset/${p}`)}
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                period === p ? "bg-primary-soft text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p === "week" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
        <DayPickerButton
          date={anchor}
          onChange={(d) => setAnchor(d)}
          label={period === "week" ? `Week of ${format(start, "MMM d")}` : format(start, "MMMM yyyy")}
        />
        {periodStart !== (period === "week"
          ? startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().slice(0,10)
          : startOfMonth(new Date()).toISOString().slice(0,10)) && (
          <Button size="sm" variant="ghost" onClick={() => setAnchor(new Date())} className="h-8 rounded-full px-3 text-xs">
            Jump to now
          </Button>
        )}
      </header>

      {loading && !current && (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">
          Preparing your space…
        </div>
      )}

      {current && (
        <>
          <SectionCard
            accent="calm"
            title={<span className="flex items-center gap-2"><PeriodIcon className="h-4 w-4" /> Reset checklist</span>}
            subtitle="One small box at a time. Skip what doesn't fit."
          >
            <div className="px-5 pb-5">
              <ResetChecklist items={current.checklist} onToggle={toggleCheck} onChange={(next) => patch({ checklist: next })} />
            </div>
          </SectionCard>

          <SectionCard
            accent="warm"
            title={<span className="flex items-center gap-2"><BookHeart className="h-4 w-4" /> Reflection</span>}
            subtitle="Gentle prompts — answer one, all, or none."
          >
            <div className="space-y-2 px-5 pb-5">
              <ul className="space-y-1 text-sm text-foreground/75">
                {PROMPTS[period].map((p, i) => <li key={i}>· {p}</li>)}
              </ul>
              <Textarea
                value={current.reflection ?? ""}
                onChange={(e) => setCurrent({ ...current, reflection: e.target.value })}
                onBlur={() => patch({ reflection: current.reflection })}
                placeholder="Write softly, no pressure…"
                className="min-h-[140px] rounded-2xl border-border/60 bg-background/60 focus-visible:ring-primary/40"
              />
            </div>
          </SectionCard>

          <div className="grid gap-4 md:grid-cols-2">
            <TagList
              accent="sage"
              title="Wins"
              icon={<Check className="h-4 w-4 text-primary" />}
              items={current.wins}
              onChange={(items) => patch({ wins: items })}
              placeholder="A small win…"
            />
            <TagList
              accent="calm"
              title="Releases"
              icon={<Moon className="h-4 w-4 text-primary" />}
              items={current.releases}
              onChange={(items) => patch({ releases: items })}
              placeholder="Something to let go of…"
            />
          </div>

          <TagList
            accent="warm"
            title="Intentions for next " items={current.intentions}
            onChange={(items) => patch({ intentions: items })}
            placeholder={period === "week" ? "Soft intention for the week…" : "Soft intention for the month…"}
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            titleSuffix={period === "week" ? "week" : "month"}
          />

          <SectionCard
            accent="sage"
            title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Gentle AI summary</span>}
            subtitle="A warm look back at the last cycle — pulled from your tasks and projects."
            action={
              <Button size="sm" onClick={generateAi} disabled={aiLoading} className="gap-1.5">
                {aiLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {current.content?.summary ? "Regenerate" : "Generate"}
              </Button>
            }
          >
            <div className="px-5 pb-5">
              {current.content?.summary ? (
                <p className="font-display text-base leading-relaxed text-foreground/90">{current.content.summary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No summary yet — when you're ready, generate a gentle overview.</p>
              )}
              {current.content?.wins?.length > 0 && (
                <div className="mt-3 grid gap-1 text-sm text-foreground/80">
                  {current.content.wins.slice(0, 4).map((w: string, i: number) => <div key={i}>• {w}</div>)}
                </div>
              )}
            </div>
          </SectionCard>
        </>
      )}

      {history.length > 0 && (
        <section className="space-y-2 pt-4">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Past resets</h2>
          <div className="relative space-y-2 pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-border/60" aria-hidden />
            {history.map(h => (
              <div key={h.id} className="relative">
                <div className="absolute -left-[18px] top-4 grid h-2.5 w-2.5 place-items-center rounded-full bg-secondary ring-4 ring-background" />
                <SectionCard className="!p-0">
                  <div className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="font-display text-sm font-semibold">
                        {period === "week"
                          ? `Week of ${format(parseISO(h.period_start), "MMM d, yyyy")}`
                          : format(parseISO(h.period_start), "MMMM yyyy")}
                      </div>
                      {h.reflection && <p className="mt-1 line-clamp-2 text-xs text-foreground/75">{h.reflection}</p>}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {h.intentions.slice(0,3).map((t,i) => <span key={i} className="rounded-full bg-primary-soft/60 px-2 py-0.5 text-[11px] text-foreground/80">✦ {t}</span>)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Delete this reset?")) return;
                        await supabase.from("period_reviews").delete().eq("id", h.id);
                        setHistory(prev => prev.filter(r => r.id !== h.id));
                      }}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </SectionCard>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ResetChecklist({ items, onToggle, onChange }: { items: ChecklistItem[]; onToggle: (id: string) => void; onChange: (next: ChecklistItem[]) => void }) {
  const [draft, setDraft] = useState("");
  const done = items.filter(i => i.done).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${items.length ? (done/items.length)*100 : 0}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{done}/{items.length}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map(it => (
          <li key={it.id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/40">
            <button
              type="button"
              onClick={() => onToggle(it.id)}
              aria-label={it.done ? "Mark incomplete" : "Mark complete"}
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full border transition-all",
                it.done ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60",
              )}
            >
              {it.done && <Check className="h-3 w-3" />}
            </button>
            <span className={cn("flex-1 text-sm", it.done && "text-muted-foreground line-through")}>{it.label}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter(i => i.id !== it.id))}
              aria-label="Remove"
              className="opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = draft.trim();
          if (!v) return;
          onChange([...items, { id: crypto.randomUUID(), label: v, done: false }]);
          setDraft("");
        }}
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
    </div>
  );
}

function TagList({
  title, titleSuffix, items, onChange, placeholder, icon, accent,
}: {
  title: string;
  titleSuffix?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  accent?: "warm" | "calm" | "sage";
}) {
  const [draft, setDraft] = useState("");
  return (
    <SectionCard accent={accent} title={<span className="flex items-center gap-2">{icon}{title}{titleSuffix ? ` ${titleSuffix}` : ""}</span>}>
      <div className="space-y-2 px-5 pb-5">
        <div className="flex flex-wrap gap-1.5">
          {items.length === 0 && <span className="text-xs italic text-muted-foreground">Empty for now — that's okay.</span>}
          {items.map((t, i) => (
            <span key={i} className="group inline-flex items-center gap-1 rounded-full bg-primary-soft/60 px-3 py-1 text-xs text-foreground/85">
              {t}
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">
                <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
              </button>
            </span>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = draft.trim();
            if (!v) return;
            onChange([...items, v]);
            setDraft("");
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="h-9 rounded-xl border-border/60 bg-background/60 text-sm"
          />
          <Button type="submit" size="sm" variant="secondary" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </SectionCard>
  );
}
