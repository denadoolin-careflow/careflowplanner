import { useEffect, useState, useMemo } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAtmosphere } from "@/lib/atmospheres";
import { loadQuizResult } from "@/lib/archetype-quiz";
import { pickContextAffirmation } from "@/lib/affirmations";

/**
 * AffirmationHeader — a soft, header-style affirmation tuned to the user's
 * active atmosphere and caregiver archetype. Tap to cycle a fresh line.
 */
export function AffirmationHeader({ date, className }: { date: Date; className?: string }) {
  const { current: atmosphereId, atmosphere } = useAtmosphere();
  const [archetypeId, setArchetypeId] = useState<string | null>(null);
  const [variant, setVariant] = useState(0);

  useEffect(() => {
    const r = loadQuizResult();
    setArchetypeId(r?.archetype ?? null);
  }, []);

  const daySeed = useMemo(() => format(date, "yyyy-MM-dd"), [date]);
  const line = useMemo(
    () => pickContextAffirmation({
      atmosphereId: atmosphereId as any,
      archetypeId: archetypeId as any,
      daySeed,
      variant,
    }),
    [atmosphereId, archetypeId, daySeed, variant],
  );

  return (
    <button
      type="button"
      onClick={() => setVariant(v => v + 1)}
      title="Tap for another affirmation"
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border border-border/40",
        "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent",
        "px-4 py-3 text-left transition-all hover:border-primary/40 hover:from-primary/15",
        className,
      )}
    >
      <Sparkles className="mt-1 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          A note for you · {atmosphere?.name ?? "today"}
        </p>
        <p className="font-display text-lg italic leading-snug text-foreground sm:text-xl">
          “{line}”
        </p>
      </div>
      <RefreshCw className="mt-1 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />
    </button>
  );
}