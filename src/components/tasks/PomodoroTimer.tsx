import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Pause, Play, RotateCcw, Coffee, Brain } from "lucide-react";
import type { Task } from "@/lib/types";
import { toast } from "sonner";

type Mode = "focus" | "break";
const FOCUS = 25 * 60;
const BREAK = 5 * 60;

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

export function PomodoroTimer({ open, onOpenChange, task }: { open: boolean; onOpenChange: (o: boolean) => void; task: Task }) {
  const [mode, setMode] = useState<Mode>("focus");
  const [remaining, setRemaining] = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const tickRef = useRef<number | null>(null);

  const total = mode === "focus" ? FOCUS : BREAK;

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          if (mode === "focus") {
            setCompleted(c => c + 1);
            toast.success("Focus session done — take a soft break.", { description: "5 minutes of breath, water, stretch." });
            setMode("break");
            return BREAK;
          } else {
            toast("Break over. Ready when you are.");
            setMode("focus");
            setRunning(false);
            return FOCUS;
          }
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [running, mode]);

  useEffect(() => {
    if (open) { setMode("focus"); setRemaining(FOCUS); setRunning(false); setCompleted(0); }
  }, [open, task.id]);

  const pct = ((total - remaining) / total) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Pomodoro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl bg-muted/40 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              {mode === "focus" ? <><Brain className="h-3 w-3" /> focusing on</> : <><Coffee className="h-3 w-3" /> gentle break</>}
            </div>
            <p className="mt-1 line-clamp-2 text-sm">{task.title}</p>
            <p className="mt-4 font-display text-6xl tabular-nums">{fmt(remaining)}</p>
            <Progress value={pct} className="mt-4 h-2" />
            <p className="mt-3 text-[11px] text-muted-foreground">
              {completed === 0 ? "First soft session." : `${completed} session${completed > 1 ? "s" : ""} done.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setRunning(r => !r)} className="flex-1 rounded-full">
              {running ? <><Pause className="mr-2 h-4 w-4" />Pause</> : <><Play className="mr-2 h-4 w-4" />{remaining < total ? "Resume" : "Start"}</>}
            </Button>
            <Button variant="outline" onClick={() => { setRunning(false); setRemaining(total); }} className="rounded-full">
              <RotateCcw className="mr-2 h-4 w-4" />Reset
            </Button>
            <Button variant="ghost" onClick={() => { setMode(m => m === "focus" ? "break" : "focus"); setRemaining(mode === "focus" ? BREAK : FOCUS); setRunning(false); }} className="rounded-full">
              {mode === "focus" ? "Switch to break" : "Switch to focus"}
            </Button>
          </div>
          <p className="text-center text-[11px] italic text-muted-foreground">25 minutes of soft attention. 5 minutes to breathe.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}