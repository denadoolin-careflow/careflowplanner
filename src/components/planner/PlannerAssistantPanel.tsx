import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Check, Info, RefreshCw, Shuffle, Sparkles, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Task } from "@/lib/types";
import { useAutoSchedulePrefs } from "@/lib/auto-schedule-prefs";
import { aiInvoke } from "@/lib/ai-invoke";
import {
  buildNudges, buildSuggestions, nextFreeStart, rangeLabel,
  type BusyRange, type Suggestion,
} from "@/lib/planner/schedule-assistant";

interface Props {
  date: Date;
  /** Tasks due this day with no clock time yet. */
  unscheduled: Task[];
  /** Everything already occupying the day, in absolute minutes. */
  busy: BusyRange[];
  /** Commit a placement (goes through planner history + undo). */
  onPlace: (taskId: string, absMin: number) => Promise<void>;
  className?: string;
}

/**
 * Smart scheduling assistant: instant rule-based placements from your
 * auto-schedule preferences, with an optional AI pass from Carey.
 */
export function PlannerAssistantPanel({ date, unscheduled, busy, onPlace, className }: Props) {
  const { prefs } = useAutoSchedulePrefs();
  const [open, setOpen] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const [aiOrder, setAiOrder] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [placing, setPlacing] = useState(false);

  const isToday = format(new Date(), "yyyy-MM-dd") === format(date, "yyyy-MM-dd");

  const base = useMemo(
    () => buildSuggestions({ tasks: unscheduled.filter(t => !skipped.includes(t.id)), busy, prefs, isToday }),
    [unscheduled, skipped, busy, prefs, isToday],
  );

  const suggestions: Suggestion[] = useMemo(() => {
    const withOverrides = base.map(s => ({
      ...s,
      startAbsMin: overrides[s.taskId] ?? s.startAbsMin,
      reason: aiReasons[s.taskId] ?? s.reason,
    }));
    if (!aiOrder.length) return withOverrides;
    const rank = new Map(aiOrder.map((id, i) => [id, i]));
    return withOverrides.slice().sort((a, b) => (rank.get(a.taskId) ?? 999) - (rank.get(b.taskId) ?? 999));
  }, [base, overrides, aiReasons, aiOrder]);

  const nudges = useMemo(() => buildNudges({ busy, prefs, unscheduled }), [busy, prefs, unscheduled]);

  if (!unscheduled.length && !nudges.length) return null;

  const place = async (s: Suggestion) => {
    setPlacing(true);
    try {
      await onPlace(s.taskId, s.startAbsMin);
      setSkipped(x => [...x, s.taskId]);
    } finally { setPlacing(false); }
  };

  const placeAll = async () => {
    if (!suggestions.length) return;
    setPlacing(true);
    try {
      for (const s of suggestions) await onPlace(s.taskId, s.startAbsMin);
      toast.success(`Placed ${suggestions.length} task${suggestions.length === 1 ? "" : "s"}`);
    } finally { setPlacing(false); }
  };

  const anotherSlot = (s: Suggestion) => {
    const others = [...busy, ...suggestions.filter(o => o.taskId !== s.taskId).map(o => ({ start: o.startAbsMin, end: o.startAbsMin + o.durMin }))];
    const next = nextFreeStart(others, s.startAbsMin + 15, s.durMin, prefs);
    if (next === null) { toast.info("No later slot fits today"); return; }
    setOverrides(o => ({ ...o, [s.taskId]: next }));
  };

  const askCarey = async () => {
    setAiLoading(true);
    setAiSummary(null);
    try {
      const { data, error } = await aiInvoke<{ text?: string; plan?: any }>("ai-planner", {
        body: { action: "organize_day" },
      });
      if (error) throw error;
      const plan = (data as any)?.plan;
      if (!plan?.buckets) {
        setAiSummary((data as any)?.text ?? "Carey couldn't shape a plan right now — the suggestions below still stand.");
        return;
      }
      const order: string[] = [];
      const reasons: Record<string, string> = {};
      const times: Record<string, number> = {};
      for (const bucket of plan.buckets ?? []) {
        for (const item of bucket.items ?? []) {
          const match = unscheduled.find(t => t.title.toLowerCase().trim() === String(item.title ?? "").toLowerCase().trim());
          if (!match) continue;
          order.push(match.id);
          if (item.why) reasons[match.id] = `${bucket.label}: ${item.why}`;
          const hm = /^(\d{1,2}):(\d{2})$/.exec(String(item.suggested_time ?? ""));
          if (hm) times[match.id] = Number(hm[1]) * 60 + Number(hm[2]);
        }
      }
      setAiOrder(order);
      setAiReasons(reasons);
      setOverrides(o => ({ ...o, ...times }));
      setAiSummary(plan.summary ?? null);
      if (!order.length) toast.info("Carey didn't recognise any of today's tasks — keeping the instant plan.");
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Carey is unavailable right now";
      toast.error(msg.includes("429") ? "Carey is busy — the instant suggestions still work." : msg);
    } finally { setAiLoading(false); }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 to-card/70", className)}>
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left">
          <Wand2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-semibold">Scheduling assistant</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              {suggestions.length
                ? `${suggestions.length} placement${suggestions.length === 1 ? "" : "s"} ready`
                : "Nothing to place — your day looks set"}
              {nudges.length ? ` · ${nudges.length} note${nudges.length === 1 ? "" : "s"}` : ""}
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{open ? "Hide" : "Review"}</span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-2 border-t border-border/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="h-7 rounded-full text-[11px]" disabled={!suggestions.length || placing} onClick={() => void placeAll()}>
              <Check className="mr-1 h-3 w-3" />Place all
            </Button>
            <Button size="sm" variant="outline" className="h-7 rounded-full text-[11px]" disabled={aiLoading} onClick={() => void askCarey()}>
              <Sparkles className={cn("mr-1 h-3 w-3", aiLoading && "animate-pulse")} />
              {aiLoading ? "Carey is thinking…" : "Ask Carey"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 rounded-full text-[11px]" onClick={() => { setSkipped([]); setOverrides({}); setAiOrder([]); setAiReasons({}); setAiSummary(null); }}>
              <RefreshCw className="mr-1 h-3 w-3" />Reset
            </Button>
          </div>

          {aiSummary && (
            <p className="rounded-xl bg-card/70 px-3 py-2 text-[12px] italic text-muted-foreground">{aiSummary}</p>
          )}

          {nudges.length > 0 && (
            <ul className="space-y-1">
              {nudges.map(n => (
                <li key={n.id} className={cn(
                  "flex items-start gap-2 rounded-xl px-2.5 py-1.5 text-[11.5px]",
                  n.tone === "warn" ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-muted-foreground",
                )}>
                  {n.tone === "warn" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                  <span>{n.message}</span>
                </li>
              ))}
            </ul>
          )}

          <ul className="space-y-1.5">
            {suggestions.map(s => (
              <li key={s.taskId} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card/80 px-2.5 py-2 text-[12px]">
                <div className="min-w-[180px] flex-1">
                  <div className="font-medium [overflow-wrap:anywhere]">{s.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-mono">{rangeLabel(s.startAbsMin, s.durMin)}</span> · {s.durMin}m · {s.reason}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" className="h-7 rounded-full text-[11px]" disabled={placing} onClick={() => void place(s)}>Place</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Pick another slot" onClick={() => anotherSlot(s)}>
                    <Shuffle className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Skip this suggestion" onClick={() => setSkipped(x => [...x, s.taskId])}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
            {!suggestions.length && (
              <li className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-center text-[11.5px] text-muted-foreground">
                Nothing left to place for this day.
              </li>
            )}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
