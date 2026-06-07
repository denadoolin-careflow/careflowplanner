import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Loader2, Compass, Wind, Moon, Utensils } from "lucide-react";
import { useCareGuide } from "@/lib/care-guide";
import { useDraggableFab } from "@/hooks/use-draggable-fab";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function CareGuideFab({ hideButton = false }: { hideButton?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const drag = useDraggableFab("careflow:fab:care-guide", { right: 16, bottom: 160 });
  const { brief, loading, refresh } = useCareGuide();

  useEffect(() => {
    const handler = () => { setOpen(true); haptics.pickup(); };
    window.addEventListener("careflow:open-care-guide", handler);
    window.addEventListener("careflow:open-ai-assistant", handler); // back-compat
    return () => {
      window.removeEventListener("careflow:open-care-guide", handler);
      window.removeEventListener("careflow:open-ai-assistant", handler);
    };
  }, []);

  return (
    <>
      {!hideButton && (
        <button
          ref={drag.ref}
          {...drag.handlers}
          type="button"
          aria-label="Care Guide"
          onClick={(e) => {
            if (drag.dragging) { e.preventDefault(); return; }
            setOpen(true); haptics.pickup();
          }}
          style={drag.style}
          className={cn(
            "fixed z-40 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-105 active:scale-95",
            "bg-gradient-to-br from-primary to-accent",
            drag.dragging && "scale-110 ring-2 ring-accent/50",
          )}
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border/60 bg-card/60 px-5 py-4 backdrop-blur">
            <SheetTitle className="flex items-center gap-2 font-display">
              <Sparkles className="h-4 w-4 text-primary" />
              Care Guide
            </SheetTitle>
            <p className="text-xs text-muted-foreground">A gentle daily companion, tuned to your CARE loop.</p>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tuning in…
              </div>
            )}

            <section className="rounded-2xl border border-border/50 bg-card/60 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <Compass className="h-3.5 w-3.5" /> Today's focus
              </h3>
              <ul className="space-y-2">
                {brief.focus.map((f, i) => (
                  <li key={i} className="rounded-lg bg-primary-soft/30 p-2.5">
                    <p className="text-sm font-medium">{f.title}</p>
                    {f.why && <p className="text-[11px] text-muted-foreground">{f.why}</p>}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-border/50 bg-card/60 p-4">
              <h3 className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Anchor reminder
              </h3>
              <p className="text-sm text-foreground/90">{brief.anchor_reminder}</p>
            </section>

            <section className="rounded-2xl border border-border/50 bg-card/60 p-4">
              <h3 className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <Moon className="h-3.5 w-3.5" /> Rhythm insight
              </h3>
              <p className="text-sm italic text-foreground/85">{brief.rhythm_insight}</p>
            </section>

            <section className="rounded-2xl border border-border/50 bg-card/60 p-4">
              <h3 className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <Utensils className="h-3.5 w-3.5" /> Dinner whisper
              </h3>
              <p className="text-sm">{brief.dinner_suggestion}</p>
            </section>

            <section className="rounded-2xl border border-border/50 bg-card/60 p-4">
              <h3 className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <Wind className="h-3.5 w-3.5" /> Exhale prompt
              </h3>
              <p className="text-sm text-foreground/90">{brief.exhale_prompt}</p>
            </section>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-background/70 px-3 py-3 backdrop-blur">
            <Button asChild size="sm" variant="ghost" onClick={() => setOpen(false)}>
              <Link to="/care">Open CARE Hub</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => refresh()} disabled={loading}>
              <RefreshCw className={cn("mr-1 h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}