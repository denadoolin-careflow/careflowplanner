import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, CheckSquare, CalendarHeart } from "lucide-react";
import { useStore } from "@/lib/store";
import { format } from "date-fns";
import { toast } from "sonner";

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

  useEffect(() => { if (open) { setDate(defaultDate); setTitle(""); setTime(""); } }, [open, defaultDate]);

  const submit = async () => {
    const t = title.trim();
    if (!t) return;
    if (tab === "task") {
      await addTask({ title: t, dueDate: date, area: "Personal", priority: "medium", inbox: false } as any);
      toast(`Task added for ${format(new Date(date), "MMM d")}`);
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
              <Label className="text-xs">Title</Label>
              <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="What needs doing?" />
            </div>
            <div>
              <Label className="text-xs">Due date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </TabsContent>
          <TabsContent value="appointment" className="mt-3 space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Doctor, meeting…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
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