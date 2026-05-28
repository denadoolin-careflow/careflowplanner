import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipForward, SkipBack, X, Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { routines as routinesApi, type Routine } from "@/lib/routines";

export function RoutineFocusMode({
  open, onOpenChange, routine, startItemId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  routine: Routine;
  startItemId?: string;
}) {
  const items = routine.items;
  const startIdx = useMemo(() => {
    if (startItemId) {
      const i = items.findIndex(it => it.id === startItemId);
      if (i >= 0) return i;
    }
    const firstUndone = items.findIndex(it => !it.done);
    return firstUndone >= 0 ? firstUndone : 0;
  }, [open, startItemId, items]);

  const [idx, setIdx] = useState(startIdx);
  useEffect(() => { if (open) setIdx(startIdx); }, [open, startIdx]);

  const current = items[idx];
  const next = items[idx + 1];
  const totalSec = (current?.durationMin ?? 5) * 60;
  const [remaining, setRemaining] = useState(totalSec);
  const [paused, setPaused] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(totalSec);
    setPaused(false);
  }, [idx, totalSec]);

  useEffect(() => {
    if (!open || paused) return;
    ref.current = window.setInterval(() => {
      setRemaining(r => Math.max(0, r - 1));
    }, 1000);
    return () => { if (ref.current) window.clearInterval(ref.current); };
  }, [open, paused, idx]);

  if (!current) return null;

  const pct = totalSec > 0 ? remaining / totalSec : 0;
  const R = 90;
  const C = 2 * Math.PI * R;

  const advance = () => {
    if (idx + 1 < items.length) setIdx(idx + 1);
    else onOpenChange(false);
  };

  const goBack = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  const markDone = async () => {
    if (!current.done) await routinesApi.toggleItem(routine.person_name, routine.slot, current.id);
    advance();
  };

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-0 bg-gradient-to-br from-primary/15 via-background to-background p-0 sm:rounded-3xl">
        <div className="relative flex flex-col items-center gap-4 p-6 pb-4">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted/60"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {routine.person_name} · Focus
          </div>

          {/* Pie timer */}
          <div className="relative">
            <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
              <circle cx="110" cy="110" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
              <circle
                cx="110" cy="110" r={R}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - pct)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl">{current.icon || "✨"}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                {mm}:{String(ss).padStart(2, "0")}
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold">{current.text}</div>
            {next && (
              <div className="mt-1 text-xs text-muted-foreground">
                Next: {next.icon ?? "·"} {next.text}
              </div>
            )}
          </div>

          <div className="flex w-full items-center justify-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full"
              onClick={goBack}
              disabled={idx === 0}
              aria-label="Previous step"
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11 rounded-full px-4"
              onClick={() => setPaused(p => !p)}
            >
              {paused ? <Play className="mr-1 h-4 w-4" /> : <Pause className="mr-1 h-4 w-4" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button
              size="sm"
              className="h-11 rounded-full px-4"
              onClick={markDone}
            >
              <Check className="mr-1 h-4 w-4" /> Done
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full"
              onClick={advance}
              disabled={idx + 1 >= items.length}
              aria-label="Next step"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-1 flex w-full gap-1">
            {items.map((_, i) => (
              <div key={i} className={cn(
                "h-1 flex-1 rounded-full",
                i < idx ? "bg-primary" : i === idx ? "bg-primary/60" : "bg-muted",
              )} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}