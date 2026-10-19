import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHART_COLOR_MODES, useChartColorMode, type ChartColorMode } from "@/lib/cosmic/chart-colors";
import { CHART_BACKGROUNDS, useChartBackground, type ChartBackground } from "@/lib/cosmic/chart-backgrounds";

export function ChartAppearanceSettings() {
  const [mode, setMode] = useChartColorMode();
  const { background, setBackground } = useChartBackground();
  return <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="chart-color-choice">Color by</Label>
      <Select value={mode} onValueChange={value => setMode(value as ChartColorMode)}>
        <SelectTrigger id="chart-color-choice" aria-label="Chart coloring"><SelectValue /></SelectTrigger>
        <SelectContent>{CHART_COLOR_MODES.map(value => <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label htmlFor="chart-background-choice">Seasonal background</Label>
      <Select value={background} onValueChange={value => setBackground(value as ChartBackground)}>
        <SelectTrigger id="chart-background-choice" aria-label="Chart background"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Match my atmosphere · recommended</SelectItem>
          <SelectItem value="atmosphere">Use current atmosphere colors</SelectItem>
          {CHART_BACKGROUNDS.map(value => <SelectItem key={value.id} value={value.id} icon={<span className="flex gap-1" aria-hidden="true"><span className={`chart-swatch chart-swatch-${value.id}-light`} /><span className={`chart-swatch chart-swatch-${value.id}-dark`} /></span>}>{value.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  </div>;
}