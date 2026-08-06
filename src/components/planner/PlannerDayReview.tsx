import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Sparkles, NotebookPen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { useBurnoutCheckIn, BURNOUT_META, type BurnoutLevel } from "@/lib/burnout-checkin";
import { toast } from "sonner";

const LEVELS: BurnoutLevel[] = ["spacious", "steady", "tender", "depleted"];

const PROMPTS = [
  "What felt lighter than expected today?",
  "What took more from you than it looked like it would?",
  "What's one thing you'd like to carry gently into tomorrow?",
];

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-muted/40 px-2 py-2 text-center">
      <div className="font-display text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

/** End-of-day review: planned vs completed, a gentle reflection, and a burnout check-in. */
export function PlannerDayReview({ date, className }: { date: Date; className?: string }) {
  const { state, addJournal } = useStore();
  const { entry, setLevel } = useBurnoutCheckIn(date);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const iso = format(date, "yyyy-MM-dd");

  const stats = useMemo(() => {
    const tasks = state.tasks.filter(t => t.dueDate === iso && !t.parentTaskId && t.status !== "parked");
    const done = tasks.filter(t => t.done);
    const appts = state.appointments.filter(a => a.date === iso);
    const plannedMin = tasks.reduce((s, t) => s + (t.estMinutes ?? 30), 0);
    const doneMin = done.reduce((s, t) => s + (t.estMinutes ?? 30), 0);
    const pct = tasks.length === 0 ? 0 : Math.round((done.length / tasks.length) * 100);
    return { planned: tasks.length, done: done.length, open: tasks.length - done.length, appts: appts.length, plannedMin, doneMin, pct };
  }, [state.tasks, state.appointments, iso]);

  const prompt = PROMPTS[new Date(iso).getDate() % PROMPTS.length];

  const save = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addJournal({
        date: iso,
        type: "daily",
        title: `Day review — ${format(date, "MMM d")}`,
        body: note.trim(),
        tags: ["day-review"],
      } as any);
      setNote("");
      toast("Reflection saved to your journal");
    } catch {
      toast.error("Couldn't save that. Try again?");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Day review" className={`cozy-card space-y-3 p-3 ${className ?? ""}`}>
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Day review</p>
          <h3 className="truncate font-display text-base font-semibold">Planned vs completed</h3>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{stats.pct}%</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-secondary transition-all duration-700"
          style={{ width: `${stats.pct}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Tile label="Planned" value={stats.planned} />
        <Tile label="Done" value={stats.done} />
        <Tile label="Open" value={stats.open} />
        <Tile label="Events" value={stats.appts} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {Math.round(stats.doneMin / 6) / 10}h of {Math.round(stats.plannedMin / 6) / 10}h planned effort completed.
      </p>

      <div className="space-y-1.5">
        <p className="flex items-center gap-1.5 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5 text-accent-foreground" /> Gentle reflection
        </p>
        <p className="text-[11px] text-muted-foreground">{prompt}</p>
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          placeholder="A sentence is enough…"
          aria-label="Day reflection"
          className="resize-none text-sm leading-snug"
        />
        <Button size="sm" onClick={save} disabled={saving || !note.trim()} className="h-8 w-full rounded-full text-xs">
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <NotebookPen className="mr-1.5 h-3.5 w-3.5" />}
          Save to journal
        </Button>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium">How depleted do you feel?</p>
        <div className="grid grid-cols-2 gap-1.5">
          {LEVELS.map(l => {
            const meta = BURNOUT_META[l];
            const active = entry.level === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(active ? null : l)}
                aria-pressed={active}
                className={`rounded-xl border px-2 py-1.5 text-left text-xs transition-colors ${
                  active ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50"
                }`}
              >
                <span className="mr-1">{meta.emoji}</span>
                <span className="font-medium">{meta.label}</span>
              </button>
            );
          })}
        </div>
        {entry.level && (
          <p className="text-[11px] text-muted-foreground">{BURNOUT_META[entry.level].hint}</p>
        )}
      </div>
    </section>
  );
}
