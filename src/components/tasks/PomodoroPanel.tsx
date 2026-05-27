import { BookOpen, Brain, Coffee, Heart, Home, Pause, Pencil, Play, RotateCcw, Sparkles, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatPomoTime,
  pomoTotal,
  pomodoro,
  usePomodoro,
  type PomodoroTemplate,
} from "@/lib/pomodoro-store";
import { usePomodoroTemplatesList } from "@/lib/pomodoro-templates";

const ICONS = { Sparkles, BookOpen, Home, Brain, Heart, Coffee } as const;

interface PomodoroPanelProps {
  className?: string;
  compact?: boolean;
}

export function PomodoroPanel({ className, compact = false }: PomodoroPanelProps) {
  const s = usePomodoro();
  const templates = usePomodoroTemplatesList();
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
        <div className="flex items-center gap-1">
          <DurationEditor
            focusSeconds={s.focusSeconds}
            breakSeconds={s.breakSeconds}
          />
          {s.taskId && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => pomodoro.stop()}>
              <Square className="mr-1 h-3 w-3" /> end
            </Button>
          )}
        </div>
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
            <div className="font-display text-2xl font-semibold tabular-nums leading-none text-foreground">
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
            {templates.map((t) => (
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

function DurationEditor({ focusSeconds, breakSeconds }: { focusSeconds: number; breakSeconds: number }) {
  const [open, setOpen] = useState(false);
  const [focusMin, setFocusMin] = useState(Math.round(focusSeconds / 60));
  const [breakMin, setBreakMin] = useState(Math.round(breakSeconds / 60));

  // Sync local fields when store values change (e.g. switching templates).
  useEffect(() => { setFocusMin(Math.round(focusSeconds / 60)); }, [focusSeconds]);
  useEffect(() => { setBreakMin(Math.round(breakSeconds / 60)); }, [breakSeconds]);

  const clamp = (n: number, min: number, max: number) =>
    Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : min;

  const apply = () => {
    const f = clamp(focusMin, 1, 180);
    const b = clamp(breakMin, 1, 60);
    setFocusMin(f); setBreakMin(b);
    pomodoro.setDurations({ focusSeconds: f * 60, breakSeconds: b * 60 });
    setOpen(false);
  };

  const PRESETS: Array<{ f: number; b: number; label: string }> = [
    { f: 15, b: 5, label: "15 / 5" },
    { f: 25, b: 5, label: "25 / 5" },
    { f: 50, b: 10, label: "50 / 10" },
    { f: 90, b: 20, label: "90 / 20" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px]"
          aria-label="Customize timer durations"
        >
          <Pencil className="mr-1 h-3 w-3" /> edit
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Custom durations
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Tune focus & break to fit your energy.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="pomo-focus" className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Focus (min)
            </Label>
            <Input
              id="pomo-focus"
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              value={focusMin}
              onChange={(e) => setFocusMin(Number(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pomo-break" className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Break (min)
            </Label>
            <Input
              id="pomo-break"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              value={breakMin}
              onChange={(e) => setBreakMin(Number(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
              className="h-8"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setFocusMin(p.f); setBreakMin(p.b); }}
              className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" className="h-7 px-3 text-xs" onClick={apply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
