import { useState } from "react";
import { Check, Sparkles, X, CalendarIcon, Flag, Clock, Tag, FolderKanban, ListChecks, Paperclip, Zap, Repeat, ChevronRight, Command } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TASK_EDITOR_STYLES, TaskEditorStyle, useTaskEditorStyle } from "@/lib/task-editor-style";

/* ─── Shared sample task used across every preview ─── */
const SAMPLE = {
  title: "Do a load of laundry",
  notes: "Whites and towels · gentle cycle · air-dry the delicate pieces.",
  project: "Home Reset",
  area: "Home",
  due: "Today · 4:30 PM",
  duration: "45 min",
  energy: "Low",
  priority: "Medium",
  tags: ["#weekly", "#quick-win"],
  subtasks: [
    { text: "Sort colors", done: true },
    { text: "Load washer + detergent", done: true },
    { text: "Transfer to dryer", done: false },
    { text: "Fold + put away", done: false },
  ],
  attachments: 2,
};

/* ─────────────────────────────────────────────────────────── */
/* Style 1 · Focused Sheet                                    */
/* ─────────────────────────────────────────────────────────── */
function FocusedSheetPreview() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Task</span>
        <X className="h-3.5 w-3.5 text-muted-foreground/60" />
      </div>
      <div className="flex-1 space-y-4 overflow-hidden px-5 py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded border border-primary/60" />
            <span className="text-[10px] uppercase tracking-[0.15em] text-primary/80">In progress</span>
          </div>
          <h2 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-foreground">
            {SAMPLE.title}
          </h2>
          <p className="text-[12px] leading-relaxed text-muted-foreground">{SAMPLE.notes}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
          <div className="mb-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <FolderKanban className="h-3 w-3" /> Project & area
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{SAMPLE.project}</span>
            <span className="rounded-full bg-accent/40 px-2 py-0.5 text-[11px] font-medium text-accent-foreground">{SAMPLE.area}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip icon={CalendarIcon}>{SAMPLE.due}</Chip>
          <Chip icon={Clock}>{SAMPLE.duration}</Chip>
          <Chip icon={Zap}>{SAMPLE.energy}</Chip>
          <Chip icon={Flag}>{SAMPLE.priority}</Chip>
        </div>
        <div className="space-y-1.5">
          {SAMPLE.subtasks.slice(0, 3).map(s => (
            <div key={s.text} className="flex items-center gap-2 text-[12px]">
              <div className={cn("h-3.5 w-3.5 rounded border", s.done ? "border-primary bg-primary" : "border-border")}>
                {s.done && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <span className={cn(s.done && "text-muted-foreground line-through")}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Style 2 · Split Inspector                                  */
/* ─────────────────────────────────────────────────────────── */
function SplitInspectorPreview() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Task · L23</span>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘S</span>
          <X className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="grid flex-1 grid-cols-[1.5fr_1fr] overflow-hidden">
        <div className="space-y-3 border-r border-border/50 px-4 py-3">
          <h2 className="text-base font-semibold leading-snug text-foreground">{SAMPLE.title}</h2>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{SAMPLE.notes}</p>
          <div className="space-y-1 pt-1">
            {SAMPLE.subtasks.map(s => (
              <div key={s.text} className="flex items-center gap-2 text-[11px]">
                <div className={cn("h-3 w-3 rounded-sm border", s.done ? "border-primary bg-primary" : "border-border")} />
                <span className={cn(s.done && "text-muted-foreground line-through")}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2.5 bg-muted/20 px-3 py-3">
          <Prop label="Project" value={SAMPLE.project} />
          <Prop label="Area" value={SAMPLE.area} />
          <Prop label="Due" value={SAMPLE.due} />
          <Prop label="Duration" value={SAMPLE.duration} />
          <Prop label="Energy" value={SAMPLE.energy} />
          <Prop label="Priority" value={SAMPLE.priority} />
          <div className="pt-1">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Tags</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {SAMPLE.tags.map(t => (
                <span key={t} className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Style 3 · Compact Command                                  */
/* ─────────────────────────────────────────────────────────── */
function CompactCommandPreview() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl bg-gradient-to-br from-muted/40 to-muted/10 p-4">
      <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
          <Command className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            readOnly
            value={SAMPLE.title}
            className="flex-1 bg-transparent text-[13px] font-medium text-foreground outline-none"
          />
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">⏎</span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/50">
          <MiniProp icon={CalendarIcon} label={SAMPLE.due} />
          <MiniProp icon={Clock} label={SAMPLE.duration} />
          <MiniProp icon={Flag} label={SAMPLE.priority} />
          <MiniProp icon={FolderKanban} label={SAMPLE.project} />
          <MiniProp icon={Tag} label={SAMPLE.area} />
          <MiniProp icon={Zap} label={SAMPLE.energy} />
        </div>
        <div className="space-y-1 px-3 py-2">
          {SAMPLE.subtasks.slice(0, 2).map(s => (
            <div key={s.text} className="flex items-center gap-2 text-[11px]">
              <div className={cn("h-3 w-3 rounded border", s.done ? "border-primary bg-primary" : "border-border")} />
              <span className={cn(s.done && "text-muted-foreground line-through")}>{s.text}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground">
          <span>{SAMPLE.tags.join(" ")}</span>
          <span>⌘K actions</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Style 4 · Fullscreen Focus                                 */
/* ─────────────────────────────────────────────────────────── */
function FullscreenFocusPreview() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-muted/40">
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Home Reset / Task</span>
        <span className="flex items-center gap-2"><Sparkles className="h-3 w-3" /> Focus</span>
      </div>
      <div className="mx-auto flex w-full max-w-[92%] flex-1 flex-col justify-center gap-3 px-5 py-4">
        <span className="text-[10px] uppercase tracking-[0.22em] text-primary/80">Today · 4:30 PM</span>
        <h2 className="font-display text-[24px] font-semibold leading-tight tracking-tight text-foreground">
          {SAMPLE.title}
        </h2>
        <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground">{SAMPLE.notes}</p>
        <div className="mt-1 space-y-1.5">
          {SAMPLE.subtasks.slice(0, 3).map(s => (
            <div key={s.text} className="flex items-center gap-2 text-[12px]">
              <div className={cn("h-3.5 w-3.5 rounded-full border", s.done ? "border-primary bg-primary" : "border-border")} />
              <span className={cn(s.done && "text-muted-foreground line-through")}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border/30 bg-background/60 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <ChevronRight className="h-3 w-3" />
          <span>{SAMPLE.project}</span>
          <span>·</span>
          <span>{SAMPLE.duration}</span>
          <span>·</span>
          <span>{SAMPLE.energy} energy</span>
          <div className="ml-auto flex items-center gap-1">
            <Paperclip className="h-3 w-3" /> {SAMPLE.attachments}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─── */
function Chip({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[11px] text-foreground">
      <Icon className="h-3 w-3 text-muted-foreground" />
      {children}
    </span>
  );
}
function Prop({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground">{value}</span>
    </div>
  );
}
function MiniProp({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-card px-2 py-1.5 text-[10px] text-foreground">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </div>
  );
}

const PREVIEWS: Record<TaskEditorStyle, React.ComponentType> = {
  "focused-sheet": FocusedSheetPreview,
  "split-inspector": SplitInspectorPreview,
  "compact-command": CompactCommandPreview,
  "fullscreen-focus": FullscreenFocusPreview,
};

export default function TaskEditorStyles() {
  const [saved, setSaved] = useTaskEditorStyle();
  const [hovered, setHovered] = useState<TaskEditorStyle | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Task editor · visual styles
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Choose the task editor that fits your flow
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Each preview uses the same sample task so you can compare density,
          hierarchy, and metadata treatment side-by-side. Pick one to make it
          your default.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {TASK_EDITOR_STYLES.map(({ id, name, inspiration, blurb }) => {
          const Preview = PREVIEWS[id];
          const isSaved = saved === id;
          return (
            <div
              key={id}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-3xl border bg-card/40 p-4 shadow-sm transition-all",
                isSaved
                  ? "border-primary/60 ring-2 ring-primary/30"
                  : "border-border/60 hover:border-primary/40 hover:shadow-lg",
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{name}</h2>
                    {isSaved && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {inspiration}
                  </div>
                  <p className="pt-1 text-[13px] text-muted-foreground">{blurb}</p>
                </div>
                <Button
                  size="sm"
                  variant={isSaved ? "secondary" : "default"}
                  onClick={() => {
                    setSaved(id);
                    toast.success(`${name} set as your task editor`);
                  }}
                >
                  {isSaved ? "Selected" : "Use this style"}
                </Button>
              </div>
              <div
                className={cn(
                  "relative aspect-[4/3] w-full transition-transform duration-300",
                  hovered === id && "scale-[1.01]",
                )}
              >
                <Preview />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}