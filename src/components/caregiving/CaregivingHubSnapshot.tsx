import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { aiInvoke } from "@/lib/ai-invoke";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Heart, Target, RefreshCw, Check } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { toast } from "sonner";

const STORAGE_KEY = "careflow:hub-focus-task";

export function CaregivingHubSnapshot() {
  const { state, toggleTask } = useStore();
  const [snapshot, setSnapshot] = useState<string>("");
  const [encouragement, setEncouragement] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [focusId, setFocusId] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) ?? ""; } catch { return ""; }
  });

  const careTasks = useMemo(() => {
    const recipientIds = new Set(state.recipients.map(r => r.id));
    return state.tasks
      .filter(t => !t.done && (t.recipientId && recipientIds.has(t.recipientId) || t.area === "Caregiving"))
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  }, [state.tasks, state.recipients]);

  const focusTask = careTasks.find(t => t.id === focusId) ?? null;

  const buildPayload = () => {
    const since = format(subDays(new Date(), 14), "yyyy-MM-dd");
    const nameOf = (rid?: string) => state.recipients.find(r => r.id === rid)?.name;
    return {
      people: state.recipients.map(r => ({ name: r.name, kind: r.kind })),
      recentTasks: state.tasks
        .filter(t => t.done && (t.lastCompletedAt?.slice(0, 10) ?? "") >= since)
        .map(t => ({ title: t.title, who: nameOf(t.recipientId) })),
      recentNotes: state.careNotes
        .filter(n => n.date >= since)
        .map(n => ({ who: nameOf(n.recipientId) ?? "—", body: n.body.slice(0, 160) })),
      upcomingAppts: state.appointments
        .filter(a => a.date >= format(new Date(), "yyyy-MM-dd"))
        .slice(0, 20)
        .map(a => ({ date: a.date, title: a.title, who: nameOf(a.recipientId) })),
      recentJournal: state.journal
        .filter(j => j.date >= since)
        .map(j => ({ title: j.title, snippet: j.body.slice(0, 140) })),
      routines: [],
      chores: state.cleaning.filter(c => !c.done).map(c => c.title),
    };
  };

  const generate = async () => {
    if (state.recipients.length === 0) return;
    setLoading(true);
    const { data, error, quotaExceeded } = await aiInvoke<any>("ai-caregiving-hub", {
      body: buildPayload(),
    });
    setLoading(false);
    if (quotaExceeded) return;
    if (error) { toast.error("Couldn't generate snapshot"); return; }
    setSnapshot(data?.payload?.snapshot ?? "");
    setEncouragement(data?.payload?.encouragement ?? "");
  };

  useEffect(() => {
    if (state.recipients.length > 0 && !snapshot) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.recipients.length]);

  const pickFocus = (id: string) => {
    setFocusId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  };

  const completeFocus = async () => {
    if (!focusTask) return;
    await toggleTask(focusTask.id);
    pickFocus("");
    toast.success("Nice — one less thing on your plate.");
  };

  if (state.recipients.length === 0) return null;

  return (
    <div className="cozy-card gradient-warm space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Caregiving snapshot</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 rounded-full px-2 text-xs" onClick={generate} disabled={loading}>
          <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading && !snapshot ? (
        <p className="text-sm text-muted-foreground">Gathering recent care activity…</p>
      ) : snapshot ? (
        <p className="text-sm leading-relaxed">{snapshot}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Tap refresh for an AI snapshot of recent care across your people.</p>
      )}

      {encouragement && (
        <div className="flex items-start gap-2 rounded-xl bg-card/60 p-3">
          <Heart className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-sm italic text-muted-foreground">{encouragement}</p>
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-card/60 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Target className="h-3.5 w-3.5" /> Focus on next
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={focusId || undefined} onValueChange={pickFocus}>
            <SelectTrigger className="h-9 min-w-[240px] flex-1 rounded-full bg-background">
              <SelectValue placeholder={careTasks.length === 0 ? "No open caregiving tasks" : "Pick a caregiving task…"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {careTasks.map(t => {
                const who = state.recipients.find(r => r.id === t.recipientId)?.name;
                return (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}{who ? ` · ${who}` : ""}{t.dueDate ? ` · ${format(parseISO(t.dueDate), "MMM d")}` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {focusTask && (
            <Button size="sm" className="h-9 rounded-full" onClick={completeFocus}>
              <Check className="mr-1 h-3.5 w-3.5" /> Done
            </Button>
          )}
        </div>
        {focusTask && (
          <p className="mt-2 text-xs text-muted-foreground">
            Next up: <span className="font-medium text-foreground">{focusTask.title}</span>
            {focusTask.notes ? ` — ${focusTask.notes}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}