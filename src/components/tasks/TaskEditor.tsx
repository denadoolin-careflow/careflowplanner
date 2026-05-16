import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon, X, Tag, Flag, Zap, Clock, Repeat, FolderKanban, Target,
  Star, Trash2, FileText, Link2, AlignLeft,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Task, AREAS, Priority, Energy, RecurrenceType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
  onUnschedule?: () => void | Promise<void>;
  unscheduleLabel?: string;
};

/* ---------- shared bits ---------- */

function Field({ icon: Icon, label, children, className }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      {title && (
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

function ProjectGoalLinks({ draft, set }: { draft: Task; set: <K extends keyof Task>(k: K, v: Task[K]) => void }) {
  const { state } = useStore();
  const projects = state.projects ?? [];
  return (
    <>
      <Field icon={FolderKanban} label="Project">
        <Select value={draft.projectId ?? "none"} onValueChange={v => set("projectId", v === "none" ? undefined : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="none">No project</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field icon={Target} label="Goal">
        <Select value={draft.goalId ?? "none"} onValueChange={v => set("goalId", v === "none" ? undefined : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="none">No goal</SelectItem>
            {state.goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

export function TaskEditor({ open, onOpenChange, task, onUnschedule, unscheduleLabel = "Unschedule" }: Props) {
  const { updateTask, deleteTask } = useStore();
  const [draft, setDraft] = useState<Task | null>(task);

  useEffect(() => { setDraft(task); }, [task]);
  if (!draft) return null;

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setDraft(d => d ? { ...d, [k]: v } : d);

  const save = async () => {
    if (!draft.title.trim()) { toast.error("Title is needed."); return; }
    await updateTask(draft.id, draft);
    toast.success("Saved.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[min(94vw,40rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-h-[85vh]"
      >
        {/* Sticky header */}
        <DialogHeader className="shrink-0 border-b border-border/60 bg-background/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <DialogTitle className="font-display text-base font-semibold">Edit task</DialogTitle>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="space-y-5">
            {/* Title — big and prominent */}
            <Input
              value={draft.title}
              onChange={e => set("title", e.target.value)}
              placeholder="Task title"
              className="h-11 border-0 bg-transparent px-0 text-lg font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />

            {/* Notes */}
            <Field icon={AlignLeft} label="Notes">
              <Textarea
                rows={3}
                value={draft.notes ?? ""}
                onChange={e => set("notes", e.target.value)}
                placeholder="Anything to remember…"
                className="resize-y"
              />
            </Field>

            {/* Schedule */}
            <Section title="Schedule">
              <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
                <Field icon={CalendarIcon} label="Due date">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start gap-2 px-3 font-normal",
                          !draft.dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="flex-1 truncate text-left">
                          {draft.dueDate ? format(parseISO(draft.dueDate), "MMM d, yyyy") : "Pick a date"}
                        </span>
                        {draft.dueDate && (
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label="Clear date"
                            onClick={(e) => { e.stopPropagation(); set("dueDate", undefined); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); set("dueDate", undefined); } }}
                            className="rounded p-0.5 opacity-60 hover:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="z-[60] w-auto p-0"
                      align="start"
                      collisionPadding={12}
                    >
                      <Calendar
                        mode="single"
                        selected={draft.dueDate ? parseISO(draft.dueDate) : undefined}
                        onSelect={(d) => set("dueDate", d ? format(d, "yyyy-MM-dd") : undefined)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
                <Field icon={Repeat} label="Repeats">
                  <Select value={draft.recurrenceType ?? "none"} onValueChange={v => set("recurrenceType", v as RecurrenceType)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Doesn't repeat</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {draft.recurrenceType && draft.recurrenceType !== "none" && (
                  <Field icon={Repeat} label="Every (interval)" className="sm:col-span-2">
                    <Input
                      type="number"
                      min={1}
                      value={draft.recurrenceInterval ?? 1}
                      onChange={e => set("recurrenceInterval", Number(e.target.value) || 1)}
                      className="w-full"
                    />
                  </Field>
                )}
              </div>
            </Section>

            {/* Attributes */}
            <Section title="Attributes">
              <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
                <Field icon={Tag} label="Area">
                  <Select value={draft.area} onValueChange={v => set("area", v as any)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-64">
                      {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field icon={Flag} label="Priority">
                  <Select value={draft.priority} onValueChange={v => set("priority", v as Priority)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field icon={Zap} label="Energy">
                  <Select value={draft.energy ?? "none"} onValueChange={v => set("energy", v === "none" ? undefined : v as Energy)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field icon={Clock} label="Est. minutes">
                  <Input
                    type="number"
                    min={0}
                    placeholder="—"
                    value={draft.estMinutes ?? ""}
                    onChange={e => set("estMinutes", e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full"
                  />
                </Field>
              </div>
            </Section>

            {/* Links */}
            <Section title="Links">
              <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
                <ProjectGoalLinks draft={draft} set={set} />
              </div>
            </Section>

            {/* Top three */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Star className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">Top three today</div>
                  <div className="truncate text-xs text-muted-foreground">Hold space for what matters most.</div>
                </div>
              </div>
              <Switch checked={!!draft.isTopThree} onCheckedChange={v => set("isTopThree", v)} />
            </div>

            {/* Linked notes */}
            <Section title={undefined}>
              <div className="flex items-center gap-1.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                <Link2 className="h-3 w-3" /> Linked notes
              </div>
              <LinkedNotesPanel entityType="task" entityId={draft.id} contextTitle={draft.title} compact />
            </Section>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive sm:self-start"
              onClick={async () => { await deleteTask(draft.id); toast("This can wait."); onOpenChange(false); }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              {onUnschedule && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => { await onUnschedule(); onOpenChange(false); }}
                >
                  {unscheduleLabel}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}