import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, Coffee, Pause, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatPomoTime,
  pomoTotal,
  pomodoro,
  usePomodoro,
} from "@/lib/pomodoro-store";

export function FloatingPomodoro() {
  const s = usePomodoro();
  const [collapsed, setCollapsed] = useState(false);

  // Hide entirely if no task is loaded.
  if (!s.taskId) return null;

  const total = pomoTotal(s.mode);
  const pct = ((total - s.remaining) / total) * 100;
  const isFocus = s.mode === "focus";

  // Mini circular ring
  const size = 36;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 animate-fade-in",
        "max-w-[calc(100vw-2rem)]"
      )}
      role="region"
      aria-label="Pomodoro timer"
    >
      <div className="cozy-card flex items-center gap-3 rounded-full border border-border/70 bg-card/95 p-2 pr-3 shadow-lg backdrop-blur">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" opacity={0.5} />
            <circle
              cx={size/2} cy={size/2} r={r}
              stroke={isFocus ? "hsl(var(--primary))" : "hsl(var(--accent-foreground))"}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-700 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {isFocus ? <Brain className="h-3.5 w-3.5 text-primary" /> : <Coffee className="h-3.5 w-3.5" />}
          </div>
        </div>

        {!collapsed && (
          <div className="min-w-0 max-w-[180px]">
            <div className="truncate text-xs font-medium leading-tight">{s.taskTitle}</div>
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="font-display text-[13px] tabular-nums normal-case tracking-normal text-foreground">
                {formatPomoTime(s.remaining)}
              </span>
              · {isFocus ? "focus" : "break"}
            </div>
          </div>
        )}

        <div className="flex items-center gap-0.5">
          <Button
            size="icon" variant="ghost" className="h-7 w-7 rounded-full"
            onClick={() => pomodoro.toggle()}
            aria-label={s.running ? "Pause" : "Resume"}
          >
            {s.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7 rounded-full"
            onClick={() => pomodoro.reset()} aria-label="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7 rounded-full"
            onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
            onClick={() => pomodoro.stop()} aria-label="End session"
          >
            <Square className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
