import { useMemo, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info, Loader2, Pencil, Plus, ScanLine, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EditFoodDialog, type EditableFood } from "./EditFoodDialog";
import { FoodDetailsSheet } from "./FoodDetailsSheet";
import {
  createSavedFood, deleteSavedFood, logFood, parseFoodText, savedToCandidate, searchFoods,
  toggleFavoriteFood, updateSavedFood, useSavedFoods,
} from "@/lib/wellflow/data";
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

/** Searchable food library: find any food, describe one in plain language,
 *  bring in its nutrition totals, then edit or log it. */
export function FoodLibrary({ date }: { date: string }) {
  const { foods } = useSavedFoods();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<"search" | "ai" | "scan" | null>(null);
  const [results, setResults] = useState<FoodCandidate[]>([]);
  const [editing, setEditing] = useState<{ value: EditableFood; savedId?: string } | null>(null);
  const [details, setDetails] = useState<FoodCandidate | null>(null);

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
      setResults(found);
      setDetails(found[0]);
    } catch {
      toast("Camera access wasn't available.");
    } finally { setBusy(null); }
  };


  const mine = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term.length >= 2 ? foods.filter(f => f.name.toLowerCase().includes(term)) : foods;
    return list.slice(0, 30);
  }, [foods, q]);

  const runSearch = async () => {
    if (q.trim().length < 2) { toast("Type at least two letters."); return; }
    setBusy("search");
    try { setResults(await searchFoods(q.trim())); }
    catch { toast.error("Food search is unavailable right now"); }
    finally { setBusy(null); }
  };

  const describe = async () => {
    if (!q.trim()) { toast("Describe what you ate first."); return; }
    setBusy("ai");
    try {
      const items = await parseFoodText(q.trim());
      if (!items.length) { toast("Couldn't estimate that — add a bit more detail."); return; }
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

  return (
    <SectionCard
      title="Food library"
      subtitle="Search any food or describe it — nutrition totals come in automatically"
      collapsibleId="wellflow-library"
      action={
        <Button size="sm" variant="ghost" className="gap-1.5"
                onClick={() => setEditing({ value: { name: "", serving_size: "", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } })}>
          <Plus className="h-4 w-4" /> New
        </Button>
      }
    >
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") void runSearch(); }}
          placeholder="Greek yogurt, or “2 eggs and toast with butter”"
          aria-label="Search or describe a food"
        />
        <Button variant="secondary" size="icon" aria-label="Search foods" onClick={runSearch} disabled={busy !== null}>
          {busy === "search" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        <Button variant="secondary" size="icon" aria-label="Estimate from description" onClick={describe} disabled={busy !== null}>
          {busy === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </Button>
        <Button variant="secondary" size="icon" aria-label="Scan a barcode" onClick={scan} disabled={busy !== null}>
          {busy === "scan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        </Button>

      </div>

      {results.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Results</p>
          <ul className="space-y-1.5">
            {results.map(c => (
              <li key={c.id} className="rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.servingSize || "1 serving"} · {Math.round(c.calories)} cal • {Math.round(c.protein)}g P • {Math.round(c.carbs)}g C • {Math.round(c.fat)}g F
                </p>
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

              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">My foods</p>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing saved yet. Search, describe, or add a food by hand.</p>
        ) : (
          <ul className="space-y-1.5">
            {mine.map((f: SavedFood) => (
              <li key={f.id} className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
                <button type="button" aria-label={f.favorite ? "Unfavorite" : "Favorite"}
                        onClick={() => toggleFavoriteFood(f.id, !f.favorite)}>
                  <Star className={cn("h-4 w-4", f.favorite ? "fill-accent text-accent" : "text-muted-foreground")} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {f.serving_size || "1 serving"} · {Math.round(f.calories)} cal • {Math.round(f.protein)}g P • {Math.round(f.carbs)}g C • {Math.round(f.fat)}g F
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => logNow(savedToCandidate(f))}>Log</Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Details for ${f.name}`}
                        onClick={() => setDetails(savedToCandidate(f))}>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Edit ${f.name}`}
                        onClick={() => setEditing({ value: toEditable(savedToCandidate(f)), savedId: f.id })}>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>

                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Remove ${f.name}`}
                        onClick={async () => { await deleteSavedFood(f.id); toast.success("Removed"); }}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
