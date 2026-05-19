import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { format } from "date-fns";
import { Leaf, Home, Heart, Hourglass } from "lucide-react";
import {
  pickEnergyTaskSuggestions,
  type RhythmForecast,
  type EnergyPick,
} from "@/lib/rhythm-forecast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: Date;
  forecast: RhythmForecast;
}

const KIND_ICON: Record<EnergyPick["kind"], typeof Leaf> = {
  "low-energy": Leaf,
  "home-care": Home,
  "personal": Heart,
  "can-wait": Hourglass,
};

export function PlanWithEnergyDialog({ open, onOpenChange, date, forecast }: Props) {
  const { state, addTask, updateTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const picks = useMemo(
    () => pickEnergyTaskSuggestions(state.tasks, forecast),
    [state.tasks, forecast],
  );

  const scheduleExisting = async (pick: EnergyPick) => {
    if (!pick.task) return;
    await updateTask(pick.task.id, { dueDate: iso, inbox: false });
    toast.success(`Scheduled “${pick.task.title}” for ${format(date, "EEE MMM d")}`);
    onOpenChange(false);
  };

  const createFromSuggestion = async (pick: EnergyPick) => {
    const title = pick.fallbackTitle ?? "One small thing";
    const area = pick.kind === "home-care" ? "Home" : "Personal";
    await addTask({ title, area, energy: "low", dueDate: iso, priority: "low" });
    toast.success(`Added “${title}” to ${format(date, "EEE MMM d")}`);
    onOpenChange(false);
  };

  const handlePick = (pick: EnergyPick) => {
    if (pick.kind === "can-wait" && pick.task) {
      // Move it to "someday" instead of scheduling — protects energy.
      void updateTask(pick.task.id, { status: "someday", dueDate: undefined }).then(() => {
        toast(`Letting “${pick.task!.title}” wait — guilt-free.`);
        onOpenChange(false);
      });
      return;
    }
    if (pick.task) void scheduleExisting(pick);
    else void createFromSuggestion(pick);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Plan with this energy</DialogTitle>
          <DialogDescription>
            {forecast.phaseLabel} in {forecast.sign.sign}. Four small choices — pick what feels true.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {picks.map((pick) => {
            const Icon = KIND_ICON[pick.kind];
            const title = pick.task?.title ?? pick.fallbackTitle ?? "—";
            const isReal = !!pick.task;
            return (
              <button
                key={pick.kind}
                onClick={() => handlePick(pick)}
                className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition-colors hover:bg-primary-soft/40"
              >
                <span className="mt-0.5 rounded-full bg-primary-soft p-2">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {pick.label}
                    </span>
                    {isReal && (
                      <span className="rounded-full bg-secondary-soft px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                        From your list
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-sm">{title}</span>
                  <span className="block text-[11px] text-muted-foreground">{pick.reason}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground">
          You don't have to do them all. Choose what matters most.
        </p>
      </DialogContent>
    </Dialog>
  );
}
