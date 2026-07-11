import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Users } from "lucide-react";
import { listLovedOnes, type LovedOne } from "@/lib/loved-ones";
import type { Task, Appointment } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  tasks: Task[];
  appointments: Appointment[];
}

const HOURS = [7, 9, 11, 13, 15, 17, 19, 21];

/** Per-person timeline lanes for today, sourced from loved_ones + recipient links. */
export function FamilyLanes({ date, tasks, appointments }: Props) {
  const [people, setPeople] = useState<LovedOne[]>([]);
  useEffect(() => { listLovedOnes().then(setPeople).catch(() => setPeople([])); }, []);

  const lanes = [{ id: "me", name: "Me", color: "hsl(var(--primary))" as string, avatarEmoji: "✨" }, ...people.map((p) => ({
    id: p.id, name: p.name, color: p.color, avatarEmoji: p.avatarEmoji,
  }))];

  return (
    <section className="reset-glass rounded-3xl p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-4 w-4 text-primary" /> Family timeline · {format(date, "MMM d")}
        </div>
        <span className="text-[10px] text-muted-foreground">{lanes.length} {lanes.length === 1 ? "lane" : "lanes"}</span>
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[120px_1fr] gap-2 border-b border-border/40 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span />
            <div className="grid" style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}>
              {HOURS.map((h) => <span key={h} className="text-center">{format(new Date(0, 0, 0, h), "ha")}</span>)}
            </div>
          </div>
          {lanes.map((p) => {
            const items = [
              ...appointments.filter((a) => a.recipientId === p.id || (p.id === "me" && !a.recipientId)),
              ...tasks.filter((t) => t.recipientId === p.id || (p.id === "me" && !t.recipientId)).filter((t) => !!t.startTime),
            ];
            return (
              <div key={p.id} className="grid grid-cols-[120px_1fr] items-center gap-2 border-b border-border/30 py-2 last:border-b-0">
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="grid h-7 w-7 place-items-center rounded-full text-sm" style={{ background: p.color ?? "hsl(var(--muted))" }} aria-hidden>
                    {p.avatarEmoji ?? "👤"}
                  </span>
                  <span className="truncate text-foreground">{p.name}</span>
                </div>
                <div className="relative h-8 rounded-lg bg-muted/40">
                  {items.map((it: any) => {
                    const time: string | undefined = it.time ?? it.startTime;
                    if (!time) return null;
                    const [hh, mm] = time.slice(0, 5).split(":").map(Number);
                    const t = hh + mm / 60;
                    if (t < HOURS[0] || t > HOURS[HOURS.length - 1] + 2) return null;
                    const left = ((t - HOURS[0]) / (HOURS[HOURS.length - 1] + 2 - HOURS[0])) * 100;
                    return (
                      <div
                        key={it.id}
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                          "border-primary/40 bg-primary/15 text-foreground shadow-sm"
                        )}
                        style={{ left: `${left}%`, maxWidth: "40%" }}
                        title={`${time.slice(0,5)} · ${it.title}`}
                      >
                        <span className="line-clamp-1">{time.slice(0, 5)} {it.title}</span>
                      </div>
                    );
                  })}
                  {items.length === 0 && <span className="pl-2 text-[10px] leading-8 text-muted-foreground/60">— nothing scheduled —</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}