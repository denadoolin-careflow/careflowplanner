import { useEffect, useState } from "react";
import { format } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Timer, Trash2, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { usePeopleDirectory } from "@/lib/people-directory";
import {
  STAGES, DEFAULT_MINUTES, useLaundry, readLoads, writeLoads, updateLoad,
  type LaundryLoad, type LaundryStage,
} from "@/lib/laundry";
import { requestNotificationPermission } from "@/lib/reminders";
import { cn } from "@/lib/utils";

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return now;
}

function fmt(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Cute little machine: drum spins while the timer runs. */
function Machine({ kind, running }: { kind: "washer" | "dryer"; running: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="relative h-10 w-9 shrink-0 rounded-lg border-2 border-foreground/30 bg-card">
      <div className="absolute left-1 right-1 top-1 flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-primary" />
        <span className="h-1 w-2 rounded-full bg-foreground/20" />
      </div>
      <div className="absolute bottom-1 left-1/2 h-6 w-6 -translate-x-1/2 overflow-hidden rounded-full border-2 border-foreground/30 bg-muted">
        <motion.div
          className="absolute inset-0"
          animate={running && !reduce ? { rotate: 360 } : { rotate: 0 }}
          transition={running ? { repeat: Infinity, duration: kind === "dryer" ? 1.4 : 0.9, ease: "linear" } : undefined}
        >
          <span className={cn("absolute left-0.5 top-1 h-2 w-2 rounded-sm", kind === "dryer" ? "bg-accent" : "bg-primary/70")} />
          <span className="absolute bottom-0.5 right-1 h-1.5 w-1.5 rounded-full bg-secondary" />
        </motion.div>
      </div>
    </div>
  );
}

export function LaundryBoard({ compact = false }: { compact?: boolean }) {
  const loads = useLaundry();
  const people = usePeopleDirectory();
  const { addTask, toggleTask, state } = useStore();
  const now = useNow();
  const [owner, setOwner] = useState("");
  const [note, setNote] = useState("");

  const add = () => {
    const name = owner.trim() || "Family";
    writeLoads([...readLoads(), { id: crypto.randomUUID(), owner: name, note: note.trim() || undefined, stage: "hamper", updatedAt: Date.now() }]);
    setOwner(""); setNote("");
  };

  const moveTo = async (l: LaundryLoad, stage: LaundryStage) => {
    const mins = DEFAULT_MINUTES[stage];
    const patch: Partial<LaundryLoad> = { stage, endsAt: undefined, minutes: undefined, notified: false };
    if (mins) {
      patch.endsAt = Date.now() + mins * 60000;
      patch.minutes = mins;
      void requestNotificationPermission();
    }
    // Finish the planner reminder when the load leaves the dryer.
    if (l.taskId && stage !== "dryer") {
      const t = state.tasks.find(x => x.id === l.taskId);
      if (t && !t.done) void toggleTask(t.id);
      patch.taskId = undefined;
    }
    if (stage === "dryer" && mins) {
      const end = new Date(patch.endsAt!);
      const id = await addTask({
        title: `Take ${l.owner}'s load out of the dryer`,
        dueDate: format(end, "yyyy-MM-dd"),
        startTime: format(end, "HH:mm"),
        endTime: format(new Date(end.getTime() + 10 * 60000), "HH:mm"),
        tags: ["laundry"],
        area: "home" as any,
        skipChecklist: true,
      });
      if (id) patch.taskId = id;
    }
    updateLoad(l.id, patch);
  };

  const setMinutes = (l: LaundryLoad, m: number) =>
    updateLoad(l.id, { minutes: m, endsAt: Date.now() + m * 60000, notified: false });

  const remove = (id: string) => writeLoads(readLoads().filter(l => l.id !== id));
  const clearDone = () => writeLoads(readLoads().filter(l => l.stage !== "done"));

  const stages = compact ? STAGES.filter(s => s.id !== "done") : STAGES;
  const active = loads.filter(l => l.stage !== "done");

  return (
    <section aria-label="Laundry board" className="rounded-3xl border border-border/60 bg-card/70 p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shirt className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="font-display text-lg font-semibold">Laundry flow</h2>
          <span className="text-xs text-muted-foreground">{active.length} active</span>
        </div>
        {!compact && loads.some(l => l.stage === "done") && (
          <Button size="sm" variant="ghost" onClick={clearDone}>Clear done</Button>
        )}
      </div>

      <form className="mb-3 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); add(); }}>
        <Input list="laundry-people" value={owner} onChange={e => setOwner(e.target.value)} placeholder="Whose load? (e.g. Mia)" className="h-9 w-40" aria-label="Whose load" />
        <datalist id="laundry-people">{people.map(p => <option key={p.id} value={p.name} />)}</datalist>
        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (towels, delicates…)" className="h-9 min-w-0 flex-1" aria-label="Load note" />
        <Button type="submit" size="sm" className="h-9"><Plus className="mr-1 h-4 w-4" />Add load</Button>
      </form>

      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        {stages.map((s, si) => {
          const items = loads.filter(l => l.stage === s.id);
          return (
            <div
              key={s.id}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { const l = loads.find(x => x.id === e.dataTransfer.getData("text/laundry")); if (l && l.stage !== s.id) void moveTo(l, s.id); }}
              className="min-w-[200px] flex-1 snap-start rounded-2xl bg-muted/50 p-2"
            >
              <h3 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold">
                <span aria-hidden>{s.emoji}</span>{s.label}
                <span className="ml-auto text-xs font-normal text-muted-foreground">{items.length}</span>
              </h3>
              <ul className="space-y-2">
                {items.length === 0 && <li className="px-1 py-3 text-center text-xs text-muted-foreground">Nothing here</li>}
                {items.map(l => {
                  const timed = (l.stage === "washer" || l.stage === "dryer") && l.endsAt;
                  const left = timed ? l.endsAt! - now : 0;
                  const running = !!timed && left > 0;
                  return (
                    <li
                      key={l.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData("text/laundry", l.id)}
                      className={cn("rounded-xl border border-border/60 bg-card p-2.5 shadow-sm", timed && !running && "ring-2 ring-primary")}
                    >
                      <div className="flex items-start gap-2">
                        {(l.stage === "washer" || l.stage === "dryer") && <Machine kind={l.stage} running={running} />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{l.owner}'s load</p>
                          {l.note && <p className="truncate text-xs text-muted-foreground">{l.note}</p>}
                          {timed && (
                            <p className={cn("mt-0.5 flex items-center gap-1 text-xs tabular-nums", running ? "text-muted-foreground" : "font-semibold text-primary")}>
                              <Timer className="h-3 w-3" aria-hidden />
                              {running ? `${fmt(left)} left` : l.stage === "dryer" ? "Ready to take out!" : "Ready for the dryer!"}
                            </p>
                          )}
                        </div>
                        <button type="button" aria-label="Remove load" onClick={() => remove(l.id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {timed && (
                        <div className="mt-2 flex gap-1">
                          {[30, 45, 60, 75].map(m => (
                            <button key={m} type="button" onClick={() => setMinutes(l, m)}
                              className={cn("flex-1 rounded-md border px-1 py-1 text-[11px]", l.minutes === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                              {m}m
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex justify-between">
                        <Button size="sm" variant="ghost" className="h-8 px-2" disabled={si === 0} onClick={() => moveTo(l, STAGES[si - 1].id)} aria-label={`Move back to ${STAGES[si - 1]?.label}`}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {si < STAGES.length - 1 && (
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => moveTo(l, STAGES[si + 1].id)}>
                            {STAGES[si + 1].label}<ChevronRight className="ml-0.5 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
