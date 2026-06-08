import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { getActiveAspects } from "@/lib/cosmic/active-aspects";
import { interpretPlanetInSign } from "@/lib/cosmic/interpretations";
import { useStore } from "@/lib/store";
import { suggestAnchorForText } from "@/lib/anchor-suggest";
import { DEFAULT_ANCHORS } from "@/lib/anchors";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Suggests 4-6 small tasks generated from today's active transits. Each
 * row adds itself to the user's tasks via the store, with an anchor
 * suggestion derived from the title.
 */
export function CosmicTasksCard({ date }: { date: Date }) {
  const { addTask } = useStore();
  const [adding, setAdding] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const suggestions = useMemo(() => {
    const aspects = getActiveAspects(date, 4);
    const seen = new Set<string>();
    const items: { title: string; from: string }[] = [];
    for (const a of aspects) {
      const focus = interpretPlanetInSign(a.a, a.aSign).focus;
      for (const f of focus) {
        if (seen.has(f)) continue;
        seen.add(f);
        items.push({ title: f, from: `${a.a} in ${a.aSign}` });
        if (items.length >= 5) break;
      }
      if (items.length >= 5) break;
    }
    if (items.length === 0) {
      items.push(
        { title: "Brain dump", from: "Quiet sky" },
        { title: "Declutter one drawer", from: "Quiet sky" },
        { title: "Reach out to one person", from: "Quiet sky" },
      );
    }
    return items;
  }, [date]);

  async function handleAdd(title: string) {
    setAdding(title);
    try {
      const anchorKey = suggestAnchorForText(title);
      const anchor = anchorKey ? DEFAULT_ANCHORS.find((a) => a.key === anchorKey) : undefined;
      await addTask({ title, anchorKey });
      setDone((d) => ({ ...d, [title]: true }));
      toast.success(`Added "${title}" to your tasks${anchor ? ` · ${anchor.label}` : ""}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't add that task.");
    } finally {
      setAdding(null);
    }
  }

  return (
    <section className="cozy-card glass-panel p-5" aria-label="Cosmic tasks">
      <header>
        <h3 className="font-display text-base">Cosmic Tasks</h3>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">Generated from today's transits.</p>
      </header>
      <ul className="mt-3 space-y-1.5">
        {suggestions.map((s) => (
          <li
            key={s.title}
            className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-card/60 px-3 py-2"
          >
            <div className="min-w-0">
              <p className={"text-[13px] leading-tight " + (done[s.title] ? "line-through text-muted-foreground" : "")}>{s.title}</p>
              <p className="text-[10.5px] text-muted-foreground">From {s.from}</p>
            </div>
            <Button
              size="sm"
              variant={done[s.title] ? "ghost" : "outline"}
              className="h-7 shrink-0 px-2 text-[11.5px]"
              disabled={!!done[s.title] || adding === s.title}
              onClick={() => handleAdd(s.title)}
            >
              {adding === s.title ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : done[s.title] ? (
                "Added"
              ) : (
                <><Plus className="h-3 w-3 mr-0.5" /> Add</>
              )}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}