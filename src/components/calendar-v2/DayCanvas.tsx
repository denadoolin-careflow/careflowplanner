import { useMemo } from "react";
import { format } from "date-fns";
import { CalendarClock, Wand2, Coffee, Home as HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import type { Task, Appointment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CV2_TASK_MIME, CV2_CAPTURE_MIME, type Capture } from "./UniversalInbox";

const START = 7;   // 7am
const END = 22;    // 10pm
const HOURS = Array.from({ length: END - START }, (_, i) => START + i);

interface Block {
  id: string;
  kind: "appt" | "task" | "buffer";
  title: string;
  start: number;   // hours since midnight (float)
  end: number;
  color?: string;
  fromReset?: boolean;
}

interface Props {
  date: Date;
  tasks: Task[];         // tasks with dueDate === iso
  appointments: Appointment[];
  unscheduled: Task[];
}

function toHours(hm?: string): number | null {
  if (!hm || !/^\d{2}:\d{2}/.test(hm)) return null;
  const [h, m] = hm.slice(0, 5).split(":").map(Number);
  return h + m / 60;
}

/** The Day canvas: fixed appointments + scheduled tasks + drop targets per hour + Reflow. */
export function DayCanvas({ date, tasks, appointments, unscheduled }: Props) {
  const { updateTask, addTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");

  const blocks: Block[] = useMemo(() => {
    const out: Block[] = [];
    for (const a of appointments) {
      const s = toHours(a.time) ?? 9;
      const e = toHours(a.endTime) ?? s + 0.5;
      out.push({ id: `a-${a.id}`, kind: "appt", title: a.title, start: s, end: Math.max(e, s + 0.5), color: a.color });
    }
    for (const t of tasks) {
      const s = toHours(t.startTime);
      if (s == null) continue;
      const dur = (t.estMinutes ?? 30) / 60;
      out.push({ id: `t-${t.id}`, kind: "task", title: t.title, start: s, end: s + dur, fromReset: !!t.resetItemId });
    }
    return out.sort((a, b) => a.start - b.start);
  }, [tasks, appointments]);

  const handleDrop = async (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData(CV2_TASK_MIME);
    if (taskId) {
      const hh = String(Math.floor(hour)).padStart(2, "0");
      const mm = (hour % 1) === 0.5 ? "30" : "00";
      await updateTask(taskId, { dueDate: iso, startTime: `${hh}:${mm}`, inbox: false });
      toast.success(`Scheduled at ${hh}:${mm}`);
      return;
    }
    const capId = e.dataTransfer.getData(CV2_CAPTURE_MIME);
    if (capId) {
      // Promote capture into a scheduled task and remove from local inbox.
      try {
        const raw = JSON.parse(localStorage.getItem("careflow:cv2:inbox") || "[]") as Capture[];
        const c = raw.find((x) => x.id === capId);
        if (!c) return;
        const hh = String(Math.floor(hour)).padStart(2, "0");
        const mm = (hour % 1) === 0.5 ? "30" : "00";
        await addTask({
          title: c.title, area: "Personal", priority: "medium",
          done: false, dueDate: iso, startTime: `${hh}:${mm}`, estMinutes: 30,
        });
        localStorage.setItem("careflow:cv2:inbox", JSON.stringify(raw.filter((x) => x.id !== capId)));
        window.dispatchEvent(new Event("storage"));
        toast.success(`Scheduled "${c.title}"`);
      } catch { /* noop */ }
    }
  };

  const reflow = async () => {
    // Naive Akiflow-style reflow: pack unscheduled tasks into empty slots
    // between existing appointments across 9am–5pm, honoring estMinutes and
    // inserting a 10-minute buffer after any appointment.
    const busy: [number, number][] = blocks
      .filter((b) => b.kind === "appt")
      .map((b) => [b.start, b.end + 10 / 60] as [number, number])
      .sort((a, b) => a[0] - b[0]);

    let cursor = 9;
    const workEnd = 17;
    const pool = [...unscheduled].sort((a, b) => (a.estMinutes ?? 30) - (b.estMinutes ?? 30));
    let placed = 0;

    for (const t of pool) {
      const dur = (t.estMinutes ?? 30) / 60;
      // Advance cursor past any appointment overlap.
      let cur = cursor;
      for (const [s, e] of busy) {
        if (cur < e && cur + dur > s) cur = e;
      }
      if (cur + dur > workEnd) break;
      const hh = String(Math.floor(cur)).padStart(2, "0");
      const mm = (cur % 1) < 0.5 ? "00" : "30";
      await updateTask(t.id, { dueDate: iso, startTime: `${hh}:${mm}`, inbox: false });
      cursor = cur + dur + 5 / 60;
      placed++;
    }
    toast.success(placed ? `Reflowed ${placed} task${placed === 1 ? "" : "s"}` : "Nothing to reflow");
  };

  return (
    <section className="reset-glass flex h-full flex-col rounded-3xl p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <CalendarClock className="h-4 w-4 text-primary" /> {format(date, "EEE, MMM d")} — Day canvas
        </div>
        <Button size="sm" variant="secondary" className="h-8 rounded-full text-xs" onClick={reflow}>
          <Wand2 className="mr-1 h-3.5 w-3.5" /> Reflow my day
        </Button>
      </header>

      <div className="relative flex-1 overflow-y-auto rounded-2xl border border-border/40 bg-background/50">
        {HOURS.map((h) => {
          const rowBlocks = blocks.filter((b) => Math.floor(b.start) === h);
          const isAfternoon = h === 12;
          return (
            <div
              key={h}
              onDragOver={(e) => {
                if (
                  e.dataTransfer.types.includes(CV2_TASK_MIME) ||
                  e.dataTransfer.types.includes(CV2_CAPTURE_MIME)
                ) e.preventDefault();
              }}
              onDrop={(e) => handleDrop(e, h)}
              className={cn(
                "group grid grid-cols-[52px_1fr] items-start gap-2 border-b border-border/30 px-3 py-1.5 transition-colors last:border-b-0",
                "hover:bg-primary/5"
              )}
            >
              <span className="pt-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {format(new Date(0, 0, 0, h), "h a")}
              </span>
              <div className="min-h-[36px] space-y-1">
                {isAfternoon && rowBlocks.length === 0 && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                    <Coffee className="h-3 w-3" /> Buffer suggested
                  </div>
                )}
                {rowBlocks.map((b) => {
                  const dur = Math.max(0.25, b.end - b.start);
                  return (
                    <div
                      key={b.id}
                      style={{ minHeight: `${dur * 32}px` }}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-xs",
                        b.kind === "appt"
                          ? "border-primary/40 bg-primary/12 text-foreground"
                          : "border-border/60 bg-card/80 text-foreground"
                      )}
                    >
                      <p className="line-clamp-2 font-medium leading-snug">{b.title}</p>
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        {fmtHour(b.start)} – {fmtHour(b.end)}
                        {b.fromReset && (
                          <span title="From Home Reset" className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1 text-[9px] text-primary">
                            <HomeIcon className="h-2.5 w-2.5" /> Reset
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
                {rowBlocks.length === 0 && (
                  <div className="hidden h-8 items-center rounded-lg border border-dashed border-border/50 px-2 text-[10px] text-muted-foreground group-hover:flex">
                    Drop here to schedule at {format(new Date(0, 0, 0, h), "h a")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return format(new Date(0, 0, 0, hh, mm), "h:mm a");
}