import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { parseTaskInput } from "@/lib/nlp-task";
import { PlannerTimeline } from "./PlannerTimeline";
import { PlannerTaskRow } from "./PlannerTaskRow";
import { Star, Sparkles, Leaf, Sunrise } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/types";

type Step = 0 | 1 | 2 | 3;
const STEPS = [
  { label: "Capture", prompt: "What's on your mind?", Icon: Sunrise },
  { label: "Anchor", prompt: "What needs to stay steady today?", Icon: Star },
  { label: "Rhythm", prompt: "Let's shape the day around real life.", Icon: Sparkles },
  { label: "Exhale", prompt: "Does this day feel doable?", Icon: Leaf },
];

export function PlanMyDayDialog({ open, onOpenChange, date }: { open: boolean; onOpenChange: (o: boolean) => void; date: Date }) {
  const { state, addTask, updateTask } = useStore();
  const [step, setStep] = useState<Step>(0);
  const [captureText, setCaptureText] = useState("");
  const [confirm, setConfirm] = useState<null | "lighten" | "move">(null);
  const iso = format(date, "yyyy-MM-dd");

  const dayTasks = useMemo(() => state.tasks.filter(t => t.dueDate === iso && !t.done), [state.tasks, iso]);
  const scheduled = dayTasks.filter(t => !!t.startTime);
  const unscheduled = dayTasks.filter(t => !t.startTime);
  const priorities = dayTasks.filter(t => t.isTopThree);
  const appts = state.appointments.filter(a => a.date === iso);

  const totalMin = scheduled.reduce((s, t) => s + (t.estMinutes ?? 30), 0);
  const load = totalMin < 180 ? "Light" : totalMin < 360 ? "Balanced" : totalMin < 540 ? "Full" : "Overloaded";
  const loadTone = load === "Light" ? "text-emerald-600" : load === "Balanced" ? "text-sky-600" : load === "Full" ? "text-amber-600" : "text-rose-600";

  const flexScheduled = useMemo(
    () => scheduled.filter(t => !t.isTopThree),
    [scheduled],
  );
  const lightenPreview = useMemo(() => {
    const sorted = [...flexScheduled].sort(
      (a, b) => (a.priority === "high" ? 0 : 1) - (b.priority === "high" ? 0 : 1),
    );
    return sorted.slice(-Math.max(1, Math.floor(sorted.length / 3)));
  }, [flexScheduled]);
  const lightenMin = lightenPreview.reduce((s, t) => s + (t.estMinutes ?? 30), 0);
  const moveMin = flexScheduled.reduce((s, t) => s + (t.estMinutes ?? 30), 0);
  const tomorrowLabel = format(new Date(date.getTime() + 86400000), "EEE, MMM d");

  const capture = async () => {
    const lines = captureText.split("\n").map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const p = parseTaskInput(line);
      await addTask({
        title: p.title || line,
        area: p.area ?? "Personal",
        priority: p.priority ?? "medium",
        done: false,
        dueDate: p.dueDate ?? iso,
        estMinutes: p.estMinutes,
        tags: p.tags,
      } as any);
    }
    setCaptureText("");
    toast.success(`Captured ${lines.length} item${lines.length === 1 ? "" : "s"}`);
  };

  const togglePriority = async (t: Task) => {
    if (!t.isTopThree && priorities.length >= 3) { toast("Max 3 priorities today"); return; }
    await updateTask(t.id, { isTopThree: !t.isTopThree });
  };

  const lightenDay = async () => {
    for (const t of lightenPreview) await updateTask(t.id, { startTime: undefined });
    toast.success(`Freed ${lightenPreview.length} task${lightenPreview.length === 1 ? "" : "s"} — they're still on today, just unscheduled.`);
    setConfirm(null);
  };

  const moveFlexibleToTomorrow = async () => {
    const tomorrow = format(new Date(date.getTime() + 86400000), "yyyy-MM-dd");
    for (const t of flexScheduled) await updateTask(t.id, { dueDate: tomorrow, startTime: undefined });
    toast.success(`Moved ${flexScheduled.length} task${flexScheduled.length === 1 ? "" : "s"} to ${tomorrowLabel}.`);
    setConfirm(null);
  };

  const S = STEPS[step];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-border/60 bg-muted/30 px-5 py-3">
          <S.Icon className="h-4 w-4 text-primary" />
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Plan my day · {S.label}</DialogTitle>
            <p className="font-display text-lg">{S.prompt}</p>
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <span key={i} className={cn("h-1.5 w-6 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted-foreground/20")} />
            ))}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {step === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">One thought per line. Enter to add. Use <code>#tag @area p1</code> for quick metadata.</p>
              <textarea value={captureText} onChange={(e) => setCaptureText(e.target.value)}
                rows={6} placeholder="Grocery run&#10;Call insurance about claim p1&#10;Read 20m #focus"
                className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm outline-none focus:border-primary" />
              <div className="flex justify-end"><Button size="sm" onClick={capture} disabled={!captureText.trim()}>Save captures</Button></div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-3">
              <section>
                <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fixed anchors</h4>
                {appts.length === 0 ? <p className="text-xs text-muted-foreground">No appointments today.</p> :
                  <ul className="space-y-1">{appts.map(a => <li key={a.id} className="rounded-md border border-border/50 bg-violet-50/60 px-2 py-1.5 text-sm dark:bg-violet-900/20">{a.time ? `${a.time} · ` : ""}{a.title}</li>)}</ul>}
              </section>
              <section>
                <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Flexible tasks — tap to mark a Top 3</h4>
                {dayTasks.length === 0 ? <p className="text-xs text-muted-foreground">Nothing scheduled yet.</p> :
                  <ul className="grid gap-1 sm:grid-cols-2">{dayTasks.map(t => (
                    <li key={t.id}>
                      <button onClick={() => togglePriority(t)}
                        className={cn("flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition-colors",
                          t.isTopThree ? "border-amber-400 bg-amber-50/70 dark:bg-amber-900/20" : "border-border/50 bg-card/60 hover:border-primary/40")}>
                        <Star className={cn("h-3.5 w-3.5", t.isTopThree ? "fill-amber-500 text-amber-500" : "text-muted-foreground")} />
                        <span className="min-w-0 flex-1 line-clamp-2 [overflow-wrap:anywhere]">{t.title}</span>
                      </button>
                    </li>
                  ))}</ul>}
              </section>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
              <div className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Unscheduled</p>
                {unscheduled.length === 0 ? <p className="text-xs text-muted-foreground">All placed 🌿</p> :
                  unscheduled.map(t => <PlannerTaskRow key={t.id} task={t} />)}
              </div>
              <div className="h-[50vh] min-h-0"><PlannerTimeline date={date} /></div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Top priorities" value={String(priorities.length)} />
                <Stat label="Planned tasks" value={String(scheduled.length)} />
                <Stat label="Planned focus" value={`${Math.round(totalMin / 60 * 10) / 10}h`} />
              </div>
              <div className={cn("rounded-2xl border border-border/60 bg-card/60 p-4")}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Daily load</p>
                <p className={cn("font-display text-2xl", loadTone)}>{load}</p>
                {load === "Overloaded" && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    This day looks pretty full. You have {Math.round(totalMin / 60)} hours planned around your fixed anchors.
                  </p>
                )}
                {load === "Full" && <p className="mt-1 text-sm text-muted-foreground">A steady day. Leave breathing room where you can.</p>}
                {load === "Balanced" && <p className="mt-1 text-sm text-muted-foreground">Nicely paced.</p>}
                {load === "Light" && <p className="mt-1 text-sm text-muted-foreground">A gentle day. Space to move slow.</p>}
              </div>
              {(load === "Full" || load === "Overloaded") && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={lightenPreview.length === 0} onClick={() => setConfirm("lighten")}>Lighten my day</Button>
                  <Button size="sm" variant="outline" disabled={flexScheduled.length === 0} onClick={() => setConfirm("move")}>Move flexible tasks</Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-3">
          <Button size="sm" variant="ghost" onClick={() => setStep((s) => (s === 0 ? 0 : ((s - 1) as Step)))} disabled={step === 0}>Back</Button>
          {step < 3 ? (
            <Button size="sm" onClick={() => setStep((s) => ((s + 1) as Step))}>Next: {STEPS[step + 1].label}</Button>
          ) : (
            <Button size="sm" onClick={() => onOpenChange(false)}>Looks good</Button>
          )}
        </div>

        <AlertDialog open={confirm === "lighten"} onOpenChange={(o) => !o && setConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Lighten today, gently</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    I'll unschedule {lightenPreview.length} lower-priority task{lightenPreview.length === 1 ? "" : "s"}
                    {lightenMin > 0 ? ` (~${Math.round(lightenMin / 60 * 10) / 10}h)` : ""} from your timeline.
                    They stay on today's list — just no fixed time — so nothing is lost or deleted.
                    Your Top 3 and appointments won't move.
                  </p>
                  {lightenPreview.length > 0 && (
                    <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border/50 bg-muted/30 p-2">
                      {lightenPreview.map(t => (
                        <li key={t.id} className="truncate text-xs">· {t.title}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Not yet</AlertDialogCancel>
              <AlertDialogAction onClick={lightenDay}>Unschedule these</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirm === "move"} onOpenChange={(o) => !o && setConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move flexible tasks to {tomorrowLabel}?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    I'll move {flexScheduled.length} flexible task{flexScheduled.length === 1 ? "" : "s"}
                    {moveMin > 0 ? ` (~${Math.round(moveMin / 60 * 10) / 10}h)` : ""} to {tomorrowLabel} and clear their start times so you can re-place them.
                    Your Top 3 priorities and any appointments stay right here on today.
                    You can drag anything back if plans shift.
                  </p>
                  {flexScheduled.length > 0 && (
                    <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border/50 bg-muted/30 p-2">
                      {flexScheduled.map(t => (
                        <li key={t.id} className="truncate text-xs">· {t.title}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep on today</AlertDialogCancel>
              <AlertDialogAction onClick={moveFlexibleToTomorrow}>Move to {tomorrowLabel}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-xl">{value}</p>
    </div>
  );
}
