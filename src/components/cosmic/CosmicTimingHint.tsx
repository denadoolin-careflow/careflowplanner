import { useMemo } from "react";
import { getMoonPhase } from "@/lib/moon";
import { getKeyPhaseInfo } from "@/lib/lunar-phases";
import { Sparkles } from "lucide-react";

export function CosmicTimingHint({ date }: { date: Date | null | undefined }) {
  const info = useMemo(() => {
    if (!date) return null;
    return getKeyPhaseInfo(getMoonPhase(date));
  }, [date]);
  if (!info) return null;
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-[12.5px]"
      style={{ borderLeft: `3px solid hsl(${info.hsl})` }}
    >
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: `hsl(${info.hsl})` }} />
      <div>
        <p className="font-medium">
          {info.glyph} {info.verb} energy
        </p>
        <p className="text-muted-foreground">{info.invitation}</p>
      </div>
    </div>
  );
}