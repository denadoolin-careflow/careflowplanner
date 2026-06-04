import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { SectionCard } from "@/components/cards/SectionCard";
import {
  CheckCircle2, Plus, Trash2, Wrench, ArrowRight, ChevronDown, ChevronUp,
  Clock3, CalendarClock, Snowflake, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  BUCKET_LABEL, bucketOf, useHomeMaintenance, type MaintenanceBucket, type MaintenanceItem,
} from "@/lib/home-maintenance";
import { cn } from "@/lib/utils";
import { categoryStyle } from "@/lib/category-icons";
import {
  useAiSuggest, AiPanelShell, MaintenanceSuggestionList, type MaintenanceSuggestion,
} from "@/components/home-hub/AiSuggestionsPanel";

const INTERVAL_PRESETS: { label: string; value: number | "" }[] = [
  { label: "One-off", value: "" },
  { label: "Monthly", value: 1 },
  { label: "Quarterly", value: 3 },
  { label: "Twice a year", value: 6 },
  { label: "Yearly", value: 12 },
];

const BUCKET_ORDER: MaintenanceBucket[] = ["overdue", "due_soon", "upcoming", "unscheduled"];
const BUCKET_ACCENT: Record<MaintenanceBucket, string> = {
  overdue: "border-destructive/40 bg-destructive/5",
  due_soon: "border-primary/30 bg-primary/5",
  upcoming: "border-border/60 bg-card/60",
  unscheduled: "border-border/40 bg-muted/30",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr + "T00:00:00").getTime();
  return Math.round((due - Date.now()) / 86400000);
}

function relativeDue(dateStr: string | null): string {
  const d = daysUntil(dateStr);
  if (d == null) return "No schedule";
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  if (d <= 14) return `In ${d} days`;
  if (d <= 60) return `In ${Math.round(d / 7)} weeks`;
  return `In ${Math.round(d / 30)} months`;
}

function addMonths(dateStr: string | null | undefined, months: number): string {
  const base = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

export function MaintenanceTab() {
  const { items, loading, add, update, remove, markDone } = useHomeMaintenance();
  const [form, setForm] = useState({ title: "", category: "", interval: "" as number | "", next_due: "" });
  const [filter, setFilter] = useState<string>("all");
  const ai = useAiSuggest<{ suggestions: MaintenanceSuggestion[] }>();
  const [aiOpen, setAiOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const categories = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => { if (i.category) s.add(i.category); });
    return Array.from(s).sort();
  }, [items]);

  const grouped = useMemo(() => {
    const filtered = filter === "all" ? items : items.filter((i) => (i.category ?? "") === filter);
    const buckets: Record<MaintenanceBucket, MaintenanceItem[]> = {
      overdue: [], due_soon: [], upcoming: [], unscheduled: [],
    };
    filtered.forEach((i) => buckets[bucketOf(i)].push(i));
    buckets.overdue.sort((a, b) => (a.next_due ?? "").localeCompare(b.next_due ?? ""));
    buckets.due_soon.sort((a, b) => (a.next_due ?? "").localeCompare(b.next_due ?? ""));
    buckets.upcoming.sort((a, b) => (a.next_due ?? "").localeCompare(b.next_due ?? ""));
    buckets.unscheduled.sort((a, b) => a.title.localeCompare(b.title));
    return buckets;
  }, [items, filter]);

  const allBuckets = useMemo(() => {
    const b: Record<MaintenanceBucket, MaintenanceItem[]> = {
      overdue: [], due_soon: [], upcoming: [], unscheduled: [],
    };
    items.forEach(i => b[bucketOf(i)].push(i));
    return b;
  }, [items]);

  const categoryCards = useMemo(() => {
    const map = new Map<string, { name: string; overdue: number; due_soon: number; upcoming: number; total: number }>();
    for (const i of items) {
      const key = i.category || "Uncategorised";
      const entry = map.get(key) ?? { name: key, overdue: 0, due_soon: 0, upcoming: 0, total: 0 };
      const b = bucketOf(i);
      if (b !== "unscheduled") (entry as any)[b] += 1;
      entry.total += 1;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.overdue - a.overdue || b.total - a.total);
  }, [items]);

  const nextUp = useMemo(() => {
    const candidates = [...allBuckets.overdue, ...allBuckets.due_soon];
    return candidates[0] ?? null;
  }, [allBuckets]);

  const smartLine = useMemo(() => {
    if (allBuckets.overdue.length > 0) {
      return `${allBuckets.overdue.length} task${allBuckets.overdue.length > 1 ? "s are" : " is"} overdue — start with “${allBuckets.overdue[0].title}”.`;
    }
    if (allBuckets.due_soon.length > 0) {
      return `${allBuckets.due_soon.length} task${allBuckets.due_soon.length > 1 ? "s" : ""} due in the next 30 days. Quick win: “${allBuckets.due_soon[0].title}”.`;
    }
    if (items.length === 0) return "Add seasonal tasks and CareFlow will keep an eye on them.";
    return "Everything's on track. Future you says thanks. ✨";
  }, [allBuckets, items]);

  const onAdd = async () => {
    if (!form.title.trim()) {
      toast.error("Add a title first");
      return;
    }
    const err = await add({
      title: form.title.trim(),
      category: form.category.trim() || null,
      interval_months: form.interval === "" ? null : Number(form.interval),
      next_due: form.next_due || undefined,
    });
    if (err) {
      toast.error(err.message);
      return;
    }
    setForm({ title: "", category: "", interval: "", next_due: "" });
    toast.success("Maintenance task added");
    setAddOpen(false);
  };

  const snooze = async (it: MaintenanceItem, months: number) => {
    const next = addMonths(it.next_due, months);
    await update(it.id, { next_due: next });
    toast.success(`Snoozed ${months}mo → ${next}`);
  };

  return (
    <div className="space-y-5">
      {/* ============ HERO ============ */}
      <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100/70 via-rose-50/40 to-sky-100/40 p-5 ring-1 ring-amber-200/50 shadow-soft sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/60">Home Maintenance</p>
        <div className="mt-2 flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-amber-700 ring-1 ring-white/60 shadow-sm">
            <Wrench className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">A calm map of what your home needs</h2>
            <p className="mt-1 text-xs text-foreground/70">{smartLine}</p>
          </div>
          <div className="hidden sm:block">
            <Button onClick={() => setAddOpen(true)} className="rounded-full">
              <Plus className="mr-1 h-4 w-4" /> Add task
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <HeroStat label="overdue"  value={allBuckets.overdue.length}  tone="rose" />
          <HeroStat label="due soon" value={allBuckets.due_soon.length} tone="amber" />
          <HeroStat label="upcoming" value={allBuckets.upcoming.length} tone="sky" />
        </div>

        {nextUp && (
          <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-white/70 p-3 ring-1 ring-white/60 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Next up</p>
              <p className="mt-0.5 truncate text-sm font-medium">{nextUp.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {relativeDue(nextUp.next_due)}{nextUp.category ? ` · ${nextUp.category}` : ""}
              </p>
            </div>
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => { void markDone(nextUp); toast.success("Nice — marked done"); }}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" /> Mark done
            </Button>
          </div>
        )}

        <div className="mt-3 flex justify-end sm:hidden">
          <Button onClick={() => setAddOpen(true)} className="rounded-full">
            <Plus className="mr-1 h-4 w-4" /> Add task
          </Button>
        </div>
      </article>

      {/* ============ AI SUGGEST (collapsed) ============ */}
      <div className="rounded-2xl border border-border/60 bg-card/60">
        <button
          onClick={() => setAiOpen(v => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Suggest tasks for my home
            <span className="text-xs font-normal text-muted-foreground">— AI fills the gaps</span>
          </span>
          {aiOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {aiOpen && (
          <div className="border-t border-border/60 p-3">
            <AiPanelShell
              title="AI maintenance suggestions"
              loading={ai.loading}
              hasData={!!ai.data}
              onRun={() => ai.run("maintenance", { existing: items.map((i) => i.title) })}
              onClose={() => { ai.setData(null); setAiOpen(false); }}
            >
              {ai.data && (
                <MaintenanceSuggestionList
                  items={ai.data.suggestions ?? []}
                  onAccept={async (s) => {
                    const err = await add({
                      title: s.title,
                      category: s.category || null,
                      interval_months: s.interval_months > 0 ? s.interval_months : null,
                    });
                    if (err) toast.error(err.message);
                    else toast.success(`Added "${s.title}"`);
                  }}
                />
              )}
            </AiPanelShell>
          </div>
        )}
      </div>

      {/* ============ CATEGORY CARDS ============ */}
      {categoryCards.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h3 className="font-display text-lg font-semibold tracking-tight">By category</h3>
            <button
              onClick={() => setFilter("all")}
              className={cn("text-xs font-medium hover:underline", filter === "all" ? "text-muted-foreground" : "text-primary")}
            >
              {filter === "all" ? "Showing all" : "Clear filter"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            <CategoryTile
              name="All"
              icon={Wrench}
              tone="bg-primary/15 text-primary"
              gradient="from-card to-card/60"
              ring="ring-border/60"
              counts={{ overdue: allBuckets.overdue.length, due_soon: allBuckets.due_soon.length, upcoming: allBuckets.upcoming.length, total: items.length }}
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />
            {categoryCards.map(c => {
              const s = categoryStyle(c.name === "Uncategorised" ? null : c.name);
              return (
                <CategoryTile
                  key={c.name}
                  name={c.name}
                  icon={s.icon}
                  tone={s.tone}
                  gradient={s.gradient}
                  ring={s.ring}
                  counts={c}
                  active={filter === c.name}
                  onClick={() => setFilter(filter === c.name ? "all" : c.name)}
                />
              );
            })}
          </div>
        </section>
      )}

      {loading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <SectionCard title="Nothing to maintain yet" accent="calm">
          <p className="text-sm text-muted-foreground">
            Add seasonal home tasks here — HVAC filters, gutter cleaning, pantry resets — and CareFlow will remind you.
          </p>
        </SectionCard>
      ) : (
        <div className="space-y-4">
          {BUCKET_ORDER.map((b) => grouped[b].length > 0 && (
            <div key={b} className={cn("rounded-2xl border p-4", BUCKET_ACCENT[b])}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold tracking-wide text-foreground/90">
                  {BUCKET_LABEL[b]}
                </h3>
                <span className="text-xs text-muted-foreground">{grouped[b].length}</span>
              </div>
              <ul className="space-y-1.5">
                {grouped[b].map((it) => {
                  const s = categoryStyle(it.category);
                  const Icon = s.icon;
                  return (
                    <li
                      key={it.id}
                      className="flex flex-wrap items-center gap-2.5 rounded-xl bg-card/80 px-3 py-2 text-sm shadow-sm"
                    >
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", s.tone)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 min-w-[140px]">
                        <span className="font-medium">{it.title}</span>
                        {it.category && <span className="ml-2 text-xs text-muted-foreground">· {it.category}</span>}
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          {relativeDue(it.next_due)}
                          {it.interval_months ? ` · every ${it.interval_months}mo` : ""}
                        </span>
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-full px-3 text-xs"
                          onClick={() => { void markDone(it); toast.success("Marked done"); }}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Done
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => { void snooze(it, 1); }}
                          title="Snooze 1 month"
                        >
                          <Snowflake className="mr-1 h-3.5 w-3.5" /> 1mo
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => { void remove(it.id); }}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ============ ADD TASK SHEET ============ */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Add maintenance task</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input
              placeholder="e.g. Replace HVAC filter"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              placeholder="Category (HVAC, lawn, plumbing…)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Select
              value={form.interval === "" ? "0" : String(form.interval)}
              onValueChange={(v) => setForm({ ...form, interval: v === "0" ? "" : Number(v) })}
            >
              <SelectTrigger><SelectValue placeholder="Recurrence" /></SelectTrigger>
              <SelectContent>
                {INTERVAL_PRESETS.map((p) => (
                  <SelectItem key={p.label} value={p.value === "" ? "0" : String(p.value)}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={form.next_due}
              onChange={(e) => setForm({ ...form, next_due: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Leave the date empty and we'll compute the next due date from your recurrence.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-full" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={onAdd} className="rounded-full">
                <Plus className="mr-1 h-4 w-4" /> Add task
              </Button>
            </div>
          </div>
        </SheetContent>
        <SheetTrigger className="hidden" />
      </Sheet>
    </div>
  );
}

function HeroStat({ label, value, tone }: { label: string; value: number; tone: "rose" | "amber" | "sky" }) {
  const tones: Record<string, string> = {
    rose: "bg-rose-100/80 text-rose-700",
    amber: "bg-amber-100/80 text-amber-700",
    sky: "bg-sky-100/80 text-sky-700",
  };
  return (
    <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60 backdrop-blur-sm">
      <p className={cn("inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", tones[tone])}>{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums leading-tight">{value}</p>
    </div>
  );
}

function CategoryTile({
  name, icon: Icon, tone, gradient, ring, counts, active, onClick,
}: {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  gradient: string;
  ring: string;
  counts: { overdue: number; due_soon: number; upcoming: number; total: number };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col gap-2 rounded-2xl bg-gradient-to-br p-3 text-left ring-1 transition-all hover:-translate-y-0.5 hover:shadow-soft",
        gradient, ring,
        active && "ring-2 ring-primary/60",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-white/60", tone)}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-foreground/70 ring-1 ring-white/60">
          {counts.total}
        </span>
      </div>
      <p className="truncate font-display text-sm font-semibold text-foreground/90">{name}</p>
      <div className="flex flex-wrap items-center gap-1 text-[10px]">
        {counts.overdue > 0 && <span className="rounded-full bg-rose-100/80 px-1.5 py-0.5 font-semibold text-rose-700">{counts.overdue} overdue</span>}
        {counts.due_soon > 0 && <span className="rounded-full bg-amber-100/80 px-1.5 py-0.5 font-semibold text-amber-700">{counts.due_soon} soon</span>}
        {counts.upcoming > 0 && <span className="rounded-full bg-sky-100/80 px-1.5 py-0.5 font-semibold text-sky-700">{counts.upcoming} later</span>}
        {counts.overdue + counts.due_soon + counts.upcoming === 0 && counts.total > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">all clear</span>
        )}
      </div>
    </button>
  );
}