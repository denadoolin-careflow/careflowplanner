import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarHeart, CheckSquare, HeartHandshake, Home, Sparkles, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import type { Area, Meal, Priority } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AddKind = "task" | "appointment" | "home" | "cleaning" | "caregiving" | "meal";
const KINDS: { value: AddKind; label: string; icon: typeof CheckSquare }[] = [
  { value: "task", label: "Task", icon: CheckSquare },
  { value: "appointment", label: "Appointment", icon: CalendarHeart },
  { value: "home", label: "Home", icon: Home },
  { value: "cleaning", label: "Cleaning", icon: Sparkles },
  { value: "caregiving", label: "Caregiving", icon: HeartHandshake },
  { value: "meal", label: "Meal", icon: UtensilsCrossed },
];

export function MonthQuickAddSheet({ open, onOpenChange, date }: { open: boolean; onOpenChange: (open: boolean) => void; date: Date }) {
  const { addTask, addAppointment, addMeal } = useStore();
  const [kind, setKind] = useState<AddKind>("task");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [slot, setSlot] = useState<Meal["slot"]>("Dinner");
  const [saving, setSaving] = useState(false);
  const dateISO = format(date, "yyyy-MM-dd");

  useEffect(() => { if (open) { setTitle(""); setTime(""); } }, [open, dateISO]);

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      if (kind === "appointment") {
        await addAppointment({ title: title.trim(), date: dateISO, time: time || undefined });
      } else if (kind === "meal") {
        await addMeal({ name: title.trim(), date: dateISO, slot });
      } else {
        const area: Area = kind === "caregiving" ? "Caregiving" : kind === "home" || kind === "cleaning" ? "Home" : "Personal";
        await addTask({
          title: title.trim(), area, priority, dueDate: dateISO,
          startTime: time || undefined, tags: kind === "cleaning" ? ["cleaning"] : [], done: false, inbox: false,
        });
      }
      toast.success(`${KINDS.find(item => item.value === kind)?.label ?? "Item"} added to ${format(date, "MMM d")}`);
      onOpenChange(false);
    } catch {
      toast.error("Couldn't add that. Try again?");
    } finally { setSaving(false); }
  };

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <SheetHeader className="text-left">
        <SheetTitle>Add to {format(date, "EEEE, MMMM d")}</SheetTitle>
        <SheetDescription>Choose what belongs on this day.</SheetDescription>
      </SheetHeader>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {KINDS.map(item => <Button key={item.value} type="button" variant={kind === item.value ? "secondary" : "outline"} onClick={() => setKind(item.value)} className={cn("h-16 min-w-0 flex-col gap-1 px-1 text-[11px]", kind === item.value && "border-primary/40 bg-primary-soft/70")}>
          <item.icon className="h-4 w-4" />{item.label}
        </Button>)}
      </div>
      <div className="mt-4 space-y-3">
        <Input autoFocus value={title} onChange={event => setTitle(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void save(); }} placeholder={kind === "meal" ? "What are you eating?" : kind === "appointment" ? "Appointment title" : "What needs doing?"} className="h-12 text-base" />
        <div className="grid grid-cols-2 gap-2">
          {kind === "meal" ? <select value={slot} onChange={event => setSlot(event.target.value as Meal["slot"])} className="h-11 rounded-md border border-input bg-background px-3 text-sm" aria-label="Meal slot">
            {(["Breakfast", "Lunch", "Dinner", "Snack", "Drink"] as Meal["slot"][]).map(value => <option key={value}>{value}</option>)}
          </select> : <Input type="time" value={time} onChange={event => setTime(event.target.value)} className="h-11" aria-label="Time" />}
          {kind !== "appointment" && kind !== "meal" ? <select value={priority} onChange={event => setPriority(event.target.value as Priority)} className="h-11 rounded-md border border-input bg-background px-3 text-sm" aria-label="Priority">
            <option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option>
          </select> : <div />}
        </div>
        <Button className="h-12 w-full" disabled={!title.trim() || saving} onClick={() => void save()}>{saving ? "Adding…" : `Add ${KINDS.find(item => item.value === kind)?.label ?? "item"}`}</Button>
      </div>
    </SheetContent>
  </Sheet>;
}