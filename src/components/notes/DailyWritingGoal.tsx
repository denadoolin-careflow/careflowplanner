import { useMemo } from "react";
import { format } from "date-fns";
import { Target, Pencil, Flame } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { countWords, useDailyGoal } from "@/lib/writing-goals";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function DailyWritingGoal({ className }: { className?: string }) {
  const { state } = useStore();
  const [goal, setGoal] = useDailyGoal();
  const [input, setInput] = useState(String(goal));

  const today = format(new Date(), "yyyy-MM-dd");

  const stats = useMemo(() => {
    const entries = (state.journal ?? []).filter((j) => j.date === today);
    const words = entries.reduce((acc, e) => acc + countWords(e.body), 0);
    return { entries: entries.length, words };
  }, [state.journal, today]);

  const streak = useMemo(() => {
    const byDay = new Map<string, number>();
    (state.journal ?? []).forEach(j => {
      byDay.set(j.date, (byDay.get(j.date) ?? 0) + countWords(j.body));
    });
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = format(new Date(Date.now() - i * 86400000), "yyyy-MM-dd");
      const w = byDay.get(d) ?? 0;
      if (w >= goal) s++;
      else if (i === 0) continue;
      else break;
    }
    return s;
  }, [state.journal, goal]);

  const pct = Math.min(100, Math.round((stats.words / goal) * 100));
  const reached = stats.words >= goal;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur",
        reached && "border-primary/40 bg-primary/5",
        className,
      )}
    >
      <BigRing pct={pct} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Today's writing
          </p>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <Flame className="h-2.5 w-2.5" /> {streak}d
            </span>
          )}
        </div>
        <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
          {stats.words.toLocaleString()}
          <span className="text-base font-normal text-muted-foreground"> / {goal.toLocaleString()} words</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {stats.entries === 0
            ? "No entries yet — even one sentence counts."
            : reached
              ? `🌿 Goal reached across ${stats.entries} ${stats.entries === 1 ? "entry" : "entries"}.`
              : `${stats.entries} ${stats.entries === 1 ? "entry" : "entries"} so far · ${goal - stats.words} to go.`}
        </p>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Set daily goal">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="end">
          <div className="space-y-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Target className="h-3 w-3" /> Daily word goal
            </label>
            <Input
              type="number"
              min={10}
              step={10}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                const n = parseInt(input, 10);
                if (Number.isFinite(n) && n > 0) setGoal(n);
              }}
            >
              Save
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Gentle target. Counts all journal entries written today.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function BigRing({ pct }: { pct: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} stroke="hsl(var(--border))" strokeWidth="4" fill="none" />
        <circle
          cx="28" cy="28" r={r}
          stroke="hsl(var(--primary))"
          strokeWidth="4"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">
        {pct}%
      </span>
    </div>
  );
}
