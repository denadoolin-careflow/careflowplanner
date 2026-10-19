import { useChartColorMode, CHART_COLOR_MODES } from "@/lib/cosmic/chart-colors";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ChartAppearanceSettings } from "./ChartAppearanceSettings";

export function ChartColorToggle() {
  const [mode, setMode] = useChartColorMode();
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 text-[12px]">
      <span className="text-muted-foreground">Color by</span>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Color chart by">
      {CHART_COLOR_MODES.map(m => (
        <Button key={m} variant={mode === m ? "default" : "outline"} size="sm" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className="min-h-11 rounded-lg px-3 capitalize">
          {m}
        </Button>
      ))}
      </div>
      <Dialog><DialogTrigger asChild><Button variant="outline" size="icon" aria-label="Chart appearance settings" title="Chart appearance settings" className="h-11 w-11"><Settings2 /></Button></DialogTrigger>
        <DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Chart appearance</DialogTitle><DialogDescription>Natal chart &amp; 12 Houses</DialogDescription></DialogHeader><ChartAppearanceSettings /></DialogContent>
      </Dialog>
    </div>
  );
}
