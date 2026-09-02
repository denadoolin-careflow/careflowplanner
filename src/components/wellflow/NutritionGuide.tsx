/** Nutrition guide — general education about what foods tend to do. Not medical advice. */
import { useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GUIDE_DISCLAIMER, GUIDE_GROUPS, GUIDE_NOTES } from "@/lib/wellflow/nutrition-guide";

async function addToGroceries(name: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { toast.error("Please sign in"); return; }
  const clean = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const { error } = await supabase.from("grocery_items").insert({ user_id: user.id, name: clean } as any);
  if (error) toast.error("Could not add that");
  else toast.success(`${clean} added to groceries`);
}

export function NutritionGuide({ onLogFood }: { onLogFood?: (name: string) => void }) {
  const [group, setGroup] = useState(GUIDE_GROUPS[0].key);
  const active = GUIDE_GROUPS.find(g => g.key === group) ?? GUIDE_GROUPS[0];

  return (
    <div className="space-y-4">
      <SectionCard title="Nutrition guide" subtitle="What different foods tend to do, and why it helps" accent="sage">
        <div className="flex flex-wrap gap-1.5">
          {GUIDE_GROUPS.map(g => (
            <button
              key={g.key} type="button" onClick={() => setGroup(g.key)} aria-pressed={group === g.key}
              className={cn(
                "min-h-[2.25rem] rounded-full border px-3 text-xs transition-colors",
                group === g.key ? "border-primary bg-primary/15 font-medium" : "border-border/60 bg-card/50 text-muted-foreground",
              )}
            >
              {g.title}
            </button>
          ))}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{active.blurb}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {active.helps.map(h => (
            <span key={h} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs">{h}</span>
          ))}
        </div>

        <ul className="mt-3 space-y-1.5">
          {active.foods.map(f => (
            <li key={f.name} className="rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ~{f.calories} cal · {f.protein}g protein — {f.note}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {onLogFood && (
                    <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Log ${f.name}`}
                            onClick={() => onLogFood(f.name)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Add ${f.name} to groceries`}
                          onClick={() => void addToGroceries(f.name)}>
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      {GUIDE_NOTES.map(n => (
        <SectionCard key={n.title} title={n.title} subtitle={n.body} accent="warm">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {n.points.map(p => <li key={p} className="rounded-2xl bg-muted/30 px-3 py-2">{p}</li>)}
          </ul>
        </SectionCard>
      ))}

      <p className="px-1 text-xs text-muted-foreground">{GUIDE_DISCLAIMER}</p>
    </div>
  );
}
