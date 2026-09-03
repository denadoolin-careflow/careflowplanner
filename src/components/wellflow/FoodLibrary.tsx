import { useEffect, useMemo, useRef, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Check, Info, Loader2, Pencil, Plus, ScanLine, Search, Sparkles, Star, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EditFoodDialog, type EditableFood } from "./EditFoodDialog";
import { FoodDetailsSheet } from "./FoodDetailsSheet";
import {
  createSavedFood, createSavedFoods, deleteSavedFood, logFood, parseFoodText,
  savedToCandidate, searchFoods, setSavedFoodPortion, toggleFavoriteFood,
  updateSavedFood, useSavedFoods,
} from "@/lib/wellflow/data";
import {
  DIET_TAGS, RETAILER_TO_STORE, SORT_OPTIONS, STORES, STORE_TO_RETAILER, dietShelf,
  mergeWithCatalog, rankByRelevance, searchCatalog, sortCandidates, storeForBrand, storeShelf,
  type DietTag, type SortKey, type Store,
} from "@/lib/wellflow/food-catalog";
import { useGroceryPrefs } from "@/lib/grocery-prefs";
import type { Retailer } from "@/lib/retailer-links";
import type { FoodCandidate, MealType, SavedFood } from "@/lib/wellflow/types";

function guessMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

const toEditable = (c: FoodCandidate): EditableFood => ({
  name: c.name,
  serving_size: c.servingSize ?? null,
  calories: c.calories, protein: c.protein, carbs: c.carbs, fat: c.fat, fiber: c.fiber,
});

const SORT_STORAGE_KEY = "wellflow.library.sort";
const keyFor = (c: FoodCandidate) => `${c.name}|${c.brand ?? ""}`.toLowerCase();

interface BulkPick { food: FoodCandidate; servings: number; servingSize: string }

/** Searchable food library: find any food, describe one in plain language,
 *  bring in its nutrition totals, then edit, bulk import, or log it. */
export function FoodLibrary({ date }: { date: string }) {
  const { foods } = useSavedFoods();
  const { prefs, save: savePrefs, loading: prefsLoading } = useGroceryPrefs();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<"search" | "ai" | "scan" | null>(null);
  const [results, setResults] = useState<FoodCandidate[]>([]);
  const [editing, setEditing] = useState<{ value: EditableFood; savedId?: string } | null>(null);
  const [details, setDetails] = useState<FoodCandidate | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [diet, setDiet] = useState<DietTag | null>(null);
  const [tab, setTab] = useState<"all" | "favorites" | "recents">("all");
  const [sort, setSort] = useState<SortKey>(
    () => (localStorage.getItem(SORT_STORAGE_KEY) as SortKey) || "best",
  );
  const [bulkMode, setBulkMode] = useState(false);
  const [picked, setPicked] = useState<Record<string, FoodCandidate>>({});
  const [review, setReview] = useState<BulkPick[] | null>(null);
  const [importing, setImporting] = useState(false);
  const searchToken = useRef(0);
  const storeSeeded = useRef(false);

  /* Default the store filter to the grocery preference the user already set. */
  useEffect(() => {
    if (prefsLoading || storeSeeded.current) return;
    storeSeeded.current = true;
    const mapped = RETAILER_TO_STORE[prefs.preferred_store];
    if (mapped) setStore(mapped);
  }, [prefsLoading, prefs.preferred_store]);

  useEffect(() => { localStorage.setItem(SORT_STORAGE_KEY, sort); }, [sort]);

  const shelfRaw = useMemo(
    () => (diet ? dietShelf(diet, store) : store ? storeShelf(store) : []),
    [diet, store],
  );
  const shelf = useMemo(() => sortCandidates(shelfRaw, sort), [shelfRaw, sort]);
  const shownResults = useMemo(() => sortCandidates(results, sort), [results, sort]);

  /** Live search as you type — library first, then catalog, then Open Food Facts. */
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    const token = ++searchToken.current;
    const t = setTimeout(async () => {
      setBusy("search");
      const local = rankByRelevance(searchCatalog(term, store, 40), term);
      if (searchToken.current === token) setResults(local);
      try {
        const remote = await searchFoods(term).catch(() => [] as FoodCandidate[]);
        if (searchToken.current !== token) return;
        setResults(rankByRelevance(mergeWithCatalog(term, remote, store), term));
      } finally {
        if (searchToken.current === token) setBusy(null);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, store]);

  /** Scan a product barcode with the device camera when the browser supports it. */
  const scan = async () => {
    const Detector = (window as { BarcodeDetector?: any }).BarcodeDetector;
    if (!Detector) { toast("Barcode scanning isn't supported here — type the number instead."); return; }
    setBusy("scan");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      const deadline = Date.now() + 10_000;
      let code: string | null = null;
      while (Date.now() < deadline && !code) {
        const codes = await detector.detect(video).catch(() => []);
        if (codes?.length) code = codes[0].rawValue;
        else await new Promise(r => setTimeout(r, 250));
      }
      stream.getTracks().forEach(t => t.stop());
      if (!code) { toast("No barcode detected — try again in better light."); return; }
      const found = await searchFoods("", code);
      if (!found.length) { toast("That product isn't in the food database yet — add it by hand."); return; }
      searchToken.current++;
      setResults(found);
      setDetails(found[0]);
    } catch {
      toast("Camera access wasn't available.");
    } finally { setBusy(null); }
  };

  const mine = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = term.length >= 2 ? foods.filter(f => f.name.toLowerCase().includes(term)) : foods;
    if (tab === "favorites") list = list.filter(f => f.favorite);
    if (tab === "recents") list = list.filter(f => f.times_logged > 0);
    const sorted = sortCandidates(list.map(savedToCandidate), sort);
    const byId = new Map(foods.map(f => [f.id, f]));
    return sorted.map(c => byId.get(c.savedId ?? c.id)!).filter(Boolean).slice(0, 60);
  }, [foods, q, tab, sort]);

  const describe = async () => {
    if (!q.trim()) { toast("Describe what you ate first."); return; }
    setBusy("ai");
    try {
      const items = await parseFoodText(q.trim());
      if (!items.length) { toast("Couldn't estimate that — add a bit more detail."); return; }
      searchToken.current++;
      setResults(items);
      toast("Estimated — review the numbers before saving.");
    } catch { toast.error("Estimating is unavailable right now"); }
    finally { setBusy(null); }
  };

  const saveToLibrary = async (c: FoodCandidate) => {
    try { await createSavedFood(c); toast.success(`${c.name} added to your library`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save that"); }
  };

  const logNow = async (c: FoodCandidate, servings?: number) => {
    try {
      await logFood({ date, candidate: c, servings: servings ?? c.servings ?? 1, mealType: guessMeal() });
      toast.success(`${c.name} logged`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not log that"); }
  };

  const saveEdit = async (next: EditableFood) => {
    if (editing?.savedId) {
      await updateSavedFood(editing.savedId, {
        name: next.name, serving_size: next.serving_size, calories: next.calories,
        protein: next.protein, carbs: next.carbs, fat: next.fat, fiber: next.fiber,
      });
    } else {
      await createSavedFood({
        id: "manual", name: next.name, servingSize: next.serving_size,
        calories: next.calories, protein: next.protein, carbs: next.carbs,
        fat: next.fat, fiber: next.fiber, source: "manual",
      });
    }
  };

  /* ------------------------------------------------------------ bulk add */

  const pickedList = Object.values(picked);
  const togglePick = (c: FoodCandidate) =>
    setPicked(p => {
      const k = keyFor(c);
      if (p[k]) { const { [k]: _drop, ...rest } = p; return rest; }
      return { ...p, [k]: c };
    });

  const selectAll = (list: FoodCandidate[]) =>
    setPicked(p => ({ ...p, ...Object.fromEntries(list.map(c => [keyFor(c), c])) }));

  const openReview = () =>
    setReview(pickedList.map(food => ({
      food, servings: 1, servingSize: food.servingSize ?? "1 serving",
    })));

  const runImport = async () => {
    if (!review) return;
    setImporting(true);
    try {
      const items: FoodCandidate[] = review.map(({ food, servings, servingSize }) => {
        const k = servings > 0 ? servings : 1;
        const r = (v: number) => Math.round(v * k * 10) / 10;
        return {
          ...food,
          servingSize: servingSize || food.servingSize || "1 serving",
          calories: r(food.calories), protein: r(food.protein), carbs: r(food.carbs),
          fat: r(food.fat), fiber: r(food.fiber),
        };
      });
      const { added, skipped } = await createSavedFoods(items);
      toast.success(`Added ${added}${skipped ? `, skipped ${skipped} already saved` : ""}`);
      setReview(null);
      setPicked({});
      setBulkMode(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not import those");
    } finally { setImporting(false); }
  };

  const preferredStore = RETAILER_TO_STORE[prefs.preferred_store] ?? null;
  const canPrefer = !!store && !!STORE_TO_RETAILER[store] && store !== preferredStore;

  const bulkRow = (c: FoodCandidate) =>
    bulkMode && (
      <Checkbox
        className="mt-0.5 h-5 w-5 shrink-0"
        checked={!!picked[keyFor(c)]}
        onCheckedChange={() => togglePick(c)}
        aria-label={`Select ${c.name}`}
      />
    );

  return (
    <SectionCard
      title="Food library"
      subtitle="Search any food or describe it — nutrition totals come in automatically"
      collapsibleId="wellflow-library"
      action={
        <div className="flex items-center gap-1">
          <Button size="sm" variant={bulkMode ? "secondary" : "ghost"}
                  onClick={() => { setBulkMode(v => !v); setPicked({}); }}>
            {bulkMode ? "Done" : "Bulk add"}
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5"
                  onClick={() => setEditing({ value: { name: "", serving_size: "", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } })}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      }
    >
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Greek yogurt, or “2 eggs and toast with butter”"
          aria-label="Search or describe a food"
        />
        <Button variant="secondary" size="icon" aria-label="Search foods"
                onClick={() => setQ(s => s)} disabled={busy !== null}>
          {busy === "search" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        <Button variant="secondary" size="icon" aria-label="Estimate from description" onClick={describe} disabled={busy !== null}>
          {busy === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </Button>
        <Button variant="secondary" size="icon" aria-label="Scan a barcode" onClick={scan} disabled={busy !== null}>
          {busy === "scan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Select value={sort} onValueChange={v => setSort(v as SortKey)}>
          <SelectTrigger className="h-9 w-[190px]" aria-label="Sort results">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {canPrefer && store && (
          <Button size="sm" variant="ghost" className="gap-1"
                  onClick={async () => {
                    await savePrefs({ preferred_store: STORE_TO_RETAILER[store] as Retailer });
                    toast.success(`${store} is now your preferred store`);
                  }}>
            <Check className="h-3.5 w-3.5" /> Set {store} as preferred
          </Button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter by store">
        <button type="button" onClick={() => setStore(null)} aria-pressed={store === null}
                className={cn("min-h-[2.25rem] rounded-full border px-3 text-xs transition-colors",
                  store === null ? "border-primary bg-primary/15 font-medium" : "border-border/60 bg-card/50 text-muted-foreground")}>
          All stores
        </button>
        {STORES.map(s2 => (
          <button key={s2} type="button" onClick={() => setStore(st => (st === s2 ? null : s2))} aria-pressed={store === s2}
                  className={cn("min-h-[2.25rem] rounded-full border px-3 text-xs transition-colors",
                    store === s2 ? "border-primary bg-primary/15 font-medium" : "border-border/60 bg-card/50 text-muted-foreground")}>
            {s2}{preferredStore === s2 ? " ★" : ""}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Popular for a way of eating">
        {DIET_TAGS.map(d => (
          <button key={d.key} type="button" onClick={() => setDiet(t => (t === d.key ? null : d.key))}
                  aria-pressed={diet === d.key}
                  className={cn("min-h-[2.25rem] rounded-full border px-3 text-xs transition-colors",
                    diet === d.key ? "border-primary bg-primary/15 font-medium"
                                   : "border-border/60 bg-card/50 text-muted-foreground")}>
            {d.label}
          </button>
        ))}
      </div>

      {shelf.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Popular picks{store ? ` at ${store}` : ""}
            </p>
            {bulkMode && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => selectAll(shelf)}>
                Select all
              </Button>
            )}
          </div>
          <ul className="space-y-1.5">
            {shelf.map(c => (
              <li key={c.id} className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
                {bulkRow(c)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.brand ? `${c.brand} · ` : ""}{c.servingSize} · {Math.round(c.calories)} cal • {Math.round(c.protein)}g P
                  </p>
                </div>
                {!bulkMode && <Button size="sm" variant="secondary" onClick={() => logNow(c)}>Log</Button>}
                {!bulkMode && <Button size="sm" variant="ghost" onClick={() => saveToLibrary(c)}>Save</Button>}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Matched on nutrition facts, not a recommendation — check anything that matters to you.
          </p>
        </div>
      )}

      {busy === "search" && shownResults.length === 0 && (
        <ul className="mt-3 space-y-1.5" aria-hidden>
          {[0, 1, 2].map(i => <li key={i} className="h-14 animate-pulse rounded-2xl bg-muted/40" />)}
        </ul>
      )}

      {shownResults.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Results</p>
            {bulkMode && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => selectAll(shownResults)}>
                Select all
              </Button>
            )}
          </div>
          <ul className="space-y-1.5">
            {shownResults.map(c => (
              <li key={c.id} className="rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
                <div className="flex items-start gap-2">
                  {bulkRow(c)}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      <span className="truncate">{c.name}</span>
                      {storeForBrand(c.brand) && (
                        <span className="shrink-0 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-normal text-muted-foreground">
                          {storeForBrand(c.brand)}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.brand ? `${c.brand} · ` : ""}{c.servingSize || "1 serving"} · {Math.round(c.calories)} cal • {Math.round(c.protein)}g P • {Math.round(c.carbs)}g C • {Math.round(c.fat)}g F
                    </p>
                  </div>
                </div>
                {!bulkMode && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => logNow(c)}>Log</Button>
                    <Button size="sm" variant="ghost" onClick={() => saveToLibrary(c)}>Save</Button>
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => setDetails(c)}>
                      <Info className="h-3.5 w-3.5" /> Details
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1"
                            onClick={() => setEditing({ value: toEditable(c) })}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {q.trim().length >= 2 && busy === null && shownResults.length === 0 && (
        <p className="mt-3 rounded-2xl border border-dashed border-border/50 p-3 text-sm text-muted-foreground">
          No matches yet. Try fewer words, tap the sparkle to describe it instead, or add it by hand with New.
        </p>
      )}

      <div className="mt-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <p className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">My foods</p>
          {([["all", "All"], ["favorites", "Favorites"], ["recents", "Recents"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k}
                    className={cn("min-h-[2rem] rounded-full border px-3 text-xs transition-colors",
                      tab === k ? "border-primary bg-primary/15 font-medium" : "border-border/60 bg-card/50 text-muted-foreground")}>
              {label}
            </button>
          ))}
        </div>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here yet. Search, describe, or add a food by hand.</p>
        ) : (
          <ul className="space-y-1.5">
            {mine.map((f: SavedFood) => (
              <SavedFoodRow
                key={f.id}
                food={f}
                onLog={() => logNow(savedToCandidate(f))}
                onDetails={() => setDetails(savedToCandidate(f))}
                onEdit={() => setEditing({ value: toEditable(savedToCandidate(f)), savedId: f.id })}
              />
            ))}
          </ul>
        )}
      </div>

      {bulkMode && pickedList.length > 0 && (
        <div className="sticky bottom-2 z-10 mt-3 flex items-center gap-2 rounded-2xl border border-primary/40 bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
          <span className="text-sm font-medium">{pickedList.length} selected</span>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={() => setPicked({})}>Clear</Button>
          <Button size="sm" onClick={openReview}>Add {pickedList.length} to library</Button>
        </div>
      )}

      <Dialog open={!!review} onOpenChange={v => { if (!v) setReview(null); }}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Review portions before importing</DialogTitle></DialogHeader>
          <ul className="space-y-2">
            {(review ?? []).map((row, i) => (
              <li key={keyFor(row.food)} className="rounded-2xl border border-border/40 p-2.5">
                <p className="truncate text-sm font-medium">{row.food.name}</p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <label className="text-xs text-muted-foreground">
                    Serving size
                    <Input className="mt-1 h-9" value={row.servingSize}
                           onChange={e => setReview(r => r!.map((x, j) => j === i ? { ...x, servingSize: e.target.value } : x))} />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Servings
                    <Input className="mt-1 h-9" type="number" min="0.1" step="0.1" inputMode="decimal"
                           value={row.servings}
                           onChange={e => {
                             const v = Number(e.target.value);
                             setReview(r => r!.map((x, j) => j === i ? { ...x, servings: Number.isFinite(v) && v > 0 ? v : 1 } : x));
                           }} />
                  </label>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Saves as {Math.round(row.food.calories * row.servings)} cal • {Math.round(row.food.protein * row.servings)}g P
                  • {Math.round(row.food.carbs * row.servings)}g C • {Math.round(row.food.fat * row.servings)}g F
                </p>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReview(null)}>Cancel</Button>
            <Button onClick={runImport} disabled={importing}>
              {importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Import {review?.length ?? 0}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditFoodDialog
        open={!!editing}
        onOpenChange={v => { if (!v) setEditing(null); }}
        title={editing?.savedId ? "Edit food" : "New food"}
        value={editing?.value ?? null}
        onSave={saveEdit}
      />

      <FoodDetailsSheet
        food={details}
        onOpenChange={v => { if (!v) setDetails(null); }}
        onLog={(f, servings) => logNow(f, servings)}
        onSave={saveToLibrary}
      />
    </SectionCard>
  );
}

/** One saved food, with a quick portion editor that rescales its macros. */
function SavedFoodRow({
  food, onLog, onDetails, onEdit,
}: {
  food: SavedFood;
  onLog: () => void;
  onDetails: () => void;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [serving, setServing] = useState(food.serving_size ?? "");
  const [scale, setScale] = useState("1");

  const apply = async (k: number) => {
    await setSavedFoodPortion(food, k, serving || null);
    toast.success("Portion updated");
    setOpen(false);
    setScale("1");
  };

  return (
    <li className="rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <button type="button" aria-label={food.favorite ? "Unfavorite" : "Favorite"}
                onClick={() => toggleFavoriteFood(food.id, !food.favorite)}>
          <Star className={cn("h-4 w-4", food.favorite ? "fill-accent text-accent" : "text-muted-foreground")} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{food.name}</p>
          <button type="button" onClick={() => setOpen(v => !v)}
                  className="truncate text-left text-xs text-muted-foreground underline-offset-2 hover:underline">
            {food.serving_size || "1 serving"} · {Math.round(food.calories)} cal • {Math.round(food.protein)}g P • {Math.round(food.carbs)}g C • {Math.round(food.fat)}g F
          </button>
        </div>
        <Button size="sm" variant="ghost" onClick={onLog}>Log</Button>
        <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Details for ${food.name}`} onClick={onDetails}>
          <Info className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Edit ${food.name}`} onClick={onEdit}>
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Remove ${food.name}`}
                onClick={async () => { await deleteSavedFood(food.id); toast.success("Removed"); }}>
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {open && (
        <div className="mt-2 space-y-2 rounded-xl border border-border/40 bg-muted/20 p-2">
          <Input className="h-9" value={serving} placeholder="Serving size, e.g. 3/4 cup"
                 aria-label={`Serving size for ${food.name}`}
                 onChange={e => setServing(e.target.value)} />
          <div className="flex flex-wrap items-center gap-1.5">
            {[0.5, 1, 1.5, 2].map(k => (
              <Button key={k} size="sm" variant="secondary" className="h-8" onClick={() => apply(k)}>{k}×</Button>
            ))}
            <Input className="h-8 w-20" type="number" min="0.1" step="0.1" inputMode="decimal"
                   aria-label="Custom portion multiplier"
                   value={scale} onChange={e => setScale(e.target.value)} />
            <Button size="sm" className="h-8" onClick={() => apply(Number(scale) || 1)}>Apply</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Multiplier rescales calories and macros for this saved food.</p>
        </div>
      )}
    </li>
  );
}
