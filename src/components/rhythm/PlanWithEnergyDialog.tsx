import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { format } from "date-fns";
import { Leaf, Home, Heart } from "lucide-react";
import { getSuggestedTasks, type RhythmForecast } from "@/lib/rhythm-forecast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: Date;
  forecast: RhythmForecast;
}

const KIND_ICON = {
  "low-energy": Leaf,
  "home-reset": Home,
  "personal-care": Heart,
} as const;

const KIND_LABEL = {
  "low-energy": "Low-energy",
  "home-reset": "Home reset",
  "personal-care": "Personal / care",
} as const;

export function PlanWithEnergyDialog({ open, onOpenChange, date, forecast }: Props) {
  const { addTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const suggestions = getSuggestedTasks(forecast);

  const add = async (title: string, area: any, energy: any) => {
    await addTask({ title, area, energy, dueDate: iso, priority: "low" });
    toast.success(`Added “${title}” to today`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            Plan with this energy
          </DialogTitle>
          <DialogDescription>
            {forecast.phaseLabel} in {forecast.sign.sign}. Pick one — small counts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {suggestions.map((s, i) => {
            const Icon = KIND_ICON[s.kind];
            return (
              <button
                key={i}
                onClick={() => add(s.title, s.area, s.energy)}
                className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition-colors hover:bg-primary-soft/40"
              >
                <span className="mt-0.5 rounded-full bg-primary-soft p-2">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {KIND_LABEL[s.kind]}
                  </span>
                  <span className="block text-sm">{s.title}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Choose what matters most. You don't have to do them all.
        </p>
      </DialogContent>
    </Dialog>
  );
}
