import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { useTimeBlocks } from "@/lib/time-blocks";
import { computeDayPulse, type DayPulseStatus } from "@/lib/planner-day-pulse";
import { Activity, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<DayPulseStatus, string> = {
  soft: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  balanced: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30",
  full: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30",
  overloaded: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30",
};

export function DayPulseCard({ date }: { date: Date }) {
  const { state, updateTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const { blocks } = useTimeBlocks(iso, iso);
  const pulse = useMemo(() => computeDayPulse(date, state.tasks, state.appointments, blocks), [date, state.tasks, state.appointments, blocks]);
  const [softenOpen, setSoftenOpen] = useState(false);

  const overloaded = pulse.status === "overloaded" || pulse.status === "full";
  const dayTasks = state.tasks.filter(t => t.dueDate === iso && !t.done);

  const removeFromToday = async (id: string) => { await updateTask(id, { dueDate: undefined, startTime: undefined }); toast.success("Moved out of today"); };
  const shorten = async (id: string, cur: number) => { await updateTask(id, { estMinutes: Math.max(15, Math.round(cur / 2)) }); toast.success("Shortened"); };

  return (
    <section className={cn("rounded-2xl border p-3", STATUS_CLASSES[pulse.status])}>
      <header className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
        <Activity className="h-3 w-3" /> Day Pulse
      </header>
      <p className="text-sm font-semibold">{pulse.label}</p>
      <p className="mt-0.5 text-[11px] opacity-80">{pulse.message}</p>
      <div className="mt-2 flex items-center gap-2 text-[10px] tabular-nums opacity-80">
        <span>{pulse.scheduledCount} scheduled</span>
        <span>·</span>
        <span>{Math.floor(pulse.freeMinutes / 60)}h {pulse.freeMinutes % 60}m free</span>
        {pulse.overlaps > 0 && (<><span>·</span><span>{pulse.overlaps} overlap{pulse.overlaps === 1 ? "" : "s"}</span></>)}
      </div>
      {pulse.carey && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-background/40 px-2 py-1.5 text-[11px]">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
          <span className="flex-1">{pulse.carey}</span>
        </div>
      )}
      {overloaded && (
        <Button size="sm" variant="outline" className="mt-2 h-7 w-full text-[11px]" onClick={() => setSoftenOpen(true)}>
          Soften my day
        </Button>
      )}

      <Dialog open={softenOpen} onOpenChange={setSoftenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Soften today</DialogTitle>
            <DialogDescription>Review, don't rush. Nothing changes until you tap an action.</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {dayTasks.length === 0 && <p className="text-sm text-muted-foreground">No open tasks scheduled today.</p>}
            {dayTasks.map(t => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 p-2">
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => shorten(t.id, t.estMinutes ?? 30)}>Shorten</Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => removeFromToday(t.id)}>Move</Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSoftenOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}