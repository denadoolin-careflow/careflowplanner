import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Sparkles, X, CornerDownLeft } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useStore, todayISO } from "@/lib/store";
import { AREAS } from "@/lib/types";
import { toast } from "sonner";
import { useDraggableFab } from "@/hooks/use-draggable-fab";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { parseTaskInput } from "@/lib/nlp-task";
import { useQuickAddPresets, type QuickAddKind, type QuickAddPreset } from "@/lib/quick-add-presets";

type Mode = QuickAddKind | "command";

export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("command");
  const [palette, setPalette] = useState("");
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
            onPick={(k) => setMode(k)}
            onClose={close}
          />
        ) : (
          <FormShell mode={mode} onBack={() => setMode("command")} onClose={close} initialText={palette} />
        )}
      </DialogContent>
    </Dialog>
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
  onPick: (k: QuickAddKind) => void;
  onClose: () => void;
}) {
  const { addTask } = useStore();
  const parsed = useMemo(() => parseTaskInput(value), [value]);
  const hasText = value.trim().length > 0;

  const submitAsTask = async () => {
    if (!parsed.title) return;
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
    });
    toast.success("Captured.", { description: parsed.title });
    haptics.tap();
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
        <CommandInput
          autoFocus
          placeholder="Type a task in plain English  —  e.g. Doctor tomorrow 3pm #health p2 for 30m"
          value={value}
          onValueChange={onChange}
        />
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
        <span>Tips: <code className="rounded bg-muted px-1">tomorrow 3pm</code> · <code className="rounded bg-muted px-1">#tag</code> · <code className="rounded bg-muted px-1">@home</code> · <code className="rounded bg-muted px-1">p1-p4</code> · <code className="rounded bg-muted px-1">every sunday</code></span>
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
      </Tabs>
    </div>
  );
}

function TaskForm({ onClose, initialText }: { onClose: () => void; initialText: string }) {
  const { addTask } = useStore();
  const [text, setText] = useState(initialText);
  const parsed = useMemo(() => parseTaskInput(text), [text]);
  const [area, setArea] = useState(parsed.area ?? "Personal");
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
