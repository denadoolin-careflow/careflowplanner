import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Sparkles, Star, ScanLine, Plus, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MEAL_TYPES, type FoodCandidate, type MealType } from "@/lib/wellflow/types";
import {
  logFood, parseFoodText, savedToCandidate, searchFoods, toggleFavoriteFood, useSavedFoods,
} from "@/lib/wellflow/data";
import { logPlannedMeal, usePlannedMeals } from "@/lib/wellflow/meal-plan";

const blank: FoodCandidate = {
  id: "manual", name: "", servingSize: "", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, source: "manual",
};

function guessMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function LogFoodSheet({
  open, onOpenChange, date,
}: { open: boolean; onOpenChange: (v: boolean) => void; date: string }) {
  const { foods } = useSavedFoods();
  const { meals: planned, loading: planLoading } = usePlannedMeals(date);
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [selected, setSelected] = useState<FoodCandidate | null>(null);
  const [servings, setServings] = useState(1);
  const [mealType, setMealType] = useState<MealType>(guessMeal);
  const [time, setTime] = useState(nowTime);
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState<Record<string, FoodCandidate>>({});
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setSelected(null); setServings(1); setMealType(guessMeal());
      setTime(nowTime()); setPicked({});
    }
  }, [open]);

  const recents = useMemo(() => foods.slice(0, 25), [foods]);
  const favorites = useMemo(() => foods.filter(f => f.favorite), [foods]);

  /** Local matches from the user's own library, shown alongside search results. */
  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return foods.filter(f => f.name.toLowerCase().includes(q)).slice(0, 6).map(savedToCandidate);
  }, [foods, query]);

  const runSearch = async (barcode?: string, term?: string) => {
    const q = (term ?? query).trim();
    if (!barcode && q.length < 2) return;
    setSearching(true);
    try {
      const r = await searchFoods(q, barcode);
      setResults(r);
    } catch {
      toast.error("Food search is unavailable right now");
    } finally { setSearching(false); }
  };

  /** Debounced search as you type. */
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 3) return;
    debounce.current = setTimeout(() => void runSearch(undefined, q), 500);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const scanBarcode = async () => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) { toast("Barcode scanning isn't supported here — type the number instead."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.createElement("video");
      video.srcObject = stream; await video.play();
      const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      const deadline = Date.now() + 10_000;
      let code: string | null = null;
      while (Date.now() < deadline && !code) {
        const codes = await detector.detect(video).catch(() => []);
        if (codes?.length) code = codes[0].rawValue;
        else await new Promise(r => setTimeout(r, 250));
      }
      stream.getTracks().forEach(t => t.stop());
      if (code) { setQuery(code); await runSearch(code); }
      else toast("No barcode detected — try again in better light.");
    } catch {
      toast("Camera access wasn't available.");
    }
  };

  const runAi = async () => {
    const t = (aiText.trim() || query.trim());
    if (!t) return;
    setAiBusy(true);
    try {
      const items = await parseFoodText(t);
      if (!items.length) { toast("Couldn't estimate that — try adding a bit more detail."); return; }
      setResults(items);
      setSelected(items[0]);
      setServings(items[0].servings ?? 1);
      toast("Estimated — please review before saving.");
    } catch {
      toast.error("Estimating is unavailable right now");
    } finally { setAiBusy(false); }
  };

  const [feelFor, setFeelFor] = useState<string | null>(null);

  const save = async () => {
    if (!selected || !selected.name.trim()) { toast("Give the food a name first."); return; }
    setSaving(true);
    try {
      await logFood({ date, candidate: selected, servings: Math.max(servings, 0.1), mealType, time });
      toast.success("Logged");
      const name = selected.name.trim();
      onOpenChange(false);
      setFeelFor(name);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not log that");
    } finally { setSaving(false); }
  };

  const pickedList = Object.values(picked);
  const logPicked = async () => {
    setSaving(true);
    try {
      for (const c of pickedList) {
        await logFood({ date, candidate: c, servings: 1, mealType, time });
      }
      toast.success(`${pickedList.length} item${pickedList.length === 1 ? "" : "s"} logged`);
      setPicked({});
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not log those");
    } finally { setSaving(false); }
  };

  const togglePick = (c: FoodCandidate) =>
    setPicked(p => {
      const next = { ...p };
      if (next[c.id]) delete next[c.id]; else next[c.id] = c;
      return next;
    });

  const Row = ({ c, onPick, right, selectable = true }: {
    c: FoodCandidate; onPick: () => void; right?: React.ReactNode; selectable?: boolean;
  }) => (
    <div className="flex items-center gap-2">
      {selectable && (
        <Checkbox checked={!!picked[c.id]} onCheckedChange={() => togglePick(c)}
                  aria-label={`Select ${c.name}`} />
      )}
      <button type="button" onClick={onPick}
        className="flex-1 rounded-xl border border-border/60 px-3 py-2 text-left transition-colors hover:bg-muted/50">
        <div className="truncate text-sm font-medium">{c.name}{c.brand ? ` · ${c.brand}` : ""}</div>
        <div className="text-xs text-muted-foreground">
          {c.servingSize ? `${c.servingSize} · ` : ""}{Math.round(c.calories)} cal · {Math.round(c.protein)}g protein
        </div>
      </button>
      {right}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl p-0">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="font-display">What did you eat?</SheetTitle>
        </SheetHeader>

        {selected ? (
          <ScrollArea className="h-[calc(92vh-70px)]">
            <div className="space-y-4 px-5 pb-8 pt-4">
              <button type="button" onClick={() => setSelected(null)}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                ← Back to search
              </button>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="wf-name">Food</Label>
                  <Input id="wf-name" value={selected.name}
                    onChange={e => setSelected({ ...selected, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="wf-serving">Serving size</Label>
                  <Input id="wf-serving" placeholder="1 cup" value={selected.servingSize ?? ""}
                    onChange={e => setSelected({ ...selected, servingSize: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="wf-servings">Number of servings</Label>
                  <Input id="wf-servings" type="number" min={0.1} step={0.5} value={servings}
                    onChange={e => setServings(Number(e.target.value) || 1)} />
                  <div className="mt-1 flex gap-1.5">
                    {[0.5, 1, 2].map(m => (
                      <button key={m} type="button" onClick={() => setServings(m)}
                              className={cn("rounded-full border px-2.5 py-0.5 text-[11px]",
                                servings === m ? "border-primary bg-primary/15 font-medium"
                                               : "border-border/60 text-muted-foreground")}>
                        {m === 0.5 ? "½" : `${m}×`}
                      </button>
                    ))}
                  </div>
                </div>
                {([["calories", "Calories"], ["protein", "Protein (g)"], ["carbs", "Carbs (g)"],
                   ["fat", "Fat (g)"], ["fiber", "Fiber (g)"]] as const).map(([key, label]) => (
                  <div key={key}>
                    <Label htmlFor={`wf-${key}`}>{label}</Label>
                    <Input id={`wf-${key}`} type="number" min={0} value={selected[key]}
                      onChange={e => setSelected({ ...selected, [key]: Number(e.target.value) || 0 })} />
                  </div>
                ))}
                <div>
                  <Label htmlFor="wf-time">Time</Label>
                  <Input id="wf-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Meal</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {MEAL_TYPES.map(m => (
                    <button key={m.key} type="button" onClick={() => setMealType(m.key)}
                      className={cn("rounded-full border px-3 py-1 text-xs transition-colors",
                        mealType === m.key ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:bg-muted/50")}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Saving {Math.round(selected.calories * servings)} cal ·{" "}
                {Math.round(selected.protein * servings)}g protein ·{" "}
                {Math.round(selected.fiber * servings)}g fiber
              </div>

              <Button className="w-full" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Log it
              </Button>
            </div>
          </ScrollArea>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex h-[calc(92vh-70px)] flex-col">
            <TabsList className="mx-5 mt-3 grid grid-cols-5">
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="plan">My plan</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <div className="space-y-3 px-5 pb-24 pt-4">
                <TabsContent value="search" className="mt-0 space-y-3">
                  <div className="flex gap-2">
                    <Input value={query} onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") void runSearch(); }}
                      placeholder="Search foods or type a barcode" aria-label="Search foods" />
                    <Button variant="secondary" onClick={() => void runSearch()} aria-label="Search" disabled={searching}>
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" onClick={scanBarcode} aria-label="Scan barcode">
                      <ScanLine className="h-4 w-4" />
                    </Button>
                  </div>

                  {localMatches.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        From your foods
                      </p>
                      {localMatches.map(c => (
                        <Row key={`local-${c.id}`} c={c}
                             onPick={() => { setSelected(c); setServings(1); }} />
                      ))}
                    </div>
                  )}

                  {results.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Food database
                      </p>
                      {results.map(c => (
                        <Row key={c.id} c={c} onPick={() => { setSelected(c); setServings(c.servings ?? 1); }} />
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl border border-border/60 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" /> Describe it instead
                    </div>
                    <div className="flex gap-2">
                      <Input value={aiText} onChange={e => setAiText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") void runAi(); }}
                        placeholder="2 eggs and toast" aria-label="Describe your food" />
                      <Button variant="secondary" onClick={() => void runAi()} disabled={aiBusy}>
                        {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Estimate"}
                      </Button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Estimates are a starting point — you can edit everything before saving.
                    </p>
                  </div>

                  {!results.length && !localMatches.length && !searching && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Search for a food, scan a barcode, or describe your meal.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="plan" className="mt-0 space-y-2">
                  {planLoading ? (
                    <div className="h-16 animate-pulse rounded-xl bg-muted/50" />
                  ) : planned.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nothing planned for today in your meal planner.
                    </p>
                  ) : planned.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <button type="button"
                              onClick={async () => {
                                try {
                                  await logPlannedMeal(m, date);
                                  toast.success(`${m.name} logged — review it any time`);
                                  onOpenChange(false);
                                } catch { toast.error("Could not log that meal"); }
                              }}
                              className="flex-1 rounded-xl border border-border/60 px-3 py-2 text-left hover:bg-muted/50">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> {m.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.slot} · tap to log</div>
                      </button>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="recent" className="mt-0 space-y-2">
                  {recents.map(f => (
                    <Row key={f.id} c={savedToCandidate(f)}
                      onPick={() => { setSelected(savedToCandidate(f)); setServings(1); }}
                      right={
                        <Button size="sm" variant="ghost" aria-label={`Log ${f.name} again`}
                          onClick={async () => {
                            await logFood({ date, candidate: savedToCandidate(f), servings: 1, mealType: guessMeal() });
                            toast.success("Logged again");
                          }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      } />
                  ))}
                  {!recents.length && <p className="py-6 text-center text-sm text-muted-foreground">Foods you log will show up here.</p>}
                </TabsContent>

                <TabsContent value="favorites" className="mt-0 space-y-2">
                  {favorites.map(f => (
                    <Row key={f.id} c={savedToCandidate(f)}
                      onPick={() => { setSelected(savedToCandidate(f)); setServings(1); }}
                      right={
                        <Button size="sm" variant="ghost" aria-label={`Unfavorite ${f.name}`}
                          onClick={() => toggleFavoriteFood(f.id, false)}>
                          <Star className="h-4 w-4 fill-accent text-accent" />
                        </Button>
                      } />
                  ))}
                  {!favorites.length && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Star a food from Recent to keep it close.
                    </p>
                  )}
                  {!!recents.length && (
                    <div className="pt-2">
                      <p className="mb-2 text-xs text-muted-foreground">Add a favorite</p>
                      <div className="space-y-2">
                        {recents.filter(f => !f.favorite).slice(0, 8).map(f => (
                          <Row key={f.id} c={savedToCandidate(f)} selectable={false}
                            onPick={() => toggleFavoriteFood(f.id, true)}
                            right={<Star className="h-4 w-4 text-muted-foreground" />} />
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="custom" className="mt-0">
                  <Button className="w-full" variant="secondary"
                    onClick={() => { setSelected({ ...blank }); setServings(1); }}>
                    Add a food manually
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Enter the nutrition from the label — it's saved for next time.
                  </p>
                </TabsContent>
              </div>
            </ScrollArea>

            {pickedList.length > 0 && (
              <div className="sticky bottom-0 flex items-center gap-2 border-t border-border/50 bg-card/95 px-5 py-3 backdrop-blur">
                <span className="text-sm">{pickedList.length} selected</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setPicked({})}>Clear</Button>
                  <Button size="sm" disabled={saving} onClick={logPicked}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Log all
                  </Button>
                </div>
              </div>
            )}
          </Tabs>
        )}
      </SheetContent>
      <FoodFeelSheet
        open={!!feelFor}
        onOpenChange={v => { if (!v) setFeelFor(null); }}
        foodName={feelFor ?? ""}
        date={date}
      />
    </Sheet>
  );
}
