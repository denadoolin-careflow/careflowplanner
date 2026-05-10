import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, RefreshCw, Trash2, Clock } from "lucide-react";
import type { Meal } from "@/lib/types";
import { regenerateMeal, saveFavorite } from "@/lib/meal-ai";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useState } from "react";

export function RecipeDrawer({ meal, onClose, onChanged }: { meal: Meal | null; onClose: () => void; onChanged: () => void }) {
  const { user, deleteMeal } = useStore();
  const [loading, setLoading] = useState(false);

  const regen = async () => {
    if (!meal) return;
    setLoading(true);
    try {
      await regenerateMeal(meal.date, meal.slot, meal.name);
      toast.success("New idea served.");
      onChanged();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't regenerate");
    } finally { setLoading(false); }
  };

  const fav = async () => {
    if (!meal || !user) return;
    await saveFavorite(user.id, {
      name: meal.name, slot: meal.slot, prep_minutes: meal.prepMinutes ?? null,
      ingredients: meal.ingredients ?? [], steps: meal.steps ?? [],
      tags: meal.tags ?? [], notes: meal.notes ?? null,
    });
    toast.success("Saved to favorites.");
  };

  const remove = async () => {
    if (!meal) return;
    await deleteMeal(meal.id);
    onClose();
  };

  return (
    <Sheet open={!!meal} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {meal && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">{meal.name}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5">{meal.slot}</span>
                {meal.prepMinutes ? <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{meal.prepMinutes} min</span> : null}
                {(meal.tags ?? []).map(t => <Badge key={t} variant="secondary" className="rounded-full text-[10px]">{t}</Badge>)}
              </div>
            </SheetHeader>

            <div className="mt-4 space-y-5">
              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Ingredients</h3>
                {(meal.ingredients ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ingredients saved yet.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {(meal.ingredients ?? []).map((i, idx) => <li key={idx} className="rounded-lg bg-muted/40 px-3 py-1.5">{i}</li>)}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Steps</h3>
                {(meal.steps ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No steps saved yet.</p>
                ) : (
                  <ol className="space-y-1.5 text-sm">
                    {(meal.steps ?? []).map((s, idx) => (
                      <li key={idx} className="flex gap-2"><span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] text-primary">{idx + 1}</span><span>{s}</span></li>
                    ))}
                  </ol>
                )}
              </section>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={regen} disabled={loading} variant="default" className="rounded-full">
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
                <Button onClick={fav} variant="outline" className="rounded-full">
                  <Heart className="mr-2 h-4 w-4" />Favorite
                </Button>
                <Button onClick={remove} variant="ghost" className="rounded-full text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />Remove
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}