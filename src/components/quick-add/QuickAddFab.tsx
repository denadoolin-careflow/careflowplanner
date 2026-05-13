import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, todayISO } from "@/lib/store";
import { AREAS } from "@/lib/types";
import { toast } from "sonner";
import { useDraggableFab } from "@/hooks/use-draggable-fab";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string>("task");
  const drag = useDraggableFab("careflow:fab:quickadd", { right: 16, bottom: 88 });

  // Listen for widget "+" broadcasts to open with the right tab.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string }>).detail;
      const allowed = ["task","appointment","journal","meal","habit","idea","birthday","holiday","cleaning","care"];
      const next = detail?.tab && allowed.includes(detail.tab) ? detail.tab : "task";
      setTab(next);
      setOpen(true);
      haptics.pickup();
    };
    window.addEventListener("careflow:quick-add", handler as EventListener);
    return () => window.removeEventListener("careflow:quick-add", handler as EventListener);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        ref={drag.ref}
        {...drag.handlers}
        onClick={(e) => {
          if (drag.dragging) { e.preventDefault(); return; }
          haptics.tap();
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
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="font-display text-2xl">Quick add</DialogTitle>
          <p className="text-sm text-muted-foreground">A small thing, captured.</p>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="px-6 pb-6">
          <TabsList className="mt-3 flex w-full flex-wrap justify-start gap-1 bg-muted/60 p-1 h-auto">
            {["task","appointment","journal","meal","habit","idea","birthday","holiday","cleaning","care"].map(k => (
              <TabsTrigger key={k} value={k} className="capitalize text-xs data-[state=active]:bg-card data-[state=active]:shadow-soft">{k}</TabsTrigger>
            ))}
          </TabsList>
          <TaskForm onClose={() => setOpen(false)} />
          <ApptForm onClose={() => setOpen(false)} />
          <JournalForm onClose={() => setOpen(false)} />
          <MealForm onClose={() => setOpen(false)} />
          <HabitForm onClose={() => setOpen(false)} />
          <IdeaForm onClose={() => setOpen(false)} />
          <BdayForm onClose={() => setOpen(false)} />
          <HolidayForm onClose={() => setOpen(false)} />
          <CleaningForm onClose={() => setOpen(false)} />
          <CareForm onClose={() => setOpen(false)} />
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({ onClose }: { onClose: () => void }) {
  const { addTask } = useStore();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("Personal");
  const [date, setDate] = useState(todayISO());
  return (
    <TabsContent value="task" className="mt-4 space-y-3">
      <Input placeholder="What needs doing?" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <Button className="w-full" onClick={() => { if (!title.trim()) return; addTask({ title, area: area as any, dueDate: date }); toast.success("Added to your list."); setTitle(""); onClose(); }}>Add task</Button>
    </TabsContent>
  );
}

function ApptForm({ onClose }: { onClose: () => void }) {
  const { addAppointment } = useStore();
  const [title, setTitle] = useState(""); const [date, setDate] = useState(todayISO()); const [time, setTime] = useState("");
  return (
    <TabsContent value="appointment" className="mt-4 space-y-3">
      <Input placeholder="Appointment title" value={title} onChange={e => setTitle(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
      </div>
      <Button className="w-full" onClick={() => { if (!title.trim()) return; addAppointment({ title, date, time }); toast.success("Appointment saved."); onClose(); }}>Add appointment</Button>
    </TabsContent>
  );
}

function JournalForm({ onClose }: { onClose: () => void }) {
  const { addJournal } = useStore();
  const [body, setBody] = useState("");
  return (
    <TabsContent value="journal" className="mt-4 space-y-3">
      <Textarea rows={5} placeholder="A few words is enough." value={body} onChange={e => setBody(e.target.value)} />
      <Button className="w-full" onClick={() => { if (!body.trim()) return; addJournal({ body }); toast.success("Captured."); onClose(); }}>Save entry</Button>
    </TabsContent>
  );
}

function MealForm({ onClose }: { onClose: () => void }) {
  const { addMeal } = useStore();
  const [name, setName] = useState(""); const [date, setDate] = useState(todayISO()); const [slot, setSlot] = useState<"Breakfast"|"Lunch"|"Dinner"|"Snack">("Dinner");
  return (
    <TabsContent value="meal" className="mt-4 space-y-3">
      <Input placeholder="Meal name" value={name} onChange={e => setName(e.target.value)} />
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

function HabitForm({ onClose }: { onClose: () => void }) {
  const { addHabit } = useStore(); const [title, setTitle] = useState("");
  return (
    <TabsContent value="habit" className="mt-4 space-y-3">
      <Input placeholder="Tiny habit (one sentence)" value={title} onChange={e => setTitle(e.target.value)} />
      <Button className="w-full" onClick={() => { if (!title.trim()) return; addHabit({ title }); toast.success("Habit added."); onClose(); }}>Add habit</Button>
    </TabsContent>
  );
}

function IdeaForm({ onClose }: { onClose: () => void }) {
  const { addIdea } = useStore(); const [title, setTitle] = useState("");
  return (
    <TabsContent value="idea" className="mt-4 space-y-3">
      <Input placeholder="Capture the spark" value={title} onChange={e => setTitle(e.target.value)} />
      <Button className="w-full" onClick={() => { if (!title.trim()) return; addIdea({ title }); toast.success("Saved to inbox."); onClose(); }}>Save idea</Button>
    </TabsContent>
  );
}

function BdayForm({ onClose }: { onClose: () => void }) {
  const { addBirthday } = useStore(); const [name, setName] = useState(""); const [date, setDate] = useState(todayISO());
  return (
    <TabsContent value="birthday" className="mt-4 space-y-3">
      <Input placeholder="Whose birthday?" value={name} onChange={e => setName(e.target.value)} />
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      <Button className="w-full" onClick={() => { if (!name.trim()) return; addBirthday({ name, date }); toast.success("Birthday added."); onClose(); }}>Add birthday</Button>
    </TabsContent>
  );
}

function HolidayForm({ onClose }: { onClose: () => void }) {
  const { addHoliday } = useStore(); const [name, setName] = useState(""); const [date, setDate] = useState(todayISO());
  return (
    <TabsContent value="holiday" className="mt-4 space-y-3">
      <Input placeholder="Holiday name" value={name} onChange={e => setName(e.target.value)} />
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      <Button className="w-full" onClick={() => { if (!name.trim()) return; addHoliday({ name, date }); toast.success("Holiday added."); onClose(); }}>Add holiday</Button>
    </TabsContent>
  );
}

function CleaningForm({ onClose }: { onClose: () => void }) {
  const { addCleaning } = useStore(); const [title, setTitle] = useState(""); const [zone, setZone] = useState<any>("Kitchen");
  return (
    <TabsContent value="cleaning" className="mt-4 space-y-3">
      <Input placeholder="What to clean?" value={title} onChange={e => setTitle(e.target.value)} />
      <Select value={zone} onValueChange={setZone}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{["Kitchen","Bathroom","Bedrooms","Living","Laundry","Entryway","Outdoor","Whole home"].map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
      </Select>
      <Button className="w-full" onClick={() => { if (!title.trim()) return; addCleaning({ title, zone }); toast.success("Added to home reset."); onClose(); }}>Add cleaning task</Button>
    </TabsContent>
  );
}

function CareForm({ onClose }: { onClose: () => void }) {
  const { state, addCareNote } = useStore();
  const [recipientId, setRecipientId] = useState(state.recipients[0]?.id ?? "");
  const [body, setBody] = useState("");
  return (
    <TabsContent value="care" className="mt-4 space-y-3">
      <Select value={recipientId} onValueChange={setRecipientId}>
        <SelectTrigger><SelectValue placeholder="Who is this about?" /></SelectTrigger>
        <SelectContent>{state.recipients.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
      </Select>
      <Textarea rows={4} placeholder="Note for the care log..." value={body} onChange={e => setBody(e.target.value)} />
      <Button className="w-full" onClick={() => { if (!body.trim() || !recipientId) return; addCareNote({ recipientId, body }); toast.success("Care note saved."); onClose(); }}>Add care note</Button>
    </TabsContent>
  );
}
