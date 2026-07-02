import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckSquare, CalendarHeart, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { format } from "date-fns";
import { toast } from "sonner";
import { parseTaskInput } from "@/lib/nlp-task";
import { cn } from "@/lib/utils";

interface Props {
  /** Single day = locked date. Multiple = user picks. */
  days: Date[];
  label?: string;
}

export function QuickAddCalendarPopover({ days, label = "Quick add" }: Props) {
  const { addTask, addAppointment } = useStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"task" | "appointment">("task");
  const [title, setTitle] = useState("");
  const defaultDate = days[0].toISOString().slice(0, 10);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [dayPart, setDayPart] = useState<"" | "Morning" | "Afternoon" | "Evening" | "Late Night">("");

  useEffect(() => { if (open) { setDate(defaultDate); setTitle(""); setTime(""); setDayPart(""); } }, [open, defaultDate]);

  // Listen to global ⌘K to auto-open.
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("careflow:quick-add", h as EventListener);
    return () => window.removeEventListener("careflow:quick-add", h as EventListener);
  }, []);

  // NLP live parse of the title — surfaces chips + auto-fills date/time.
  const parsed = useMemo(() => title.trim() ? parseTaskInput(title) : null, [title]);
  useEffect(() => {
    if (!parsed) return;
    if (parsed.dueDate) setDate(parsed.dueDate);
    if (parsed.time) setTime(parsed.time);
  }, [parsed?.dueDate, parsed?.time]);

  const submit = async () => {
    const raw = title.trim();
    const t = parsed?.title?.trim() || raw;
    if (!t) return;
    if (tab === "task") {
      await addTask({
        title: t,
        dueDate: date,
        area: parsed?.area ?? "Personal",
        priority: parsed?.priority ?? "medium",
        inbox: false,
        ...(dayPart ? { dayPart } : {}),
        ...(parsed?.time ? { time: parsed.time } : {}),
        ...(parsed?.estMinutes ? { estMinutes: parsed.estMinutes } : {}),
        ...(parsed?.tags?.length ? { tags: parsed.tags } : {}),
      } as any);
      toast(`Task added for ${format(new Date(date), "MMM d")}${dayPart ? ` · ${dayPart}` : ""}`);
    } else {
      await addAppointment({ title: t, date, time: time || undefined });
      toast(`Appointment added for ${format(new Date(date), "MMM d")}${time ? ` at ${time}` : ""}`);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full">
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="task" className="gap-1.5"><CheckSquare className="h-3.5 w-3.5" /> Task</TabsTrigger>
            <TabsTrigger value="appointment" className="gap-1.5"><CalendarHeart className="h-3.5 w-3.5" /> Appointment</TabsTrigger>
          </TabsList>
          <TabsContent value="task" className="mt-3 space-y-3">
            <div>
              <Label className="flex items-center gap-1 text-xs">
                Title
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> try "gym tomorrow at 7am 45m p1 #health"
                </span>
              </Label>
              <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="What needs doing?" />
              {parsed && parsed.chips.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {parsed.chips.map((c, i) => (
                    <span key={i} className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      c.kind === "priority" ? "border-rose-300/40 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                      : c.kind === "date" || c.kind === "time" ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-muted/40 text-muted-foreground"
                    )}>{c.label}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <Label className="text-xs">Due date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="min-w-0">
                <Label className="text-xs">Time of day</Label>
                <Select value={dayPart || "any"} onValueChange={(v) => setDayPart(v === "any" ? "" : v as any)}>
                  <SelectTrigger><SelectValue placeholder="Any time" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any time</SelectItem>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Afternoon">Afternoon</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Late Night">Late Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="appointment" className="mt-3 space-y-3">
            <div>
              <Label className="flex items-center gap-1 text-xs">
                Title
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> "dentist friday 2pm"
                </span>
              </Label>
              <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Doctor, meeting…" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="min-w-0">
                <Label className="text-xs">Time</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!title.trim()}>Add</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}