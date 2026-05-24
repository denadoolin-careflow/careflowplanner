import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Sparkles, X, CornerDownLeft, FolderOpen, Layers, Flag, Check, Mic, MicOff, Brain, Wand2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useStore, todayISO } from "@/lib/store";
import { AREAS, type TaskStatus, type Area } from "@/lib/types";
import { toast } from "sonner";
import { useDraggableFab } from "@/hooks/use-draggable-fab";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { parseTaskInput } from "@/lib/nlp-task";
import { useQuickAddPresets, type QuickAddKind, type QuickAddPreset } from "@/lib/quick-add-presets";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { supabase } from "@/integrations/supabase/client";
import { VoiceCaptureDialog } from "@/components/voice/VoiceCaptureDialog";

type Mode = QuickAddKind | "command" | "braindump" | "voice";

const STATUS_LABEL: Record<TaskStatus, string> = {
  active: "Active",
  this_week: "This week",
  someday: "Someday",
  waiting: "Waiting",
  done: "Done",
  parked: "Not today",
};

export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("command");
  const [palette, setPalette] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const drag = useDraggableFab("careflow:fab:quickadd", { right: 16, bottom: 88 });
  const { presets } = useQuickAddPresets();

  const openWith = useCallback((m: Mode) => {
    setMode(m);
    setOpen(true);
    haptics.pickup();
  }, []);

  // Listen for widget "+" broadcasts.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string }>).detail;
      if (detail?.tab === "voice") { setVoiceOpen(true); haptics.pickup(); return; }
      const next = (detail?.tab as Mode) || "command";
      openWith(next);
    };
    window.addEventListener("careflow:quick-add", handler as EventListener);
    return () => window.removeEventListener("careflow:quick-add", handler as EventListener);
  }, [openWith]);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMode("command");
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => { setOpen(false); setPalette(""); setMode("command"); };

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <button
        ref={drag.ref}
        {...drag.handlers}
        onClick={(e) => {
          if (drag.dragging) { e.preventDefault(); return; }
          haptics.tap();
          setMode("command");
          setOpen(true);
        }}
        aria-label="Quick add"
        style={drag.style}
        className={cn(
          "fixed z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-cozy",
          "transition-transform hover:scale-105 active:scale-95",
          drag.dragging && "scale-110 ring-2 ring-primary/40",
        )}
      >
        <Plus className="h-6 w-6" />
      </button>

      <DialogContent className="max-w-xl p-0 overflow-hidden gap-0 border-primary/20 bg-card/95 backdrop-blur-xl">
        {mode === "command" ? (
          <CommandPalette
            value={palette}
            onChange={setPalette}
            presets={presets}
            onPick={(k) => {
              if (k === "voice") { setOpen(false); setVoiceOpen(true); return; }
              setMode(k);
            }}
            onClose={close}
          />
        ) : (
          <FormShell mode={mode} onBack={() => setMode("command")} onClose={close} initialText={palette} />
        )}
      </DialogContent>
    </Dialog>
    <VoiceCaptureDialog open={voiceOpen} onOpenChange={setVoiceOpen} />
    </>
  );
}

/* ───────────────────────── Command palette ───────────────────────── */

function PresetIcon({ name, className }: { name?: string | null; className?: string }) {
  const Cmp = (name && (LucideIcons as any)[name]) || Sparkles;
  return <Cmp className={className} />;
}

function CommandPalette({
  value, onChange, presets, onPick, onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  presets: QuickAddPreset[];
  onPick: (k: Mode) => void;
  onClose: () => void;
}) {
  const { addTask, addProject, state } = useStore();
  const navigate = useNavigate();
  const parsed = useMemo(() => parseTaskInput(value), [value]);
  const hasText = value.trim().length > 0;
  const projects = state.projects ?? [];
  const areas = state.areas ?? [];
  const dictation = useVoiceDictation((t) => onChange(t));

  // Overrides set by the picker chips. Undefined = follow NLP defaults.
  const [pickedProjectId, setPickedProjectId] = useState<string | undefined | null>(undefined); // null = explicit "no project"
  const [pickedStatus, setPickedStatus] = useState<TaskStatus | undefined>(undefined);
  const [pickedArea, setPickedArea] = useState<Area | undefined>(undefined);

  const effectiveProject = pickedProjectId === null
    ? undefined
    : pickedProjectId
      ? projects.find(p => p.id === pickedProjectId)
      : undefined;
  const effectiveStatus: TaskStatus = pickedStatus ?? (parsed.someday ? "someday" : "active");
  const effectiveArea: Area = (pickedArea ?? effectiveProject?.areaName as Area | undefined ?? parsed.area ?? "Personal") as Area;

  const resolveProject = async (): Promise<string | undefined> => {
    if (pickedProjectId === null) return undefined;
    if (pickedProjectId) return pickedProjectId;
    if (!parsed.projectName) return undefined;
    const lower = parsed.projectName.toLowerCase();
    const existing = projects.find(p => p.name.toLowerCase() === lower);
    if (existing) return existing.id;
    const created = await addProject({ name: parsed.projectName, areaName: parsed.area });
    return created?.id;
  };

  const routeAfterCapture = (opts: { projectId?: string; status: TaskStatus; dueDate?: string }) => {
    if (opts.projectId) return navigate(`/projects/${opts.projectId}`);
    if (opts.status === "someday") return navigate("/inbox");
    if (opts.dueDate) {
      if (opts.dueDate === todayISO()) return navigate("/today");
      return navigate("/week");
    }
    return navigate("/inbox");
  };

  const submitAsTask = async () => {
    if (!parsed.title) return;
    const projectId = await resolveProject();
    const status = effectiveStatus;
    const inboxBound = !parsed.dueDate && !projectId && status === "active";
    await addTask({
      title: parsed.title,
      area: effectiveArea as any,
      priority: parsed.priority ?? "medium",
      dueDate: parsed.dueDate,
      tags: parsed.tags,
      estMinutes: parsed.estMinutes,
      recurrenceType: parsed.recurrenceType,
      recurrenceInterval: parsed.recurrenceInterval,
      recurrenceDays: parsed.recurrenceDays,
      projectId,
      inbox: inboxBound,
      status,
    });
    const destLabel = projectId
      ? (effectiveProject?.name ?? "project")
      : status === "someday" ? "Someday"
      : parsed.dueDate === todayISO() ? "Today"
      : parsed.dueDate ? "Upcoming"
      : "Inbox";
    toast.success(`Added to ${destLabel}`, { description: parsed.title });
    haptics.tap();
    routeAfterCapture({ projectId, status, dueDate: parsed.dueDate });
    onClose();
  };

  return (
    <Command
      className="bg-transparent"
      shouldFilter={true}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && hasText) {
          e.preventDefault();
          submitAsTask();
        }
      }}
    >
      <div className="border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-1">
          <CommandInput
            autoFocus
            placeholder="Type or speak — e.g. Doctor tomorrow 3pm #health p2 for 30m"
            value={value}
            onValueChange={onChange}
            className="flex-1"
          />
          {dictation.supported && (
            <button
              type="button"
              onClick={dictation.toggle}
              title={dictation.listening ? "Stop voice capture" : "Voice capture"}
              aria-label="Voice capture"
              className={cn(
                "mr-1 grid h-8 w-8 place-items-center rounded-full border border-border/60 transition-colors",
                dictation.listening
                  ? "border-rose-400/60 bg-rose-500/10 text-rose-600 dark:text-rose-300 animate-pulse"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {dictation.listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
        {parsed.chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 px-2 pb-2">
            {parsed.chips.map((c, i) => (
              <Badge key={i} variant="outline" className="rounded-full bg-primary/10 text-[10px] uppercase tracking-wide">
                {c.label}
              </Badge>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground">⌘↵ to add as task</span>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 px-2 pb-1">
          {/* Project picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[11px] hover:bg-muted/60",
                effectiveProject && "border-primary/40 bg-primary/10 text-primary"
              )}>
                <FolderOpen className="h-3 w-3" />
                {effectiveProject?.name ?? (pickedProjectId === null ? "No project" : "Project")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search projects…" />
                <CommandList>
                  <CommandEmpty>No projects.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__none__" onSelect={() => setPickedProjectId(null)}>
                      <span className="flex-1">No project</span>
                      {pickedProjectId === null && <Check className="h-3.5 w-3.5" />}
                    </CommandItem>
                    {projects.map(p => (
                      <CommandItem key={p.id} value={p.name} onSelect={() => setPickedProjectId(p.id)}>
                        <FolderOpen className="mr-2 h-3.5 w-3.5 text-primary" />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground">{p.areaName ?? ""}</span>
                        {pickedProjectId === p.id && <Check className="ml-2 h-3.5 w-3.5" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Area picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[11px] hover:bg-muted/60",
                pickedArea && "border-primary/40 bg-primary/10 text-primary"
              )}>
                <Layers className="h-3 w-3" />
                {effectiveArea}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start">
              <Command>
                <CommandList>
                  <CommandGroup>
                    {(areas.length ? areas.map(a => a.name) : AREAS).map(name => (
                      <CommandItem key={name} value={name} onSelect={() => setPickedArea(name as Area)}>
                        <span className="flex-1">{name}</span>
                        {effectiveArea === name && <Check className="h-3.5 w-3.5" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Status picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[11px] hover:bg-muted/60",
                pickedStatus && "border-primary/40 bg-primary/10 text-primary"
              )}>
                <Flag className="h-3 w-3" />
                {STATUS_LABEL[effectiveStatus]}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0" align="start">
              <Command>
                <CommandList>
                  <CommandGroup>
                    {(["active","this_week","someday","waiting"] as TaskStatus[]).map(s => (
                      <CommandItem key={s} value={s} onSelect={() => setPickedStatus(s)}>
                        <span className="flex-1">{STATUS_LABEL[s]}</span>
                        {effectiveStatus === s && <Check className="h-3.5 w-3.5" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {(pickedProjectId !== undefined || pickedStatus || pickedArea) && (
            <button
              onClick={() => { setPickedProjectId(undefined); setPickedStatus(undefined); setPickedArea(undefined); }}
              className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
            >Reset</button>
          )}
        </div>
      </div>

      <CommandList className="max-h-[420px]">
        {hasText && (
          <CommandGroup heading="Capture">
            <CommandItem value={`add task ${value}`} onSelect={submitAsTask} className="gap-3">
              <PresetIcon name="CheckSquare" className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm">Add as task — <span className="text-muted-foreground">{parsed.title}</span></div>
              </div>
              <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading="Modes">
          <CommandItem value="voice capture record" onSelect={() => onPick("voice" as Mode)} className="gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-300">
              <Mic className="h-3.5 w-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm">Voice capture</div>
              <div className="truncate text-[11px] text-muted-foreground">Record — we transcribe & organize into tasks.</div>
            </div>
          </CommandItem>
          <CommandItem value="brain dump inbox" onSelect={() => onPick("braindump" as Mode)} className="gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent/30 text-accent-foreground">
              <Brain className="h-3.5 w-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm">Brain dump</div>
              <div className="truncate text-[11px] text-muted-foreground">Empty your head — we'll route each line.</div>
            </div>
          </CommandItem>
        </CommandGroup>

        {hasText && projects.length > 0 && (
          <CommandGroup heading="Add to project">
            {projects.slice(0, 6).map((p) => (
              <CommandItem
                key={p.id}
                value={`project ${p.name}`}
                onSelect={async () => {
                  await addTask({
                    title: parsed.title,
                    area: (parsed.area ?? p.areaName ?? "Personal") as any,
                    priority: parsed.priority ?? "medium",
                    dueDate: parsed.dueDate,
                    tags: parsed.tags,
                    estMinutes: parsed.estMinutes,
                    projectId: p.id,
                  });
                  toast.success(`Added to ${p.name}`);
                  haptics.tap();
                  onClose();
                }}
                className="gap-3"
              >
                <PresetIcon name="FolderOpen" className="h-4 w-4 text-primary" />
                <span className="flex-1 truncate text-sm">{p.name}</span>
                <span className="text-[10px] text-muted-foreground">{p.areaName ?? ""}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="New">
          {presets.map((p) => (
            <CommandItem
              key={p.id}
              value={`${p.label} ${p.kind}`}
              onSelect={() => onPick(p.kind)}
              className="gap-3"
            >
              <span className={cn(
                "grid h-7 w-7 place-items-center rounded-md",
                p.color === "accent" ? "bg-accent/30 text-accent-foreground" :
                p.color === "secondary" ? "bg-secondary text-secondary-foreground" :
                p.color === "moon" ? "bg-moon-soft text-moon-foreground" :
                "bg-primary/15 text-primary"
              )}>
                <PresetIcon name={p.icon} className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 truncate">{p.label}</span>
              {p.hotkey && <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{p.hotkey}</kbd>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandEmpty>Nothing matches. Press ⌘↵ to capture as task.</CommandEmpty>
      </CommandList>

      <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
        <span>Tips: <code className="rounded bg-muted px-1">tomorrow 3pm</code> · <code className="rounded bg-muted px-1">#tag</code> · <code className="rounded bg-muted px-1">@home</code> · <code className="rounded bg-muted px-1">+project</code> · <code className="rounded bg-muted px-1">~someday</code> · <code className="rounded bg-muted px-1">p1-p4</code></span>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted/60"><X className="h-3.5 w-3.5" /></button>
      </div>
    </Command>
  );
}

/* ───────────────────────── Forms (kept) ───────────────────────── */

function FormShell({ mode, onBack, onClose, initialText }: { mode: Exclude<Mode, "command">; onBack: () => void; onClose: () => void; initialText: string }) {
  return (
    <div className="p-6">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onBack} className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
          ← Back
        </button>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted/60"><X className="h-3.5 w-3.5" /></button>
      </div>
      <Tabs value={mode}>
        <TaskForm onClose={onClose} initialText={initialText} />
        <ApptForm onClose={onClose} initialText={initialText} />
        <JournalForm onClose={onClose} initialText={initialText} />
        <MealForm onClose={onClose} initialText={initialText} />
        <HabitForm onClose={onClose} initialText={initialText} />
        <IdeaForm onClose={onClose} initialText={initialText} />
        <BdayForm onClose={onClose} />
        <HolidayForm onClose={onClose} />
        <CleaningForm onClose={onClose} initialText={initialText} />
        <CareForm onClose={onClose} initialText={initialText} />
        <BrainDumpForm onClose={onClose} initialText={initialText} />
      </Tabs>
    </div>
  );
}

function TaskForm({ onClose, initialText }: { onClose: () => void; initialText: string }) {
  const { addTask } = useStore();
  const [text, setText] = useState(initialText);
  const parsed = useMemo(() => parseTaskInput(text), [text]);
  const [area, setArea] = useState<string>(parsed.area ?? "Personal");
  useEffect(() => { if (parsed.area) setArea(parsed.area); }, [parsed.area]);

  return (
    <TabsContent value="task" className="mt-0 space-y-3">
      <Input
        placeholder="What needs doing? (try natural language)"
        value={text}
        onChange={e => setText(e.target.value)}
        autoFocus
      />
      {parsed.chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {parsed.chips.map((c, i) => (
            <Badge key={i} variant="outline" className="rounded-full bg-primary/10 text-[10px]">{c.label}</Badge>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={parsed.dueDate ?? todayISO()} onChange={e => setText(t => t + ` ${e.target.value}`)} />
      </div>
      <Button className="w-full" onClick={async () => {
        if (!parsed.title.trim()) return;
        await addTask({
          title: parsed.title,
          area: area as any,
          priority: parsed.priority ?? "medium",
          dueDate: parsed.dueDate,
          tags: parsed.tags,
          estMinutes: parsed.estMinutes,
          recurrenceType: parsed.recurrenceType,
          recurrenceInterval: parsed.recurrenceInterval,
          recurrenceDays: parsed.recurrenceDays,
        });
        toast.success("Added to your list.");
        onClose();
      }}>Add task</Button>
    </TabsContent>
  );
}

function ApptForm({ onClose, initialText }: { onClose: () => void; initialText: string }) {
  const { addAppointment } = useStore();
  const parsedInit = parseTaskInput(initialText);
  const [title, setTitle] = useState(parsedInit.title);
  const [date, setDate] = useState(parsedInit.dueDate ?? todayISO());
  const [time, setTime] = useState(parsedInit.time ?? "");
  return (
    <TabsContent value="appointment" className="mt-0 space-y-3">
      <Input placeholder="Appointment title" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
      </div>
      <Button className="w-full" onClick={() => { if (!title.trim()) return; addAppointment({ title, date, time }); toast.success("Appointment saved."); onClose(); }}>Add appointment</Button>
    </TabsContent>
  );
}

function JournalForm({ onClose, initialText }: { onClose: () => void; initialText: string }) {
  const { addJournal } = useStore();
  const [body, setBody] = useState(initialText);
  return (
    <TabsContent value="journal" className="mt-0 space-y-3">
      <Textarea rows={5} placeholder="A few words is enough." value={body} onChange={e => setBody(e.target.value)} autoFocus />
      <Button className="w-full" onClick={() => { if (!body.trim()) return; addJournal({ body }); toast.success("Captured."); onClose(); }}>Save entry</Button>
    </TabsContent>
  );
}

function MealForm({ onClose, initialText }: { onClose: () => void; initialText: string }) {
  const { addMeal } = useStore();
  const [name, setName] = useState(initialText); const [date, setDate] = useState(todayISO()); const [slot, setSlot] = useState<"Breakfast"|"Lunch"|"Dinner"|"Snack">("Dinner");
  return (
    <TabsContent value="meal" className="mt-0 space-y-3">
      <Input placeholder="Meal name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Select value={slot} onValueChange={(v: any) => setSlot(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{["Breakfast","Lunch","Dinner","Snack"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button className="w-full" onClick={() => { if (!name.trim()) return; addMeal({ name, date, slot }); toast.success("Meal added."); onClose(); }}>Add meal</Button>
    </TabsContent>
  );
}

function HabitForm({ onClose, initialText }: { onClose: () => void; initialText: string }) {
  const { addHabit } = useStore(); const [title, setTitle] = useState(initialText);
  return (
    <TabsContent value="habit" className="mt-0 space-y-3">
      <Input placeholder="Tiny habit (one sentence)" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
      <Button className="w-full" onClick={() => { if (!title.trim()) return; addHabit({ title }); toast.success("Habit added."); onClose(); }}>Add habit</Button>
    </TabsContent>
  );
}

function IdeaForm({ onClose, initialText }: { onClose: () => void; initialText: string }) {
  const { addIdea } = useStore(); const [title, setTitle] = useState(initialText);
  return (
    <TabsContent value="idea" className="mt-0 space-y-3">
      <Input placeholder="Capture the spark" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
      <Button className="w-full" onClick={() => { if (!title.trim()) return; addIdea({ title }); toast.success("Saved to inbox."); onClose(); }}>Save idea</Button>
    </TabsContent>
  );
}

function BdayForm({ onClose }: { onClose: () => void }) {
  const { addBirthday } = useStore(); const [name, setName] = useState(""); const [date, setDate] = useState(todayISO());
  return (
    <TabsContent value="birthday" className="mt-0 space-y-3">
      <Input placeholder="Whose birthday?" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      <Button className="w-full" onClick={() => { if (!name.trim()) return; addBirthday({ name, date }); toast.success("Birthday added."); onClose(); }}>Add birthday</Button>
    </TabsContent>
  );
}

function HolidayForm({ onClose }: { onClose: () => void }) {
  const { addHoliday } = useStore(); const [name, setName] = useState(""); const [date, setDate] = useState(todayISO());
  return (
    <TabsContent value="holiday" className="mt-0 space-y-3">
      <Input placeholder="Holiday name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      <Button className="w-full" onClick={() => { if (!name.trim()) return; addHoliday({ name, date }); toast.success("Holiday added."); onClose(); }}>Add holiday</Button>
    </TabsContent>
  );
}

function CleaningForm({ onClose, initialText }: { onClose: () => void; initialText: string }) {
  const { addCleaning } = useStore(); const [title, setTitle] = useState(initialText); const [zone, setZone] = useState<any>("Kitchen");
  return (
    <TabsContent value="cleaning" className="mt-0 space-y-3">
      <Input placeholder="What to clean?" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
      <Select value={zone} onValueChange={setZone}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{["Kitchen","Bathroom","Bedrooms","Living","Laundry","Entryway","Outdoor","Whole home"].map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
      </Select>
      <Button className="w-full" onClick={() => { if (!title.trim()) return; addCleaning({ title, zone }); toast.success("Added to home reset."); onClose(); }}>Add cleaning task</Button>
    </TabsContent>
  );
}

function CareForm({ onClose, initialText }: { onClose: () => void; initialText: string }) {
  const { state, addCareNote } = useStore();
  const [recipientId, setRecipientId] = useState(state.recipients[0]?.id ?? "");
  const [body, setBody] = useState(initialText);
  return (
    <TabsContent value="care" className="mt-0 space-y-3">
      <Select value={recipientId} onValueChange={setRecipientId}>
        <SelectTrigger><SelectValue placeholder="Who is this about?" /></SelectTrigger>
        <SelectContent>{state.recipients.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
      </Select>
      <Textarea rows={4} placeholder="Note for the care log..." value={body} onChange={e => setBody(e.target.value)} autoFocus />
      <Button className="w-full" onClick={() => { if (!body.trim() || !recipientId) return; addCareNote({ recipientId, body }); toast.success("Care note saved."); onClose(); }}>Add care note</Button>
    </TabsContent>
  );
}

/* ───────────────────────── Brain dump ───────────────────────── */

function BrainDumpForm({ onClose, initialText }: { onClose: () => void; initialText: string }) {
  const { addTask } = useStore();
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [autoTriage, setAutoTriage] = useState(true);
  const dictation = useVoiceDictation((t) => {
    // Append final dictation as a new line so multiple thoughts stay separate.
    setText((prev) => {
      const sep = prev && !prev.endsWith("\n") ? "\n" : "";
      return prev + sep + t;
    });
  });

  const lines = useMemo(
    () => text.split(/\r?\n|;|•|·/).map((l) => l.trim()).filter(Boolean),
    [text]
  );

  const flush = async () => {
    if (lines.length === 0) return;
    setBusy(true);
    try {
      for (const line of lines) {
        const parsed = parseTaskInput(line);
        if (!parsed.title) continue;
        await addTask({
          title: parsed.title,
          area: (parsed.area ?? "Personal") as any,
          priority: parsed.priority ?? "medium",
          dueDate: parsed.dueDate,
          tags: parsed.tags,
          estMinutes: parsed.estMinutes,
          recurrenceType: parsed.recurrenceType,
          recurrenceInterval: parsed.recurrenceInterval,
          recurrenceDays: parsed.recurrenceDays,
          inbox: !parsed.dueDate,
          status: parsed.someday ? "someday" : "active",
        });
      }
      toast.success(`Captured ${lines.length} item${lines.length === 1 ? "" : "s"}`, {
        description: autoTriage ? "Routing with smart triage…" : "Everything landed in your inbox.",
      });
      if (autoTriage) {
        // Fire-and-forget — the inbox will reflect updated suggestions next time it's opened.
        supabase.functions
          .invoke("ai-inbox-triage", { body: {} })
          .then(() => toast.success("Smart triage ready in Inbox"))
          .catch(() => {});
      }
      haptics.tap();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save brain dump");
    } finally {
      setBusy(false);
    }
  };

  return (
    <TabsContent value="braindump" className="mt-0 space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Brain className="h-3.5 w-3.5 text-primary" />
        One thought per line. We'll route each one to the right place.
      </div>
      <Textarea
        rows={8}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"call vet tomorrow 3pm #pet\nlaundry today\ngrocery run ~someday\nreply to mom @home"}
        className="rounded-2xl bg-card/60 text-sm leading-relaxed"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); flush(); }
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        {dictation.supported && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={dictation.toggle}
            className={cn(dictation.listening && "border-rose-400/60 text-rose-600 dark:text-rose-300")}
          >
            {dictation.listening ? <MicOff className="mr-1 h-3.5 w-3.5" /> : <Mic className="mr-1 h-3.5 w-3.5" />}
            {dictation.listening ? "Listening…" : "Voice"}
          </Button>
        )}
        <label className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[11px]">
          <input
            type="checkbox"
            className="h-3 w-3 accent-primary"
            checked={autoTriage}
            onChange={(e) => setAutoTriage(e.target.checked)}
          />
          <Wand2 className="h-3 w-3" /> Smart route after
        </label>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {lines.length} item{lines.length === 1 ? "" : "s"} · ⌘↵ to save
        </span>
      </div>
      <Button className="w-full" onClick={flush} disabled={busy || lines.length === 0}>
        {busy ? "Saving…" : `Capture ${lines.length || ""} ${lines.length === 1 ? "thought" : "thoughts"}`.trim()}
      </Button>
    </TabsContent>
  );
}
