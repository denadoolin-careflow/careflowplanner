import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Loader2, Check, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import type { DailyGuidance } from "@/lib/cosmic/v2-hooks";

export function DailyGuidanceCard({ data, loading, onRefresh }: { data: DailyGuidance | null; loading: boolean; onRefresh: (force?: boolean) => void }) {
  const { addTask } = useStore() as any;
  const { toast } = useToast();
  const [added, setAdded] = useState<Record<string, boolean>>({});

  function addAction(text: string) {
    addTask?.({ title: text, area: undefined, cosmic_tag: "daily-guidance" });
    setAdded(s => ({ ...s, [text]: true }));
    toast({ title: "Added to CareFlow", description: text });
  }

  return (
    <section className="cozy-card p-4 sm:p-5" aria-label="Today's cosmic guidance">
      <header className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          Today's Cosmic Guidance
        </h3>
        <Button variant="ghost" size="icon" onClick={() => onRefresh(true)} disabled={loading} aria-label="Regenerate">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </header>

      {data ? (
        <>
          <p className="mt-2 font-medium text-[15px]">{data.headline}</p>
          <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-foreground/90">
            {data.body.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {data.suggested_actions?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">Suggested CareFlow Actions</p>
              <ul className="mt-1.5 space-y-1.5">
                {data.suggested_actions.map(a => (
                  <li key={a} className="flex items-center gap-2 text-[13.5px]">
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 gap-1.5 px-2"
                      onClick={() => addAction(a)}
                      disabled={!!added[a]}
                    >
                      {added[a] ? <Check className="h-3.5 w-3.5 text-primary" /> : <Plus className="h-3.5 w-3.5" />}
                      <span className="text-left">{a}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.gentle_reminder && (
            <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-[12.5px] italic text-muted-foreground">
              {data.gentle_reminder}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground italic">{loading ? "Drawing today's guidance…" : "Tap refresh to generate."}</p>
      )}
    </section>
  );
}