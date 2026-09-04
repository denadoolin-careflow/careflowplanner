/**
 * Compact inline food logger used inside the food calendar's day sheet.
 * Type, pick a match, adjust servings, save — without leaving the day.
 * Estimates you can edit; never medical or dietary advice.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { logFood, searchFoods, searchFoodsLocal } from "@/lib/wellflow/data";
import { MEAL_TYPES, type FoodCandidate, type MealType } from "@/lib/wellflow/types";

export function InlineAddFood({
  date, time, defaultMeal, label, className, onMore, onLogged,
}: {
  date: string;
  /** "HH:MM" for the section, or null to leave the entry untimed. */
  time: string | null;
  defaultMeal: MealType;
  label: string;
  className?: string;
  onMore?: () => void;
  onLogged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<FoodCandidate | null>(null);
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [saving, setSaving] = useState(false);
  const token = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setMeal(defaultMeal); }, [defaultMeal]);

  // Catalog matches show immediately; remote results replace them when ready.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); setBusy(false); return; }
    setResults(searchFoodsLocal(q, 8));
    const mine = ++token.current;
    setBusy(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await searchFoods(q);
        if (token.current === mine) setResults(r.slice(0, 12));
      } catch {
        /* catalog results stay on screen */
      } finally {
        if (token.current === mine) setBusy(false);
      }
    }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  const reset = () => {
    setQuery(""); setResults([]); setSelected(null); setServings(1); setOpen(false);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await logFood({
        date,
        candidate: selected,
        servings: Math.max(servings, 0.1),
        mealType: meal,
        time,
      });
      toast.success("Logged");
      reset();
      onLogged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not log that");
    } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          size="sm" variant="ghost"
          className="h-9 flex-1 justify-start gap-1.5 rounded-xl border border-dashed border-border/60 px-3 text-xs text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> {label}
        </Button>
        {onMore && (
          <Button size="sm" variant="ghost" className="h-9 gap-1 px-2 text-xs"
                  onClick={onMore} aria-label="More logging options">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card/60 p-2.5", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search foods and ingredients"
            aria-label={label}
            className="h-10 pl-8 text-sm"
          />
        </div>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />}
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={reset} aria-label="Cancel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!selected && results.length > 0 && (
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
          {results.map(r => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => { setSelected(r); setServings(r.servings ?? 1); }}
                className="w-full rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
              >
                <p className="truncate text-sm font-medium">
                  {r.name}{r.brand ? <span className="text-muted-foreground"> · {r.brand}</span> : null}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {r.servingSize ?? "1 serving"} • {Math.round(r.calories)} cal • {Math.round(r.protein)}g P
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!selected && !busy && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          No matches yet — try a simpler word, or use more options for a plain-language estimate.
        </p>
      )}

      {selected && (
        <div className="mt-2 space-y-2">
          <p className="truncate text-sm font-medium">{selected.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Servings
              <Input
                type="number" min={0.1} step={0.1} inputMode="decimal"
                value={servings}
                onChange={e => setServings(Number(e.target.value) || 1)}
                aria-label="Servings"
                className="h-9 w-20 text-sm"
              />
            </label>
            <select
              value={meal} onChange={e => setMeal(e.target.value as MealType)}
              aria-label="Meal"
              className="h-9 rounded-lg border border-border/60 bg-background px-2 text-xs capitalize"
            >
              {MEAL_TYPES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <span className="text-xs tabular-nums text-muted-foreground">
              {Math.round(selected.calories * servings)} cal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-9" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Log it"}
            </Button>
            <Button size="sm" variant="ghost" className="h-9 text-xs"
                    onClick={() => setSelected(null)}>
              Back
            </Button>
            {onMore && (
              <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={onMore}>
                More options
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
