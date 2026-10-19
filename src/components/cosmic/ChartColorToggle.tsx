import { useChartColorMode, type ChartColorMode } from "@/lib/cosmic/chart-colors";

export function ChartColorToggle() {
  const [mode, setMode] = useChartColorMode();
  return (
    <div className="inline-flex items-center gap-1.5 text-[12px]" role="radiogroup" aria-label="Color chart by">
      <span className="text-muted-foreground">Color by</span>
      {(["sign", "element"] as ChartColorMode[]).map(m => (
        <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
          className={`min-h-8 rounded-full border px-3 capitalize ${mode === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
          {m}
        </button>
      ))}
    </div>
  );
}
