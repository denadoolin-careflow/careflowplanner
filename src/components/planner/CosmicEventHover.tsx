import type { ReactElement } from "react";
import { Sparkles } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { copyForEvent, guidanceForEvent } from "@/lib/cosmic/transit-copy";
import type { CosmicEvent } from "@/lib/cosmic/events";

export function CosmicEventHover({ event, children }: { event: CosmicEvent; children: ReactElement }) {
  const copy = copyForEvent(event);
  const guidance = guidanceForEvent(event);
  return (
    <HoverCard openDelay={160} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent align="start" side="top" className="w-80 max-w-[calc(100vw-2rem)] space-y-2 p-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>{event.glyph}</span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold">{event.title}</p>
            <p className="text-[11px] text-muted-foreground">{event.subtitle}</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-foreground/85">{copy.insight}</p>
        <div className="grid gap-1.5 rounded-md bg-muted/45 p-2 text-[11px] leading-snug">
          <p><strong className="text-foreground">Work with it:</strong> {guidance.doMore}</p>
          <p><strong className="text-foreground">Go gently with:</strong> {guidance.doLess}</p>
          <p className="flex gap-1.5 text-muted-foreground"><Sparkles className="mt-0.5 h-3 w-3 shrink-0" />{guidance.whatToExpect}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}