import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, RefreshCw, Trash2, Clock } from "lucide-react";
import type { Meal } from "@/lib/types";
import { ShopMenu } from "./ShopMenu";
import { regenerateMeal, saveFavorite } from "@/lib/meal-ai";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useState } from "react";
import { Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { pomodoroTemplates } from "@/lib/pomodoro-templates";
import { useNavigate } from "react-router-dom";

export function RecipeDrawer({ meal, onClose, onChanged }: { meal: Meal | null; onClose: () => void; onChanged: () => void }) {
  const { state, user, deleteMeal, toggleGrocery, addGrocery } = useStore();
  const [loading, setLoading] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerLabel, setTimerLabel] = useState("");
  const [focusMin, setFocusMin] = useState<number>(meal?.prepMinutes ?? 20);
  const [breakMin, setBreakMin] = useState<number>(5);
  const navigate = useNavigate();

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

  const openTimerDialog = () => {
    if (!meal) return;
    setTimerLabel(`Recipe: ${meal.name}`);
    setFocusMin(meal.prepMinutes ?? 20);
    setBreakMin(5);
    setTimerOpen(true);
  };

  const saveCustomTimer = () => {
    if (!meal) return;
    const label = timerLabel.trim() || `Recipe: ${meal.name}`;
    const focus = Math.max(1, Math.round(focusMin));
    const brk = Math.max(0, Math.round(breakMin));
    const id = `meal-${meal.id}-${Date.now().toString(36)}`;
    pomodoroTemplates.add({
      id,
      label,
      description: `${focus} on · ${brk} off · from meal plan`,
      focusSeconds: focus * 60,
      breakSeconds: brk * 60,
      icon: "Coffee",
    });
    setTimerOpen(false);
    toast.success("Timer added — find it on the Focus page.", {
      action: { label: "Open Focus", onClick: () => navigate("/focus") },
    });
  };

  // Match an ingredient to a grocery item (prefer same source meal, then any name match).
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  const findMatch = (ingredient: string) => {
    if (!meal) return undefined;
    const key = norm(ingredient);
    const sameMeal = state.grocery.find(g => g.sourceMealId === meal.id && norm(g.name) === key);
    if (sameMeal) return sameMeal;
    return state.grocery.find(g => norm(g.name) === key
      || norm(g.name).includes(key) || key.includes(norm(g.name)));
  };

  const onToggleIngredient = async (ingredient: string) => {
    const match = findMatch(ingredient);
    if (match) { await toggleGrocery(match.id); return; }
    // No grocery item — add one as already bought (so it shows as completed).
    await addGrocery(ingredient.slice(0, 120));
    toast.success("Added to grocery list");
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
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Ingredients</h3>
                  <span className="text-[10px] text-muted-foreground">Tap to mark bought</span>
                </div>
                {(meal.ingredients ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ingredients saved yet.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {(meal.ingredients ?? []).map((i, idx) => {
                      const match = findMatch(i);
                      const checked = !!match?.bought;
                      const inStock = match?.stockStatus === "in";
                      return (
                        <li key={idx} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5">
                          <Checkbox checked={checked} onCheckedChange={() => onToggleIngredient(i)} />
                          <span className={`flex-1 ${checked ? "text-muted-foreground line-through" : ""}`}>{i}</span>
                          <ShopMenu items={i} size="xs" variant="ghost" compact className="h-6 px-1.5" />
                          {match ? (
                            inStock ? (
                              <Badge variant="secondary" className="rounded-full bg-primary/15 text-[10px] text-primary">In stock</Badge>
                            ) : match.stockStatus === "low" ? (
                              <Badge variant="secondary" className="rounded-full bg-amber-500/20 text-[10px] text-amber-300">Low</Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground">On list</Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground/60">Not on list</Badge>
                          )}
                        </li>
                      );
                    })}
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
                <Button onClick={openTimerDialog} variant="outline" className="rounded-full">
                  <Timer className="mr-2 h-4 w-4" />Add timer
                </Button>
                {(meal.ingredients ?? []).length > 0 && (
                  <ShopMenu items={meal.ingredients ?? []} variant="outline" />
                )}
                <Button onClick={remove} variant="ghost" className="rounded-full text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />Remove
                </Button>
              </div>
            </div>
          </>
        )}

        <Dialog open={timerOpen} onOpenChange={setTimerOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Custom recipe timer</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Label</Label>
                <Input value={timerLabel} onChange={(e) => setTimerLabel(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Focus (min)</Label>
                  <Input type="number" min={1} value={focusMin} onChange={(e) => setFocusMin(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Break (min)</Label>
                  <Input type="number" min={0} value={breakMin} onChange={(e) => setBreakMin(Number(e.target.value) || 0)} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Saved as a custom Pomodoro template. Start it from the Focus page; sessions show up in your stats.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTimerOpen(false)}>Cancel</Button>
              <Button onClick={saveCustomTimer}>Save timer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}