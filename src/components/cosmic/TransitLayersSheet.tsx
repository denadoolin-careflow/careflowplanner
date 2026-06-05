import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { fetchTransitInterpretation } from "@/lib/cosmic/v2-hooks";

interface Layers {
  technical: string; meaning: string; emotional: string; practical: string; growth: string;
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {event?.label ?? "Transit"}
          </SheetTitle>
        </SheetHeader>
        {loading || !layers ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Reading the layers…
          </div>
        ) : (
          <div className="mt-4 space-y-4 pb-12">
            <Layer title="Technical" body={layers.technical} />
            <Layer title="Meaning" body={layers.meaning} />
            <Layer title="Emotional" body={layers.emotional} />
            <Layer title="Practical" body={layers.practical} />
            <Layer title="Growth" body={layers.growth} />

            <section className="rounded-lg border border-border/60 bg-card/60 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CareFlow suggestions</h4>
              <Group label="Tasks" items={layers.careflow?.tasks ?? []} onAdd={addOne} />
              <Group label="Habits" items={layers.careflow?.habits ?? []} onAdd={addOne} />
              <Group label="Routines" items={layers.careflow?.routines ?? []} onAdd={addOne} />
              <Group label="Journaling" items={layers.careflow?.journaling ?? []} />
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Layer({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-foreground/90">{body}</p>
    </div>
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