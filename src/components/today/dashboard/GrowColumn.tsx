import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { getIntention, setIntention } from "@/lib/daily-intention";
import { Input } from "@/components/ui/input";
import { ChevronRight } from "lucide-react";
import { DashCard, EmptyLine } from "./DashCard";
import { capacityLimit, useCapacity } from "./capacity-context";

export function GrowColumn({ date }: { date: Date }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const capacity = useCapacity();
  const iso = format(date, "yyyy-MM-dd");
  const [intention, setLocal] = useState("");
  useEffect(() => { setLocal(getIntention(iso)); }, [iso]);

  const goals = state.goals
    .filter(g => g.status === "active")
    .slice(0, capacityLimit(3, capacity));
  const notes = [...state.journal]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, capacityLimit(2, capacity));

  return (
    <div className="space-y-3">
      <DashCard eyebrow="Grow" title="Intention">
        <Input
          value={intention}
          onChange={(e) => { setLocal(e.target.value); setIntention(iso, e.target.value); }}
          placeholder="One line for today…"
          aria-label="Today's intention"
          className="h-9 rounded-xl text-[13px]"
        />
      </DashCard>

      <DashCard
        eyebrow="Grow" title="Goals"
        action={
          <button type="button" onClick={() => navigate("/goals")}
            className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground">
            All <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        }
      >
        {goals.length === 0 ? (
          <EmptyLine>No active goals right now — that's allowed.</EmptyLine>
        ) : (
          <ul className="space-y-2.5">
            {goals.map(g => (
              <li key={g.id}>
                <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate">{g.title}</span>
                  <span className="text-[11px] text-muted-foreground">{g.progress}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${Math.min(100, Math.max(0, g.progress))}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashCard>

      <DashCard
        eyebrow="Grow" title="Journal"
        action={
          <button type="button" onClick={() => navigate("/journal")}
            className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground">
            Write <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        }
      >
        {notes.length === 0 ? (
          <EmptyLine>Nothing written lately. A sentence counts.</EmptyLine>
        ) : (
          <ul className="space-y-2">
            {notes.map(n => (
              <li key={n.id} className="rounded-2xl bg-muted/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{n.date}</p>
                <p className="mt-0.5 line-clamp-2 text-[12.5px] [overflow-wrap:anywhere]">{n.title || n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </DashCard>
    </div>
  );
}