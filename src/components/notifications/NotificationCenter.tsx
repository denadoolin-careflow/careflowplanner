import { useMemo, useState } from "react";
import { Bell, AlertCircle, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { format, isBefore, isAfter, addDays, parseISO, startOfDay } from "date-fns";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";

export function NotificationCenter() {
  const { state } = useStore();
  const [open, setOpen] = useState(false);

  const today = startOfDay(new Date());
  const todayISO = format(today, "yyyy-MM-dd");
  const tomorrowISO = format(addDays(today, 1), "yyyy-MM-dd");
  const weekEnd = addDays(today, 7);

  const buckets = useMemo(() => {
    const overdue: typeof state.tasks = [];
    const dueToday: typeof state.tasks = [];
    const dueTomorrow: typeof state.tasks = [];
    const upcoming: typeof state.tasks = [];
    for (const t of state.tasks) {
      if (t.done || t.parentTaskId || t.status === "parked") continue;
      if (!t.dueDate) continue;
      const d = parseISO(t.dueDate);
      if (t.dueDate === todayISO) dueToday.push(t);
      else if (t.dueDate === tomorrowISO) dueTomorrow.push(t);
      else if (isBefore(d, today)) overdue.push(t);
      else if (isAfter(d, today) && isBefore(d, weekEnd)) upcoming.push(t);
    }
    const todayAppts = state.appointments.filter(a => a.date === todayISO);
    return { overdue, dueToday, dueTomorrow, upcoming, todayAppts };
  }, [state.tasks, state.appointments, todayISO, tomorrowISO, today, weekEnd]);

  const count = buckets.overdue.length + buckets.dueToday.length + buckets.todayAppts.length;

  const Row = ({ icon, title, subtitle, to }: { icon: React.ReactNode; title: string; subtitle?: string; to?: string }) => {
    const content = (
      <div className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">{title}</div>
          {subtitle && <div className="truncate text-[10px] text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
    );
    return to ? <Link to={to} onClick={() => setOpen(false)}>{content}</Link> : content;
  };

  const Section = ({ label, items, icon, color }: { label: string; items: any[]; icon: React.ReactNode; color: string }) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className={`flex items-center gap-1.5 px-2 pb-1 pt-2 text-[10px] uppercase tracking-[0.15em] ${color}`}>
          {icon} {label} <span className="ml-auto opacity-60">{items.length}</span>
        </div>
        <div className="space-y-0.5">
          {items.slice(0, 8).map((t: any) => (
            <Row
              key={t.id}
              icon={<span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-50" />}
              title={t.title}
              subtitle={t.dueDate ? format(parseISO(t.dueDate), "EEE MMM d") : t.time}
              to={t.date ? `/today?date=${t.date}` : t.dueDate ? `/today?date=${t.dueDate}` : "/today"}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-[16px] rounded-full px-1 text-[9px]" variant="destructive">
              {count > 9 ? "9+" : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <div className="mb-1 flex items-center justify-between px-1">
          <div className="font-display text-sm font-semibold">Notifications</div>
          <span className="text-[10px] text-muted-foreground">{format(today, "EEE MMM d")}</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <Section label="Overdue" items={buckets.overdue} icon={<AlertCircle className="h-3 w-3" />} color="text-destructive" />
          <Section label="Today" items={buckets.dueToday} icon={<Clock className="h-3 w-3" />} color="text-foreground" />
          <Section label="Appointments today" items={buckets.todayAppts} icon={<Calendar className="h-3 w-3" />} color="text-primary" />
          <Section label="Tomorrow" items={buckets.dueTomorrow} icon={<Clock className="h-3 w-3" />} color="text-muted-foreground" />
          <Section label="Upcoming this week" items={buckets.upcoming} icon={<Calendar className="h-3 w-3" />} color="text-muted-foreground" />
          {count === 0 && buckets.dueTomorrow.length === 0 && buckets.upcoming.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <p className="text-xs text-muted-foreground">You're all caught up.</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}