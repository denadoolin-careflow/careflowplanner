import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit } from "@/lib/weather-store";
import { useWeatherPrefs } from "@/lib/weather-prefs";
import { computeWarnings, type WarningSeverity } from "@/lib/weather-warnings";

const STYLES: Record<WarningSeverity, { wrap: string; icon: typeof Info }> = {
  info:    { wrap: "border-sky-300/40 bg-sky-50/60 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100", icon: Info },
  caution: { wrap: "border-amber-300/50 bg-amber-50/70 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100", icon: AlertTriangle },
  alert:   { wrap: "border-red-300/60 bg-red-50/70 text-red-900 dark:bg-red-950/40 dark:text-red-100", icon: ShieldAlert },
};

export function WeatherWarningsCard({ className }: { className?: string }) {
  const snap = useWeatherSnapshot();
  const [prefs] = useWeatherPrefs();
  // Subscribe to unit so warning detail strings re-render when the user toggles °F/°C.
  useTempUnit();
  const warnings = computeWarnings(snap, prefs);
  if (warnings.length === 0) return null;

  return (
    <div className={cn("space-y-1.5", className)}>
      {warnings.map(w => {
        const s = STYLES[w.severity];
        const Icon = s.icon;
        return (
          <div key={w.id} className={cn("flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs", s.wrap)}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium">{w.label}</div>
              {w.detail && <div className="opacity-80">{w.detail}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}