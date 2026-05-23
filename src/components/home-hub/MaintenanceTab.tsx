import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/cards/SectionCard";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BUCKET_LABEL, bucketOf, useHomeMaintenance, type MaintenanceBucket, type MaintenanceItem,
} from "@/lib/home-maintenance";
import { cn } from "@/lib/utils";
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

export function MaintenanceTab() {
  const { items, loading, add, update, remove, markDone } = useHomeMaintenance();
  const [form, setForm] = useState({ title: "", category: "", interval: "" as number | "", next_due: "" });
  const [filter, setFilter] = useState<string>("all");
  const ai = useAiSuggest<{ suggestions: MaintenanceSuggestion[] }>();
  const [aiOpen, setAiOpen] = useState(true);

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
  };

  return (
    <div className="space-y-5">
      {aiOpen && (
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
      )}

      <SectionCard title="Add maintenance task" accent="warm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          <Input
            placeholder="e.g. Replace HVAC filter"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="sm:col-span-2"
          />
          <Input
            placeholder="Category (HVAC, lawn…)"
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
        </div>
        <div className="mt-2 flex justify-end">
          <Button onClick={onAdd} className="rounded-full">
            <Plus className="mr-1 h-4 w-4" /> Add task
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Leave the date empty and we'll compute the next due date from your recurrence.
        </p>
      </SectionCard>

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Filter:</span>
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full border px-3 py-1 transition-colors",
              filter === "all" ? "border-primary/50 bg-primary/15 text-primary" : "border-border/60 bg-card/60 text-muted-foreground",
            )}
          >All</button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                "rounded-full border px-3 py-1 transition-colors",
                filter === c ? "border-primary/50 bg-primary/15 text-primary" : "border-border/60 bg-card/60 text-muted-foreground",
              )}
            >{c}</button>
          ))}
        </div>
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
                {grouped[b].map((it) => (
                  <li
                    key={it.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl bg-card/80 px-3 py-2 text-sm shadow-sm"
                  >
                    <span className="flex-1 min-w-[160px]">
                      <span className="font-medium">{it.title}</span>
                      {it.category && <span className="ml-2 text-xs text-muted-foreground">· {it.category}</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {it.next_due ? `Due ${it.next_due}` : "No schedule"}
                      {it.interval_months ? ` · every ${it.interval_months} mo` : ""}
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
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}