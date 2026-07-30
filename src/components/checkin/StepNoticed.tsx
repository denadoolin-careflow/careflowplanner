import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { CheckInAiPayload } from "@/lib/daily-checkin-store";

interface Props {
  payload: CheckInAiPayload;
  onBack: () => void;
  onContinue: () => void;
  onRegenerate: () => void;
  generating: boolean;
}

export function StepNoticed({ payload, onBack, onContinue, onRegenerate, generating }: Props) {
  const { energy, moonGuidance, insight, reflection } = payload;
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-semibold sm:text-xl">Here's what I noticed</h2>
        <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={generating}>
          <RefreshCw className={cn("mr-1 h-4 w-4", generating && "animate-spin")} />
          Regenerate
        </Button>
      </div>

      {reflection && (
        <p className="font-display text-lg italic leading-relaxed text-foreground/90 sm:text-xl">
          {reflection}
        </p>
      )}

      <div className="space-y-4 border-t border-border/40 pt-5 text-[15px] leading-relaxed text-foreground/85">
        <p>{energy.overall}</p>
        <p>
          {energy.moodTheme} {energy.focusTheme}
        </p>
        <p>
          {energy.challenge} {energy.opportunity}
        </p>
      </div>

      <div className="space-y-3 border-t border-border/40 pt-5 text-[15px] leading-relaxed text-foreground/85">
        <p>{moonGuidance.summary}</p>
        <p className="italic text-muted-foreground">{moonGuidance.houseMeaning}</p>
      </div>

      <p className="border-t border-border/40 pt-5 text-[15px] leading-relaxed text-foreground/85">
        {insight}
      </p>

      <Collapsible>
        <CollapsibleTrigger className="text-[15px] font-medium text-primary hover:underline">
          Learn more →
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 divide-y divide-border/40">
          {Object.entries(moonGuidance.lifeAreas).map(([k, v]) => (
            <div key={k} className="py-2.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{k}</p>
              <p className="mt-0.5 text-[15px]">{v}</p>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-between gap-3 pt-2">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button size="lg" className="rounded-full" onClick={onContinue}>Continue</Button>
      </div>
    </div>
  );
}