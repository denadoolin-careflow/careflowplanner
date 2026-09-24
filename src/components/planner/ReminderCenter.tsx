/**
 * Reminder Center: one calm place for upcoming planner items, moon moments,
 * cycle milestones and saved journal prompts, with snooze and done actions.
 */
import { useState } from "react";
import { format } from "date-fns";
import { Bell, Check, Clock, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStore } from "@/lib/store";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import {
  useReminderCenter, eveningToday, tomorrowMorning,
  type ReminderGroup, type ReminderRow,
} from "@/lib/planner/reminder-center";
import { cn } from "@/lib/utils";

const GROUP_LABEL: Record<ReminderGroup, string> = {
  overdue: "Now",
  today: "Today",
  rhythm: "Rhythm",
  journal: "Journal prompts",
  later: "Later this week",
};
const GROUP_ORDER: ReminderGroup[] = ["overdue", "today", "rhythm", "journal", "later"];

export function ReminderCenter({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { grouped, actionableCount, snooze, snoozeUntil, dismiss } = useReminderCenter();
  const { toggleTask, state, updateProject } = useStore() as any;
  const { open: openItem, dialogs } = usePlannerItemOpener();

  const complete = async (row: ReminderRow) => {
    if (row.sourceKind === "task" && row.item && !row.item.done) {
      await toggleTask(row.item.sourceRef.id);
    }
    if (row.sourceKind === "milestone") {
      const [pid, mid] = row.sourceId.split(":");
      const p = (state.projects ?? []).find((x: any) => x.id === pid);
      if (p) await updateProject(pid, { milestones: (p.milestones ?? []).map((m: any) => m.id === mid ? { ...m, done: true } : m) });
    }
    await dismiss(row);
  };

  return (
    <>
      <Button
        size="icon"
        variant="outline"
        className="relative h-8 w-8 shrink-0 rounded-full"
        onClick={() => setOpen(true)}
        aria-label={`Reminder center${actionableCount ? `, ${actionableCount} needing attention` : ""}`}
        title="Reminder center"
      >
        <Bell className="h-4 w-4" />
        {actionableCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
            {actionableCount > 9 ? "9+" : actionableCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("overflow-y-auto", isMobile ? "max-h-[85dvh] rounded-t-2xl p-4" : "w-[min(26rem,100vw)] p-4")}
        >
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" aria-hidden /> Reminders
            </SheetTitle>
            <SheetDescription className="text-xs">
              Everything asking for you soon — snooze anything that can wait.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-3 space-y-4">
            {GROUP_ORDER.every(g => grouped[g].length === 0) && (
              <p className="rounded-xl border border-border/50 bg-card/50 p-4 text-center text-sm text-muted-foreground">
                Nothing waiting. Enjoy the quiet.
              </p>
            )}
            {GROUP_ORDER.map(group => grouped[group].length > 0 && (
              <section key={group}>
                <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {GROUP_LABEL[group]} · {grouped[group].length}
                </p>
                <ul className="space-y-1.5">
                  {grouped[group].map(row => (
                    <li key={row.key} className="rounded-xl border border-border/60 bg-card/60 p-2.5">
                      <div className="flex items-start gap-2">
                        {row.glyph && <span aria-hidden className="text-base leading-none">{row.glyph}</span>}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium leading-snug [overflow-wrap:anywhere]">{row.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {row.detail ?? format(row.at, "EEE h:mm a")}
                            {row.snoozedUntil && ` · snoozed to ${format(row.snoozedUntil, "h:mm a")}`}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {row.item && (
                          <Button size="sm" variant="ghost" className="h-8 rounded-full px-2.5 text-[11px]"
                            onClick={() => { setOpen(false); openItem(row.item!); }}>
                            Open
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 rounded-full px-2.5 text-[11px]"
                          onClick={() => void snooze(row, 10)}>
                          <Clock className="mr-1 h-3 w-3" /> 10m
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 rounded-full px-2.5 text-[11px]"
                          onClick={() => void snooze(row, 60)}>1h</Button>
                        <Button size="sm" variant="ghost" className="h-8 rounded-full px-2.5 text-[11px]"
                          onClick={() => void snoozeUntil(row, eveningToday())}>Evening</Button>
                        <Button size="sm" variant="ghost" className="h-8 rounded-full px-2.5 text-[11px]"
                          onClick={() => void snoozeUntil(row, tomorrowMorning())}>Tomorrow</Button>
                        <Button size="sm" variant="secondary" className="ml-auto h-8 rounded-full px-2.5 text-[11px]"
                          onClick={() => void complete(row)}>
                          <Check className="mr-1 h-3 w-3" /> {row.sourceKind === "task" ? "Done" : "Dismiss"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {onOpenSettings && (
              <Button variant="ghost" size="sm" className="h-8 w-full justify-start rounded-full text-[11px] text-muted-foreground"
                onClick={() => { setOpen(false); onOpenSettings(); }}>
                <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Reminder settings
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
      {dialogs}
    </>
  );
}
