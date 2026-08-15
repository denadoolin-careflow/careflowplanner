import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PenLine, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CosmicEventInfo {
  /** Stable id used to deep-link into Cosmic Flow. */
  id: string;
  glyph: string;
  title: string;
  /** When it happens / how long it lasts. */
  when?: string;
  /** One or two lines of meaning. */
  detail: string;
  /** How it may land today. */
  landing?: string;
  actions?: string[];
  accent?: string;
}

/**
 * Quick-info popover for a cosmic event (moon phase, transit, ingress).
 * Wraps any trigger; offers a journal check-in and a deep link to Cosmic Flow.
 */
export function CosmicEventPopover({
  event, children, onJournal, className,
}: {
  event: CosmicEventInfo;
  children: ReactNode;
  onJournal?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-[19rem] rounded-2xl p-3", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base"
            style={{ background: `${event.accent ?? "hsl(var(--primary))"}22` }}
          >
            {event.glyph}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold [overflow-wrap:anywhere]">{event.title}</p>
            {event.when && <p className="text-[11px] text-muted-foreground">{event.when}</p>}
          </div>
        </div>

        <p className="mt-2 text-[12px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">{event.detail}</p>

        {event.landing && (
          <p className="mt-2 rounded-xl bg-muted/60 px-2.5 py-1.5 text-[11.5px] leading-snug [overflow-wrap:anywhere]">
            <span className="font-medium">How it may land: </span>{event.landing}
          </p>
        )}

        {!!event.actions?.length && (
          <ul className="mt-2 space-y-1">
            {event.actions.slice(0, 3).map(a => (
              <li key={a} className="flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                <span className="[overflow-wrap:anywhere]">{a}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center gap-1.5">
          {onJournal && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 flex-1 rounded-full text-[11px]"
              onClick={() => { setOpen(false); onJournal(); }}
            >
              <PenLine className="mr-1 h-3 w-3" />Check in
            </Button>
          )}
          <Button asChild size="sm" className="h-7 flex-1 rounded-full text-[11px]">
            <Link to={`/cosmic-flow/event/${encodeURIComponent(event.id)}`} onClick={() => setOpen(false)}>
              Open event <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
