import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Phase = "work" | "break";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  subtitle?: string;
}

export function PomodoroDialog({ open, onOpenChange, title, subtitle }: Props) {
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [phase, setPhase] = useState<Phase>("work");
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setPhase("work");
      setRemaining(workMin * 60);
      setRunning(false);
      setCycles(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setRemaining(r => {
        if (r > 1) return r - 1;
        // Phase complete
        navigator.vibrate?.([60, 40, 60]);
        const nextPhase: Phase = phase === "work" ? "break" : "work";
        const nextSeconds = (nextPhase === "work" ? workMin : breakMin) * 60;
        toast.success(phase === "work" ? "Work session done — take a break." : "Break over — back to it!");
        setPhase(nextPhase);
        if (phase === "work") setCycles(c => c + 1);
        return nextSeconds;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, phase, workMin, breakMin]);

  const total = (phase === "work" ? workMin : breakMin) * 60;
  const pct = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  const reset = () => {
    setRunning(false);
    setPhase("work");
    setRemaining(workMin * 60);
    setCycles(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4" /> Pomodoro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-center">
          <p className="truncate text-sm font-medium">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="relative mx-auto mt-2 h-44 w-44">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="45" className="fill-none stroke-muted" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="45"
              className={cn("fill-none transition-[stroke-dashoffset] duration-1000 ease-linear",
                phase === "work" ? "stroke-primary" : "stroke-emerald-500")}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 45}
              strokeDashoffset={(2 * Math.PI * 45) * (1 - pct / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-semibold tabular-nums">{mm}:{ss}</span>
            <span className={cn("mt-1 text-[10px] uppercase tracking-widest",
              phase === "work" ? "text-primary" : "text-emerald-500")}>
              {phase === "work" ? "Focus" : "Break"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            onClick={() => { setRunning(r => !r); navigator.vibrate?.(8); }}
            className="rounded-full px-5"
          >
            {running ? <><Pause className="mr-1 h-3.5 w-3.5" /> Pause</> : <><Play className="mr-1 h-3.5 w-3.5" /> Start</>}
          </Button>
          <Button size="sm" variant="outline" onClick={reset} className="rounded-full">
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <label className="flex items-center gap-1">
            Work
            <Input
              type="number" min={1} max={120}
              value={workMin}
              onChange={(e) => {
                const v = Math.max(1, Math.min(120, parseInt(e.target.value || "1", 10)));
                setWorkMin(v);
                if (!running && phase === "work") setRemaining(v * 60);
              }}
              className="h-7 w-14 text-xs"
            />
            min
          </label>
          <label className="flex items-center gap-1">
            Break
            <Input
              type="number" min={1} max={60}
              value={breakMin}
              onChange={(e) => {
                const v = Math.max(1, Math.min(60, parseInt(e.target.value || "1", 10)));
                setBreakMin(v);
                if (!running && phase === "break") setRemaining(v * 60);
              }}
              className="h-7 w-14 text-xs"
            />
            min
          </label>
          <span>· {cycles} done</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}