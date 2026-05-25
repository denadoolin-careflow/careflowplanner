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
  Star, Trash2, FileText, Link2, AlignLeft, Paperclip, ListTree, User,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Task, AREAS, Priority, Energy, RecurrenceType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { IconPicker } from "@/components/common/IconPicker";
import { LucideIconPicker } from "@/components/common/LucideIconPicker";
import { AttachmentsField } from "@/components/attachments/AttachmentsField";
import { NoteAIButton } from "@/components/notes/NoteAIButton";
import { SubtaskAddMenu } from "@/components/tasks/SubtaskAddMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TagPicker } from "@/components/tags/TagPicker";
import { supabase } from "@/integrations/supabase/client";

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
          <SelectContent className="z-[60] max-h-64" position="popper" sideOffset={6} collisionPadding={12}>
            <SelectItem value="none">No project</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field icon={Target} label="Goal">
        <Select value={draft.goalId ?? "none"} onValueChange={v => set("goalId", v === "none" ? undefined : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent className="z-[60] max-h-64" position="popper" sideOffset={6} collisionPadding={12}>
            <SelectItem value="none">No goal</SelectItem>
            {state.goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field icon={User} label="Linked person">
        <Select value={draft.recipientId ?? "none"} onValueChange={v => set("recipientId", v === "none" ? undefined : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent className="z-[60] max-h-64" position="popper" sideOffset={6} collisionPadding={12}>
            <SelectItem value="none">No one</SelectItem>
            {(state.recipients ?? []).map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

export function TaskEditor({ open, onOpenChange, task, onUnschedule, unscheduleLabel = "Unschedule" }: Props) {
  const { updateTask, deleteTask, addTask, toggleTask, state } = useStore();
  const [draft, setDraft] = useState<Task | null>(task);
  const [subDraft, setSubDraft] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [subAiLoading, setSubAiLoading] = useState(false);

  useEffect(() => { setDraft(task); }, [task]);
  if (!draft) return null;

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setDraft(d => d ? { ...d, [k]: v } : d);

  const subtasks = (state.tasks ?? []).filter(t => t.parentTaskId === draft.id);

  const addSubtaskNow = async (title: string) => {
    const t = title.trim();
    if (!t) return;
    await addTask({ title: t, area: draft.area, parentTaskId: draft.id, projectId: draft.projectId });
    setSubDraft("");
  };

  const generateSubtasksAI = async () => {
    if (subAiLoading) return;
    setSubAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-subtasks", {
        body: { title: draft.title, notes: draft.notes, area: draft.area, count: 5 },
      });
      if (error) throw error;
      const list: string[] = Array.isArray((data as any)?.subtasks) ? (data as any).subtasks : [];
      if (list.length === 0) { toast.error("No subtasks generated"); return; }
      for (const title of list) {
        await addTask({ title, area: draft.area, parentTaskId: draft.id, projectId: draft.projectId });
      }
      toast.success(`Added ${list.length} steps`);
    } catch (e: any) {
      toast.error("AI breakdown failed", { description: e?.message ?? String(e) });
    } finally {
      setSubAiLoading(false);
    }
  };

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
            <div className="flex items-center gap-2">
              <IconPicker
                value={draft.icon && !draft.icon.startsWith("lc:") ? draft.icon : undefined}
                onChange={v => set("icon", v)}
              />
              <LucideIconPicker
                value={draft.icon?.startsWith("lc:") ? draft.icon : undefined}
                onChange={v => set("icon", v)}
              />
              <Input
                value={draft.title}
                onChange={e => set("title", e.target.value)}
                placeholder="Task title"
                className="h-11 flex-1 border-0 bg-transparent px-0 text-lg font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Notes */}
            <div className="min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <AlignLeft className="h-3 w-3" />
                  Notes
                </Label>
                <NoteAIButton
                  title={draft.title}
                  body={draft.notes ?? ""}
                  onApply={(next) => set("notes", next)}
                />
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-2">
                <BlockEditor
                  body={draft.notes ?? ""}
                  onChange={(markdown) => set("notes", markdown)}
                  placeholder="Anything to remember… press / for blocks"
                />
              </div>
            </div>

            {/* Tags */}
            <Field icon={Tag} label="Tags">
              <TagPicker
                value={draft.tags ?? []}
                onChange={(next) => set("tags", next)}
              />
            </Field>

            {/* Subtasks */}
            <Section title={undefined}>
              <div className="flex items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                  <ListTree className="h-3 w-3" /> Subtasks
                  {subtasks.length > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-px text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                      {subtasks.filter(s => s.done).length}/{subtasks.length}
                    </span>
                  )}
                </div>
                <SubtaskAddMenu
                  size="md"
                  onAddManual={() => setAddingSub(true)}
                  onAddWithAI={generateSubtasksAI}
                  aiLoading={subAiLoading}
                />
              </div>
              <div className="space-y-1">
                {subtasks.map(s => (
                  <div key={s.id} className="group flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-2 py-1.5">
                    <Checkbox checked={s.done} onCheckedChange={() => toggleTask(s.id)} />
                    <span className={cn("flex-1 truncate text-sm", s.done && "text-muted-foreground line-through")}>{s.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => deleteTask(s.id)}
                      aria-label="Delete subtask"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {addingSub && (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={subDraft}
                      onChange={(e) => setSubDraft(e.target.value)}
                      placeholder="Subtask…"
                      className="h-8 text-sm"
                      onBlur={() => { if (!subDraft.trim()) setAddingSub(false); }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && subDraft.trim()) {
                          await addSubtaskNow(subDraft);
                        } else if (e.key === "Escape") {
                          setSubDraft("");
                          setAddingSub(false);
                        }
                      }}
                    />
                  </div>
                )}
                {!addingSub && subtasks.length === 0 && (
                  <p className="text-xs text-muted-foreground">No subtasks yet — break this down with the + menu.</p>
                )}
              </div>
            </Section>

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
                    <SelectContent className="z-[60]" position="popper" sideOffset={6} collisionPadding={12}>
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
                    <SelectContent className="z-[60] max-h-64" position="popper" sideOffset={6} collisionPadding={12}>
                      {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field icon={Flag} label="Priority">
                  <Select value={draft.priority} onValueChange={v => set("priority", v as Priority)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[60]" position="popper" sideOffset={6} collisionPadding={12}>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field icon={Zap} label="Energy">
                  <Select value={draft.energy ?? "none"} onValueChange={v => set("energy", v === "none" ? undefined : v as Energy)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[60]" position="popper" sideOffset={6} collisionPadding={12}>
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

            {/* Attachments */}
            <Section title={undefined}>
              <div className="flex items-center gap-1.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                <Paperclip className="h-3 w-3" /> Attachments
              </div>
              <AttachmentsField
                scope="task"
                ownerId={draft.id}
                value={draft.attachments}
                onChange={(next) => {
                  set("attachments", next);
                  // Persist immediately so files survive cancel.
                  void updateTask(draft.id, { attachments: next });
                }}
              />
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