import { BookOpen, Brain, Coffee, Heart, Home, Pause, Play, RotateCcw, Sparkles, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatPomoTime,
  pomoTotal,
  pomodoro,
  usePomodoro,
  POMODORO_TEMPLATES,
  type PomodoroTemplate,
} from "@/lib/pomodoro-store";

const ICONS = { Sparkles, BookOpen, Home, Brain, Heart, Coffee } as const;

interface PomodoroPanelProps {
  className?: string;
  compact?: boolean;
}

export function PomodoroPanel({ className, compact = false }: PomodoroPanelProps) {
  const s = usePomodoro();
  const total = pomoTotal(s.mode, s);
  const pct = ((total - s.remaining) / total) * 100;
  const idle = !s.taskId && !s.running && s.remaining === total;

  const size = compact ? 110 : 150;
  const stroke = compact ? 8 : 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const isFocus = s.mode === "focus";

  return (
    <div className={cn("cozy-card flex flex-col gap-3 p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Timer className="h-3.5 w-3.5" /> Pomodoro
          {s.templateLabel && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
              {s.templateLabel}
            </span>
          )}
        </div>
        {s.taskId && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => pomodoro.stop()}>
            <Square className="mr-1 h-3 w-3" /> end
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="hsl(var(--muted))"
              strokeWidth={stroke}
              fill="none"
              opacity={0.5}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={isFocus ? "hsl(var(--primary))" : "hsl(var(--accent-foreground))"}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-700 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-2xl tabular-nums leading-none">
              {formatPomoTime(s.remaining)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {isFocus ? <Brain className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
              {isFocus ? "focus" : "break"}
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {idle ? "Ready when you are" : isFocus ? "Focusing on" : "Resting from"}
            </div>
            <p className="line-clamp-2 text-sm font-medium">
              {s.taskTitle || "Pick a task to begin a soft session."}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => pomodoro.toggle()}
              disabled={!s.taskId && idle}
            >
              {s.running ? (
                <><Pause className="mr-1 h-3 w-3" /> Pause</>
              ) : (
                <><Play className="mr-1 h-3 w-3" /> {s.remaining < total ? "Resume" : "Start"}</>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => pomodoro.reset()}
              disabled={idle}
            >
              <RotateCcw className="mr-1 h-3 w-3" /> Reset
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 rounded-full px-2 text-xs"
              onClick={() => pomodoro.switchMode()}
            >
              {isFocus ? "→ break" : "→ focus"}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground">
            {s.completed === 0 ? "First soft session." : `${s.completed} session${s.completed > 1 ? "s" : ""} done today.`}
          </p>
        </div>
      </div>

      {idle && (
        <div className="mt-1 border-t border-border/50 pt-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick start
          </div>
          <div className="flex flex-wrap gap-1.5">
            {POMODORO_TEMPLATES.map((t) => (
              <TemplateChip key={t.id} template={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateChip({ template }: { template: PomodoroTemplate }) {
  const Icon = ICONS[template.icon] ?? Coffee;
  return (
    <button
      type="button"
      onClick={() => pomodoro.startTemplate({
        label: template.label,
        focusSeconds: template.focusSeconds,
        breakSeconds: template.breakSeconds,
        templateId: template.id,
      })}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1",
        "text-[11px] transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
      )}
      title={`${template.label} · ${template.description}`}
    >
      <Icon className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
      <span className="font-medium">{template.label}</span>
      <span className="text-[10px] text-muted-foreground">· {template.description}</span>
    </button>
  );
}
