import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Brain, Coffee, Heart, Home, Play, Sparkles, Timer } from "lucide-react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { pomodoro } from "@/lib/pomodoro-store";
import {
  usePomodoroTemplatesList,
  type CustomTemplate,
} from "@/lib/pomodoro-templates";
import { pomodoroDefaults } from "@/lib/pomodoro-defaults";
import { PomodoroHistory } from "@/components/tasks/PomodoroHistory";

const ICONS = { Sparkles, BookOpen, Home, Brain, Heart, Coffee } as const;
const NO_TASK = "__none__";

export default function PomodoroPicker() {
  const navigate = useNavigate();
  const { state } = useStore();
  const templates = usePomodoroTemplatesList();

  const openTasks = useMemo(
    () => state.tasks.filter(t => !t.done).slice(0, 80),
    [state.tasks],
  );

  const [taskId, setTaskId] = useState<string>(NO_TASK);
  const [quickTitle, setQuickTitle] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    templates[0]?.id ?? null,
  );

  const selectedTask = openTasks.find(t => t.id === taskId);
  const suggested = pomodoroDefaults.resolve(selectedTask?.area);

  const start = (tpl: CustomTemplate) => {
    if (selectedTask) {
      pomodoro.startForTask(
        { id: selectedTask.id, title: selectedTask.title },
        {
          focusSeconds: tpl.focusSeconds,
          breakSeconds: tpl.breakSeconds,
          templateId: tpl.id,
          templateLabel: tpl.label,
        },
      );
    } else {
      const title = quickTitle.trim() || tpl.label;
      pomodoro.startForTask(
        { id: `quick:${Date.now()}`, title },
        {
          focusSeconds: tpl.focusSeconds,
          breakSeconds: tpl.breakSeconds,
          templateId: tpl.id,
          templateLabel: tpl.label,
        },
      );
    }
    navigate("/today");
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Timer className="h-3.5 w-3.5" /> Quick start
        </div>
        <h1 className="font-display text-3xl">Pick a rhythm</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a template that matches your energy. We'll set the focus and break for you.
        </p>
      </div>

      <SectionCard title="What are you working on?" subtitle="Optional — attach a task or just freeform." accent="calm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Existing task</label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger className="h-9 rounded-full text-sm">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TASK}>None — freeform session</SelectItem>
                {openTasks.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Or jot a label</label>
            <Input
              placeholder="e.g. Tidy kitchen counter"
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              disabled={taskId !== NO_TASK}
              className="h-9 rounded-full text-sm"
            />
          </div>
        </div>
        {selectedTask && suggested && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Suggested for <span className="font-medium text-foreground">{selectedTask.area}</span>:{" "}
            <span className="font-medium text-foreground">{suggested.templateLabel}</span>
          </p>
        )}
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map(t => {
          const Icon = ICONS[t.icon] ?? Coffee;
          const active = selectedId === t.id;
          const recommended = suggested?.templateId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              onDoubleClick={() => start(t)}
              className={cn(
                "cozy-card group flex flex-col items-start gap-2 rounded-3xl p-4 text-left transition-all",
                "hover:-translate-y-0.5 hover:shadow-md",
                active
                  ? "border-primary/60 ring-2 ring-primary/30"
                  : "border-border/60",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <div className={cn(
                  "grid h-10 w-10 place-items-center rounded-2xl",
                  active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:text-primary",
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                {recommended && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                    Suggested
                  </span>
                )}
              </div>
              <div className="font-display text-lg leading-tight">{t.label}</div>
              <div className="text-xs text-muted-foreground">{t.description}</div>
              <div className="mt-2 flex items-baseline gap-1 text-[11px] text-muted-foreground">
                <span className="font-display text-2xl tabular-nums text-foreground">
                  {Math.round(t.focusSeconds / 60)}
                </span>
                <span>min focus ·</span>
                <span className="font-display text-base tabular-nums text-foreground">
                  {Math.round(t.breakSeconds / 60)}
                </span>
                <span>min break</span>
              </div>
              <Button
                size="sm"
                variant={active ? "default" : "outline"}
                className="mt-2 h-8 w-full rounded-full text-xs"
                onClick={(e) => { e.stopPropagation(); start(t); }}
              >
                <Play className="mr-1 h-3 w-3" /> Start
              </Button>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] italic text-muted-foreground">
        Tip: double-click a card to begin instantly. Customize templates in Settings.
      </p>

      <PomodoroHistory />
    </div>
  );
}
