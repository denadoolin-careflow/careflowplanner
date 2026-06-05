import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Sparkles, Heart, TrendingUp, AlertTriangle, Zap, Quote, BookHeart, ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { fetchTransitInterpretation } from "@/lib/cosmic/v2-hooks";

interface Layers {
  why_matters?: string;
  growth?: string;
  challenges?: string;
  action?: string;
  affirmation?: string;
  reflection?: string;
  technical?: string; meaning?: string; emotional?: string; practical?: string;
  careflow: { tasks: string[]; habits: string[]; routines: string[]; journaling: string[] };
}

export function TransitLayersSheet({
  open, onOpenChange, event, natal,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: { id: string; kind: string; planet?: string; sign?: string; aspect?: string; detail?: string; date?: string; label: string } | null;
  natal?: any;
}) {
  const [layers, setLayers] = useState<Layers | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { addTask } = useStore() as any;
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !event) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const row = await fetchTransitInterpretation(event.id, { event, natal });
      if (!cancelled) { setLayers(row as Layers); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open, event, natal]);

  function addOne(text: string) {
    addTask?.({ title: text, cosmic_tag: event?.id ?? "transit" });
    toast({ title: "Added to CareFlow", description: text });
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast({ title: "Copied", description: text }),
      () => {}
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {event?.label ?? "Transit"}
          </SheetTitle>
          {event?.detail && (
            <p className="text-xs text-muted-foreground">{event.detail}</p>
          )}
        </SheetHeader>
        {loading || !layers ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Reading the layers…
          </div>
        ) : (
          <div className="mt-4 space-y-3 pb-12">
            <Block
              icon={<Heart className="h-4 w-4" />}
              tone="primary"
              title="Why this matters"
              body={layers.why_matters || layers.meaning}
            />
            <Block
              icon={<TrendingUp className="h-4 w-4" />}
              tone="moon"
              title="Growth opportunity"
              body={layers.growth}
            />
            <Block
              icon={<AlertTriangle className="h-4 w-4" />}
              tone="accent"
              title="Potential challenges"
              body={layers.challenges || layers.emotional}
            />
            <Block
              icon={<Zap className="h-4 w-4" />}
              tone="primary"
              title="Actionable guidance"
              body={layers.action || layers.practical}
              action={
                (layers.action || layers.practical) && (
                  <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs"
                    onClick={() => addOne((layers.action || layers.practical)!)}>
                    <Plus className="h-3 w-3" />Add to Today
                  </Button>
                )
              }
            />

            {layers.affirmation && (
              <section className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-moon/10 p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                  <Quote className="h-3 w-3" />Affirmation
                </p>
                <p className="mt-1.5 font-display text-[15px] italic leading-snug text-foreground">
                  "{layers.affirmation}"
                </p>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                    onClick={() => copy(layers.affirmation!)}>Copy</Button>
                </div>
              </section>
            )}

            {layers.reflection && (
              <section className="rounded-xl border border-border/60 bg-muted/40 p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <BookHeart className="h-3 w-3" />Reflection prompt
                </p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/90">{layers.reflection}</p>
              </section>
            )}

            <section className="rounded-xl border border-border/60 bg-card/60 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CareFlow suggestions</h4>
              <Group label="Tasks" items={layers.careflow?.tasks ?? []} onAdd={addOne} />
              <Group label="Habits" items={layers.careflow?.habits ?? []} onAdd={addOne} />
              <Group label="Routines" items={layers.careflow?.routines ?? []} onAdd={addOne} />
              <Group label="Journaling" items={layers.careflow?.journaling ?? []} />
            </section>

            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              {showAdvanced ? "Hide" : "Show"} astrological detail
            </button>
            {showAdvanced && (
              <div className="space-y-3 rounded-lg border border-border/40 bg-muted/30 p-3">
                <Layer title="Technical" body={layers.technical} />
                <Layer title="Meaning" body={layers.meaning} />
                <Layer title="Emotional layer" body={layers.emotional} />
                <Layer title="Practical layer" body={layers.practical} />
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Layer({ title, body }: { title: string; body?: string }) {
  if (!body) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-foreground/90">{body}</p>
    </div>
  );
}

const TONE_CLASS: Record<string, string> = {
  primary: "border-primary/25 bg-primary/5 text-primary",
  moon:    "border-moon/40 bg-moon/10 text-moon-foreground",
  accent:  "border-accent/40 bg-accent/15 text-accent-foreground",
};

function Block({
  icon, title, body, tone = "primary", action,
}: {
  icon: React.ReactNode; title: string; body?: string; tone?: "primary" | "moon" | "accent"; action?: React.ReactNode;
}) {
  if (!body) return null;
  return (
    <section className={`rounded-xl border bg-card/60 p-3.5 ${TONE_CLASS[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/60">{icon}</span>
          {title}
        </p>
        {action}
      </div>
      <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/90">{body}</p>
    </section>
  );
}

function Group({ label, items, onAdd }: { label: string; items: string[]; onAdd?: (text: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="mt-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <ul className="mt-1 space-y-1">
        {items.map(i => (
          <li key={i} className="flex items-center justify-between gap-2 text-[13px]">
            <span>{i}</span>
            {onAdd && (
              <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => onAdd(i)}>
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}