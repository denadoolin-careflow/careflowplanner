import { useMemo } from "react";
import { Sunrise, Sun, Sunset, Moon, ArrowDownUp, Home as HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import type { Task, Appointment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CV2_TASK_MIME, CV2_CAPTURE_MIME, type Capture } from "./UniversalInbox";

const CONTAINERS = [
  { id: "morning", label: "Morning", icon: Sunrise, start: "07:00", end: "12:00" },
  { id: "midday", label: "Midday", icon: Sun, start: "12:00", end: "15:00" },
  { id: "afternoon", label: "Afternoon", icon: Sunset, start: "15:00", end: "18:00" },
  { id: "evening", label: "Evening", icon: Moon, start: "18:00", end: "22:00" },
] as const;

type ContainerId = typeof CONTAINERS[number]["id"];

const PRI_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function inRange(hm: string | undefined, start: string, end: string): boolean {
  if (!hm) return false;
  const t = hm.slice(0, 5);
  return t >= start && t < end;
}

interface Props {
  date: Date;
  tasks: Task[];             // scheduled tasks today
  appointments: Appointment[];
}

/**
 * Flexible time containers grouping the day into Morning / Midday /
 * Afternoon / Evening. Tasks can be dropped in, auto-reordered by priority,
 * while appointments stay fixed and are shown for context.
 */
export function TimeContainers({ date, tasks, appointments }: Props) {
  const { updateTask, addTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");

  const grouped = useMemo(() => {
    const out: Record<ContainerId, { tasks: Task[]; appts: Appointment[] }> = {
      morning: { tasks: [], appts: [] }, midday: { tasks: [], appts: [] },
      afternoon: { tasks: [], appts: [] }, evening: { tasks: [], appts: [] },
    };
    for (const c of CONTAINERS) {
      out[c.id].tasks = tasks
        .filter((t) => inRange(t.startTime, c.start, c.end))
        .sort((a, b) => (PRI_RANK[a.priority] ?? 1) - (PRI_RANK[b.priority] ?? 1));
      out[c.id].appts = appointments.filter((a) => inRange(a.time, c.start, c.end));
    }
    return out;
  }, [tasks, appointments]);

  const dropInto = async (e: React.DragEvent, c: ContainerId) => {
    e.preventDefault();
    const container = CONTAINERS.find((x) => x.id === c)!;
    const time = container.start;
    const taskId = e.dataTransfer.getData(CV2_TASK_MIME);
    if (taskId) {
      await updateTask(taskId, { dueDate: iso, startTime: time, inbox: false });
      toast.success(`Placed in ${container.label}`);
      return;
    }
    const capId = e.dataTransfer.getData(CV2_CAPTURE_MIME);
    if (capId) {
      try {
        const raw = JSON.parse(localStorage.getItem("careflow:cv2:inbox") || "[]") as Capture[];
        const cap = raw.find((x) => x.id === capId);
        if (!cap) return;
        await addTask({
          title: cap.title, area: "Personal", priority: "medium",
          done: false, dueDate: iso, startTime: time, estMinutes: 30,
        });
        localStorage.setItem("careflow:cv2:inbox", JSON.stringify(raw.filter((x) => x.id !== capId)));
        window.dispatchEvent(new Event("storage"));
        toast.success(`Placed "${cap.title}" in ${container.label}`);
      } catch {}
    }
  };

  const autoReorder = async (c: ContainerId) => {
    const container = CONTAINERS.find((x) => x.id === c)!;
    const pool = grouped[c].tasks;
    if (pool.length === 0) { toast.info("Nothing to reorder here"); return; }
    // Take appointments as fixed anchors and pack tasks between them.
    const anchors = grouped[c].appts
      .map((a) => {
        const s = toMin(a.time ?? container.start);
        const e = a.endTime ? toMin(a.endTime) : s + 30;
        return [s, e] as [number, number];
      })
      .sort((a, b) => a[0] - b[0]);
    let cursor = toMin(container.start);
    const end = toMin(container.end);
    for (const t of pool) {
      const dur = t.estMinutes ?? 25;
      for (const [s, e] of anchors) {
        if (cursor < e && cursor + dur > s) cursor = e + 5;
      }
      if (cursor + dur > end) break;
      const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
      const mm = String(cursor % 60).padStart(2, "0");
      await updateTask(t.id, { startTime: `${hh}:${mm}` });
      cursor += dur + 5;
    }
    toast.success(`${container.label} re-ordered by priority`);
  };

  return (
    <section className="reset-glass rounded-3xl p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Flexible time containers
        </div>
        <span className="text-[10px] text-muted-foreground">Drop tasks · appointments stay fixed</span>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CONTAINERS.map((c) => {
          const g = grouped[c.id];
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(CV2_TASK_MIME) || e.dataTransfer.types.includes(CV2_CAPTURE_MIME))
                  e.preventDefault();
              }}
              onDrop={(e) => dropInto(e, c.id)}
              className={cn(
                "min-h-[160px] rounded-2xl border border-border/50 bg-background/60 p-3 transition-colors",
                "hover:border-primary/40"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" /> {c.label}
                  <span className="text-[10px] font-normal text-muted-foreground">· {c.start}–{c.end}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => autoReorder(c.id)}
                  title="Auto-reorder by priority">
                  <ArrowDownUp className="h-3 w-3" />
                </Button>
              </div>
              <ul className="space-y-1.5">
                {g.appts.map((a) => (
                  <li key={a.id} className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-[11px]">
                    <span className="font-mono text-[10px] text-muted-foreground">{a.time?.slice(0, 5)}</span>{" "}
                    <span className="font-medium">{a.title}</span>
                    <span className="ml-1 rounded-full bg-primary/20 px-1 text-[9px] uppercase text-primary">Fixed</span>
                  </li>
                ))}
                {g.tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-1.5 rounded-lg border border-border/50 bg-card/70 px-2 py-1 text-[11px]">
                    <span className="font-mono text-[10px] text-muted-foreground">{t.startTime?.slice(0, 5)}</span>
                    <span className="min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere]">{t.title}</span>
                    {t.resetItemId && (
                      <span title="From Home Reset" className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1 text-[9px] text-primary">
                        <HomeIcon className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </li>
                ))}
                {g.tasks.length === 0 && g.appts.length === 0 && (
                  <li className="rounded-lg border border-dashed border-border/40 px-2 py-3 text-center text-[10px] text-muted-foreground">
                    Drop here
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function toMin(hm: string): number {
  const [h, m] = hm.slice(0, 5).split(":").map(Number);
  return h * 60 + (m ?? 0);
}