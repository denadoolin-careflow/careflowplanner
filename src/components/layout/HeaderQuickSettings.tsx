import { Settings2, BatteryLow, BatteryMedium } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "./ThemeToggle";
import { AtmospherePicker } from "@/components/atmospheres/AtmospherePicker";
import { PanelPicker } from "@/components/workspace/PanelPicker";
import { useStore } from "@/lib/store";

export function HeaderQuickSettings() {
  const { state, setLowEnergyMode } = useStore();
  const lowEnergy = state.settings.lowEnergyMode;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Quick settings"
              className="h-9 w-9 rounded-full"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Quick settings</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={8} className="w-64 p-2">
        <div className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick settings
        </div>

        <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/50">
          <span className="text-sm">Theme</span>
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/50">
          <div className="flex items-center gap-2">
            {lowEnergy ? (
              <BatteryLow className="h-4 w-4 text-primary" />
            ) : (
              <BatteryMedium className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm">Low-energy mode</span>
          </div>
          <Switch
            checked={lowEnergy}
            onCheckedChange={(v) => setLowEnergyMode(!!v)}
            aria-label="Toggle low-energy mode"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/50">
          <span className="text-sm">Atmosphere</span>
          <AtmospherePicker />
        </div>

        <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/50">
          <span className="text-sm">Workspace panels</span>
          <PanelPicker />
        </div>
      </PopoverContent>
    </Popover>
  );
}