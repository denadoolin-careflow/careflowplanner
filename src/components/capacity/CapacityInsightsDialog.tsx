import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { useAllEnergy } from "@/lib/energy-store";
import { EnergyTimeline } from "./EnergyTimeline";
import { CapacityInsights } from "./CapacityInsights";
import { LowEnergyTemplate } from "./LowEnergyTemplate";
import { type ReactNode } from "react";

export function CapacityInsightsDialog({
  trigger,
  defaultTab = "timeline",
}: {
  trigger: ReactNode;
  defaultTab?: "timeline" | "insights" | "low";
}) {
  const { state } = useStore();
  const energyMap = useAllEnergy();

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Capacity insights</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="insights">Patterns</TabsTrigger>
            <TabsTrigger value="low">Low-energy</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-4 space-y-4">
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Last 30 days
              </div>
              <EnergyTimeline map={energyMap} days={30} />
            </div>
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Last 90 days
              </div>
              <EnergyTimeline map={energyMap} days={90} compact />
            </div>
          </TabsContent>
          <TabsContent value="insights" className="mt-4">
            <CapacityInsights
              energyMap={energyMap}
              tasks={state.tasks}
              habits={state.habits}
              days={30}
            />
          </TabsContent>
          <TabsContent value="low" className="mt-4">
            <LowEnergyTemplate />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}