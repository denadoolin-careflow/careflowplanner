import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { aiInvoke } from "@/lib/ai-invoke";
import { inferEnergyFromTitle } from "@/lib/task-energy";
import { AREAS, type Area, type Energy, type Priority, type TaskStatus } from "@/lib/types";
import {
  Sparkles, RefreshCw, ArrowRight, ArrowLeft, Check, SkipForward, Trash2,
  Calendar as CalendarIcon, Zap, Heart, Inbox as InboxIcon, X,
} from "lucide-react";
import { addDays, format, parseISO } from "date-fns";

interface Suggestion {
  task_id: string;
  area?: string;
  project_id?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  suggested_due_date?: string | null;
}

interface Decision {
  area?: Area;
  dueDate?: string;
  energy?: Energy;
  priority?: Priority;
  status?: TaskStatus;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: any[];
  updateTask: (id: string, patch: any) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

const ENERGY_OPTS: { value: Energy; emoji: string; label: string; tint: string }[] = [
  { value: "low",    emoji: "🌱", label: "Low",    tint: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { value: "medium", emoji: "⚡", label: "Medium", tint: "bg-amber-50 text-amber-700 ring-amber-200" },
  { value: "high",   emoji: "🔥", label: "High",   tint: "bg-rose-50 text-rose-700 ring-rose-200" },
];

const PRIORITY_OPTS: { value: Priority; label: string; tint: string }[] = [
  { value: "low",    label: "Low",    tint: "bg-stone-50 text-stone-700 ring-stone-200" },
  { value: "medium", label: "Medium", tint: "bg-sky-50 text-sky-700 ring-sky-200" },
  { value: "high",   label: "High",   tint: "bg-rose-50 text-rose-700 ring-rose-200" },
];

const STATUS_OPTS: { value: TaskStatus; label: string }[] = [
  { value: "active",    label: "Do soon" },
  { value: "this_week", label: "This week" },
  { value: "someday",   label: "Someday" },
  { value: "waiting",   label: "Waiting" },
];

function isoDay(d: Date) { return format(d, "yyyy-MM-dd"); }

export function ProcessInboxDialog({ open, onOpenChange, items, updateTask, deleteTask }: Props) {
  const [queue, setQueue] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [processed, setProcessed] = useState<Set<string>>(new Set());
  const [triaging, setTriaging] = useState(false);
  const [phase, setPhase] = useState<"intro" | "review" | "done">("intro");

  const itemMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const t of items) m[t.id] = t;
    return m;
  }, [items]);

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    const ids = items.map(t => t.id);
    setQueue(ids);
    setIdx(0);
    setSuggestions({});
    setDecisions({});
    setSkipped(new Set());
    setProcessed(new Set());
    setPhase(ids.length === 0 ? "done" : "intro");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const runTriage = async () => {
    setTriaging(true);
    try {
      const { data, error } = await aiInvoke("ai-inbox-triage", { body: {} });
      if (error) throw error;
      const map: Record<string, Suggestion> = {};
      const seed: Record<string, Decision> = {};
      for (const s of (data as any)?.suggestions ?? []) {
        if (!s?.task_id) continue;
        map[s.task_id] = s as Suggestion;
      }
      // Seed decisions from suggestions + local heuristics
      for (const t of items) {
        const s = map[t.id];
        const energy = (t.energy as Energy | undefined) ?? inferEnergyFromTitle(t.title, t.notes);
        seed[t.id] = {
          area: (s?.area as Area) ?? (t.area as Area | undefined),
          dueDate: s?.suggested_due_date ?? t.dueDate ?? undefined,
          energy,
          priority: (s?.priority as Priority) ?? (t.priority as Priority | undefined) ?? "medium",
          status: (s?.status as TaskStatus) ?? "active",
        };
      }
      setSuggestions(map);
      setDecisions(seed);
      setPhase("review");
      toast.success("Ready when you are ✨", { description: `Walk through ${items.length} item${items.length === 1 ? "" : "s"}.` });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't organize right now");
    } finally {
      setTriaging(false);
    }
  };

  const skipTriage = () => {
    const seed: Record<string, Decision> = {};
    for (const t of items) {
      seed[t.id] = {
        area: t.area as Area | undefined,
        dueDate: t.dueDate ?? undefined,
        energy: (t.energy as Energy | undefined) ?? inferEnergyFromTitle(t.title, t.notes),
        priority: (t.priority as Priority | undefined) ?? "medium",
        status: "active",
      };
    }
    setDecisions(seed);
    setPhase("review");
  };

  const currentId = queue[idx];
  const current = currentId ? itemMap[currentId] : null;
  const decision = currentId ? decisions[currentId] ?? {} : {};
  const suggestion = currentId ? suggestions[currentId] : undefined;

  const setField = <K extends keyof Decision>(k: K, v: Decision[K]) => {
    if (!currentId) return;
    setDecisions(prev => ({ ...prev, [currentId]: { ...prev[currentId], [k]: v } }));
  };

  const advance = () => {
    if (idx + 1 >= queue.length) {
      setPhase("done");
    } else {
      setIdx(idx + 1);
    }
  };

  const accept = async () => {
    if (!current) return;
    const d = decisions[current.id] ?? {};
    await updateTask(current.id, {
      area: d.area,
      dueDate: d.dueDate,
      energy: d.energy,
      priority: d.priority,
      status: d.status ?? "active",
      projectId: suggestion?.project_id ?? undefined,
      inbox: false,
    });
    setProcessed(prev => new Set(prev).add(current.id));
    advance();
  };

  const skip = () => {
    if (!current) return;
    setSkipped(prev => new Set(prev).add(current.id));
    advance();
  };

  const remove = async () => {
    if (!current) return;
    await deleteTask(current.id);
    setProcessed(prev => new Set(prev).add(current.id));
    advance();
  };

  const back = () => { if (idx > 0) setIdx(idx - 1); };

  const total = queue.length;
  const completedCount = processed.size + skipped.size;
  const progress = total === 0 ? 100 : Math.round((completedCount / total) * 100);

  const today = new Date();
  const datePresets = [
    { label: "Today",    value: isoDay(today) },
    { label: "Tomorrow", value: isoDay(addDays(today, 1)) },
    { label: "This week",value: isoDay(addDays(today, 3)) },
    { label: "Next week",value: isoDay(addDays(today, 7)) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] gap-0 overflow-hidden rounded-[28px] border-border/40 bg-card p-0 shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.5)]">
        {/* Header */}
        <div className="relative border-b border-border/40 bg-gradient-to-br from-[hsl(36_60%_97%)] via-card to-[hsl(150_30%_96%)] px-6 py-5 dark:from-card dark:to-card">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl tracking-tight">Process Inbox</h2>
              <p className="text-[12.5px] text-muted-foreground">
                {phase === "intro" && "Let me suggest a home for each item."}
                {phase === "review" && `Item ${Math.min(idx + 1, total)} of ${total}`}
                {phase === "done" && "All done — your inbox is lighter."}
              </p>
            </div>
          </div>
          {phase === "review" && (
            <div className="mt-4">
              <Progress value={progress} className="h-1.5 bg-primary/10" />
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{processed.size} organized · {skipped.size} skipped</span>
                <span>{total - completedCount} left</span>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {phase === "intro" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary/10 text-primary">
                <InboxIcon className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <p className="font-display text-lg tracking-tight">
                  {items.length} item{items.length === 1 ? "" : "s"} ready to organize
                </p>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                  I'll suggest a category, date, energy level, and priority for each one.
                  You stay in charge — accept, edit, skip, or delete as you go.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-2 pt-2 sm:flex-row sm:justify-center">
                <Button
                  onClick={() => void runTriage()}
                  disabled={triaging || items.length === 0}
                  className="h-11 gap-2 rounded-full px-5"
                >
                  {triaging ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Organize for Me
                </Button>
                <Button
                  variant="outline"
                  onClick={skipTriage}
                  disabled={items.length === 0}
                  className="h-11 rounded-full px-5"
                >
                  I'll do it myself
                </Button>
              </div>
            </div>
          )}

          {phase === "review" && current && (
            <div className="space-y-5 animate-fade-in">
              {/* Task title */}
              <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Item</p>
                <p className="mt-1 font-display text-[18px] leading-snug tracking-tight">{current.title}</p>
                {current.notes && (
                  <p className="mt-1.5 line-clamp-2 text-[13px] text-muted-foreground">{current.notes}</p>
                )}
                {suggestion && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary">
                    <Sparkles className="h-3 w-3" /> AI suggested
                  </div>
                )}
              </div>

              {/* Category */}
              <Field label="Category" icon={<Heart className="h-3.5 w-3.5" />}>
                <div className="flex flex-wrap gap-1.5">
                  {AREAS.map(a => {
                    const active = decision.area === a;
                    return (
                      <button
                        key={a}
                        onClick={() => setField("area", a)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-[12.5px] ring-1 transition-all hover:-translate-y-0.5",
                          active
                            ? "bg-primary text-primary-foreground ring-primary shadow-sm"
                            : "bg-background ring-border/60 hover:bg-muted/60",
                        )}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* When */}
              <Field label="When" icon={<CalendarIcon className="h-3.5 w-3.5" />}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {datePresets.map(p => {
                    const active = decision.dueDate === p.value;
                    return (
                      <button
                        key={p.label}
                        onClick={() => setField("dueDate", p.value)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-[12.5px] ring-1 transition-all hover:-translate-y-0.5",
                          active
                            ? "bg-primary text-primary-foreground ring-primary shadow-sm"
                            : "bg-background ring-border/60 hover:bg-muted/60",
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                  <Input
                    type="date"
                    value={decision.dueDate ?? ""}
                    onChange={(e) => setField("dueDate", e.target.value || undefined)}
                    className="h-9 w-[150px] rounded-full border-border/60 px-3 text-[12.5px]"
                  />
                  {decision.dueDate && (
                    <button
                      onClick={() => setField("dueDate", undefined)}
                      className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:bg-muted"
                    >
                      <X className="h-3 w-3" /> No date
                    </button>
                  )}
                </div>
                {decision.dueDate && (
                  <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                    {format(parseISO(decision.dueDate), "EEEE, MMM d")}
                  </p>
                )}
              </Field>

              {/* Energy */}
              <Field label="Energy" icon={<Zap className="h-3.5 w-3.5" />}>
                <div className="flex flex-wrap gap-1.5">
                  {ENERGY_OPTS.map(o => {
                    const active = decision.energy === o.value;
                    return (
                      <button
                        key={o.value}
                        onClick={() => setField("energy", o.value)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] ring-1 transition-all hover:-translate-y-0.5",
                          active ? cn(o.tint, "ring-2 shadow-sm") : "bg-background ring-border/60 hover:bg-muted/60",
                        )}
                      >
                        <span>{o.emoji}</span> {o.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Priority + Status (compact row) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Priority">
                  <div className="flex flex-wrap gap-1.5">
                    {PRIORITY_OPTS.map(o => {
                      const active = decision.priority === o.value;
                      return (
                        <button
                          key={o.value}
                          onClick={() => setField("priority", o.value)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-[12.5px] ring-1 transition-all hover:-translate-y-0.5",
                            active ? cn(o.tint, "ring-2 shadow-sm") : "bg-background ring-border/60 hover:bg-muted/60",
                          )}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Status">
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTS.map(o => {
                      const active = (decision.status ?? "active") === o.value;
                      return (
                        <button
                          key={o.value}
                          onClick={() => setField("status", o.value)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-[12.5px] ring-1 transition-all hover:-translate-y-0.5",
                            active
                              ? "bg-primary text-primary-foreground ring-primary shadow-sm"
                              : "bg-background ring-border/60 hover:bg-muted/60",
                          )}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-4 py-6 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-100 text-emerald-700">
                <Check className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-xl tracking-tight">Your inbox is lighter 🌿</p>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  {processed.size > 0 ? `${processed.size} organized` : "Nothing organized"}
                  {skipped.size > 0 ? ` · ${skipped.size} left for later` : ""}
                </p>
              </div>
              <Button onClick={() => onOpenChange(false)} className="h-11 rounded-full px-6">
                Done
              </Button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {phase === "review" && current && (
          <div className="flex items-center justify-between gap-2 border-t border-border/40 bg-background/60 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={back}
                disabled={idx === 0}
                className="h-9 gap-1.5 rounded-full px-3 text-[12.5px]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void remove()}
                className="h-9 gap-1.5 rounded-full px-3 text-[12.5px] text-muted-foreground hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={skip}
                className="h-9 gap-1.5 rounded-full px-3 text-[12.5px]"
              >
                <SkipForward className="h-3.5 w-3.5" /> Skip
              </Button>
              <Button
                size="sm"
                onClick={() => void accept()}
                className="h-9 gap-1.5 rounded-full px-4 text-[12.5px]"
              >
                Accept <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}