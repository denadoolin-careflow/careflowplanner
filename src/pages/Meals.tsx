import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { startOfWeek, addDays, format, parseISO, isSameDay } from "date-fns";
import { Sparkles, Settings2, RotateCcw, BookOpen, Wand2, ChevronDown, ChevronLeft, ChevronRight, Library as LibraryIcon, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { planWeek, fillWeekFromFavorites } from "@/lib/meal-ai";
import { MealPrefsDialog } from "@/components/meals/MealPrefsDialog";
import { RecipeDrawer } from "@/components/meals/RecipeDrawer";
import { PantryPanel } from "@/components/meals/PantryPanel";
import { FavoritesPanel } from "@/components/meals/FavoritesPanel";
import { GroceryKanban } from "@/components/meals/GroceryKanban";
import { MealCell } from "@/components/meals/MealCell";
import { LibrarySidebar } from "@/components/meals/LibrarySidebar";
import { calendarPanelOptions } from "@/components/meals/CalendarDropPanel";
import { addLibraryMealsToWeek } from "@/lib/meals-library";
import { applyThemeToDate, useMealThemes } from "@/lib/meal-themes";
import type { Meal } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ViewMode = "week" | "two" | "day";
const VIEW_KEY = "meals.viewMode";
const FOCUS_KEY = "meals.focusedDate";

export default function Meals() {
  const { state, user, addMeal, updateMeal, reloadAll } = useStore();
  const { items: themes } = useMealThemes();
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const s = localStorage.getItem("meals.weekStart");
    const base = s ? parseISO(s) : new Date();
    return startOfWeek(base, { weekStartsOn: 1 });
  });
  const start = weekStart;
  useEffect(() => {
    localStorage.setItem("meals.weekStart", weekStart.toISOString().slice(0, 10));
  }, [weekStart]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const slots = ["Breakfast","Lunch","Dinner","Snack"] as const;
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [activeMeal, setActiveMeal] = useState<Meal | null>(null);
  const [planning, setPlanning] = useState(false);
  const [filling, setFilling] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem(VIEW_KEY) as ViewMode) || "week");
  const [focusedDate, setFocusedDate] = useState<Date>(() => {
    const s = localStorage.getItem(FOCUS_KEY);
    return s ? parseISO(s) : new Date();
  });
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => { localStorage.setItem(VIEW_KEY, viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem(FOCUS_KEY, focusedDate.toISOString().slice(0, 10)); }, [focusedDate]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (viewMode === "week") return;
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") setFocusedDate(d => addDays(d, -1));
      if (e.key === "ArrowRight") setFocusedDate(d => addDays(d, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewMode]);

  const onPlanWeek = async (mode?: string) => {
    setPlanning(true);
    try {
      const startISO = start.toISOString().slice(0, 10);
      const { data, error } = await supabase.functions.invoke("ai-meal-plan", {
        body: { action: "plan_week", start_date: startISO, replace: true, mode: mode ?? null },
      });
      if (error) throw error;
      await reloadAll();
      toast.success(`Planned ${data.meals} meals · added ${data.grocery} grocery items.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't plan the week");
    } finally { setPlanning(false); setSuggesting(false); }
  };

  const onFillFromFavorites = async () => {
    if (!user?.id) return;
    setFilling(true);
    try {
      const startISO = start.toISOString().slice(0, 10);
      const res = await fillWeekFromFavorites(user.id, startISO, { onlyEmpty: true, addGroceries: true });
      await reloadAll();
      if (res.filled === 0) toast.info("No favorites yet — add a recipe first.");
      else toast.success(`Filled ${res.filled} slots from favorites.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't fill from favorites");
    } finally { setFilling(false); }
  };

  const onResetWeek = async (thenGenerate: boolean) => {
    setResetting(true);
    try {
      const startISO = start.toISOString().slice(0, 10);
      const endISO = addDays(start, 6).toISOString().slice(0, 10);
      const weekMeals = state.meals.filter(m => m.date >= startISO && m.date <= endISO);
      const mealIds = weekMeals.map(m => m.id);
      if (mealIds.length) {
        await supabase.from("grocery_items").delete().in("source_meal_id", mealIds);
        await supabase.from("meals").delete().in("id", mealIds);
      }
      await reloadAll();
      toast.success("Meal plan cleared.");
      setResetOpen(false);
      if (thenGenerate) await onPlanWeek();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't reset");
    } finally { setResetting(false); }
  };

  const onCreate = async (date: string, slot: Meal["slot"], data: any) => {
    if (!user?.id) return;
    const { data: inserted } = await supabase.from("meals").insert({
      user_id: user.id, date, slot, name: data.name,
      prep_minutes: data.prep_minutes ?? null,
      ingredients: data.ingredients ?? [],
      steps: data.steps ?? [],
      tags: data.tags ?? [],
    }).select().single();
    await reloadAll();
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const overData = e.over?.data.current as
      | { date?: string; slot?: string; calendarDate?: string; calendarSlot?: string }
      | undefined;
    if (!overData) return;

    // Calendar drop (from sidebar calendar panel)
    const calDate = overData.calendarDate;
    const calSlot = overData.calendarSlot as Meal["slot"] | undefined;
    const themeId = e.active.data.current?.themeId as string | undefined;
    const libIdActive = e.active.data.current?.libraryMealId as string | undefined;

    // THEME drop → apply to grid slot or calendar date
    if (themeId) {
      const theme = themes.find(t => t.id === themeId);
      if (!theme) return;
      if (!theme.meal_ids.length) { toast.info(`Add recipes to "${theme.name}" first.`); return; }
      const date = calDate ?? overData.date;
      const slot = (calSlot ?? overData.slot) as Meal["slot"] | undefined;
      if (!date) return;
      const opts = { mode: (calendarPanelOptions.getReplace() ? "replace" : "fill_empty") as "replace" | "fill_empty",
                     addGroceries: calendarPanelOptions.getAddGroceries() };
      const r = await applyThemeToDate(theme, date, slot, opts);
      await reloadAll();
      if (r.inserted === 0) toast.info("Slot taken — toggle Replace in the sidebar.");
      else toast.success(`${theme.emoji ?? "🍽️"} ${theme.name} → ${r.meal?.title ?? ""}`, {
        description: `${slot ?? r.meal?.slot ?? "Dinner"} · ${format(parseISO(date), "EEE MMM d")}`,
      });
      return;
    }

    // LIBRARY drop on calendar (date or slot chip)
    if (libIdActive && calDate) {
      const { data: lib } = await supabase.from("meals_library").select("*").eq("id", libIdActive).maybeSingle();
      if (!lib) return;
      const slot = (calSlot ?? (lib.slot as Meal["slot"]) ?? "Dinner") as "Breakfast" | "Lunch" | "Dinner" | "Snack";
      const opts = { mode: (calendarPanelOptions.getReplace() ? "replace" : "fill_empty") as "replace" | "fill_empty",
                     addGroceries: calendarPanelOptions.getAddGroceries() };
      const r = await addLibraryMealsToWeek([lib as any], [{ date: calDate, slot }], opts);
      await reloadAll();
      if (r.inserted === 0) toast.info("Slot taken — toggle Replace in the sidebar.");
      else toast.success(`Added ${lib.title}`, {
        description: `${slot} · ${format(parseISO(calDate), "EEE MMM d")}${r.grocery ? ` · ${r.grocery} grocery items` : ""}`,
      });
      return;
    }

    const target = { date: overData.date, slot: overData.slot };
    if (!target.date || !target.slot) return;

    // Drag from library sidebar → insert new meal
    const libId = e.active.data.current?.libraryMealId as string | undefined;
    if (libId) {
      try {
        const { data: lib } = await supabase.from("meals_library").select("*").eq("id", libId).maybeSingle();
        if (!lib || !user?.id) return;
        const occupant = state.meals.find(m => m.date === target.date && m.slot === target.slot);
        // Snapshot occupant for undo
        const snapshot = occupant ? { ...occupant } : null;
        if (occupant) {
          await supabase.from("grocery_items").delete().eq("source_meal_id", occupant.id);
          await supabase.from("meals").delete().eq("id", occupant.id);
        }
        const { data: inserted } = await supabase.from("meals").insert({
          user_id: user.id, date: target.date, slot: target.slot,
          name: lib.title,
          prep_minutes: lib.prep_minutes ?? null,
          ingredients: lib.ingredients ?? [],
          steps: lib.steps ?? [],
          tags: lib.tags ?? [],
        }).select().single();
        await reloadAll();
        if (snapshot) {
          toast.success(`Replaced ${snapshot.name} with ${lib.title}`, {
            description: `${target.slot} · ${format(parseISO(target.date), "EEE MMM d")}`,
            action: {
              label: "Undo",
              onClick: async () => {
                if (inserted?.id) await supabase.from("meals").delete().eq("id", inserted.id);
                await supabase.from("meals").insert({
                  user_id: user.id, date: snapshot.date, slot: snapshot.slot,
                  name: snapshot.name, prep_minutes: snapshot.prepMinutes ?? null,
                  ingredients: snapshot.ingredients ?? [], steps: snapshot.steps ?? [],
                  tags: snapshot.tags ?? [],
                });
                await reloadAll();
                toast.message(`Restored ${snapshot.name}`);
              },
            },
          });
        } else {
          toast.success(`Added ${lib.title}`, {
            description: `${target.slot} · ${format(parseISO(target.date), "EEE MMM d")}`,
            action: inserted?.id ? {
              label: "Undo",
              onClick: async () => {
                await supabase.from("meals").delete().eq("id", inserted.id);
                await reloadAll();
              },
            } : undefined,
          });
        }
      } catch (err: any) {
        toast.error(err?.message ?? "Couldn't add");
      }
      return;
    }

    // Existing meal-to-slot drag
    const id = e.active.data.current?.mealId as string | undefined;
    if (!id || !target?.date || !target?.slot) return;
    const meal = state.meals.find(m => m.id === id);
    if (!meal) return;
    if (meal.date === target.date && meal.slot === target.slot) return;
    const occupant = state.meals.find(m => m.date === target.date && m.slot === target.slot);
    const fromDate = meal.date, fromSlot = meal.slot;
    if (occupant) {
      await updateMeal(occupant.id, { date: meal.date, slot: meal.slot });
    }
    await updateMeal(id, { date: target.date, slot: target.slot as Meal["slot"] });
    const whenLabel = `${target.slot} · ${format(parseISO(target.date), "EEE MMM d")}`;
    toast.success(
      occupant ? `Swapped ${meal.name} ↔ ${occupant.name}` : `Moved ${meal.name} to ${whenLabel}`,
      {
        description: occupant ? whenLabel : undefined,
        action: {
          label: "Undo",
          onClick: async () => {
            await updateMeal(id, { date: fromDate, slot: fromSlot });
            if (occupant) await updateMeal(occupant.id, { date: target.date!, slot: target.slot as Meal["slot"] });
          },
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-warm flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold">Meals this week</h2>
          <p className="mt-1 text-sm text-muted-foreground">Drag to rearrange · click to edit · pick from your library.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" asChild>
            <Link to="/meals/library"><BookOpen className="mr-2 h-4 w-4" />Library</Link>
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => setPrefsOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />Preferences
          </Button>
          <Button variant="outline" className="rounded-full" onClick={onFillFromFavorites} disabled={filling}>
            {filling ? "Filling…" : "Fill from favorites"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-full" disabled={suggesting || planning}>
                <Wand2 className={`mr-2 h-4 w-4 ${suggesting ? "animate-pulse" : ""}`} />Suggest <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => { setSuggesting(true); onPlanWeek("use_pantry"); }}>Use ingredients in stock</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSuggesting(true); onPlanWeek("low_budget"); }}>Low-budget meals</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSuggesting(true); onPlanWeek("sensory_safe"); }}>Sensory-safe meals</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSuggesting(true); onPlanWeek("low_energy"); }}>Low-energy meals</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="rounded-full">
                <RotateCcw className="mr-2 h-4 w-4" /> Reset meal plan
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove all meals from this week?</AlertDialogTitle>
                <AlertDialogDescription>
                  Clears planned meals and removes the grocery items linked to them. Your saved recipes and library stay safe.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep them</AlertDialogCancel>
                <Button variant="outline" onClick={() => onResetWeek(false)} disabled={resetting}>Just clear</Button>
                <AlertDialogAction onClick={() => onResetWeek(true)} disabled={resetting}>
                  Clear & generate new
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => onPlanWeek()} disabled={planning} className="rounded-full">
            <Sparkles className={`mr-2 h-4 w-4 ${planning ? "animate-pulse" : ""}`} />
            {planning ? "Planning…" : "Plan my week"}
          </Button>
        </div>
      </div>

      <SectionCard
        title="Weekly meal plan"
        accent="warm"
        action={
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full"
              onClick={() => setWeekStart(d => addDays(d, -7))}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs">
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={weekStart}
                  onSelect={(d) => d && setWeekStart(startOfWeek(d, { weekStartsOn: 1 }))}
                  initialFocus
                  weekStartsOn={1}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full"
              onClick={() => setWeekStart(d => addDays(d, 7))}
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full px-2 text-xs"
                onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              >
                This week
              </Button>
            )}
          </div>
        }
      >
        <DndContext onDragEnd={onDragEnd}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-full border border-border/60 bg-background/40 p-0.5 text-xs">
              {(["week", "two", "day"] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`rounded-full px-3 py-1 transition ${viewMode === v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {v === "week" ? "Week" : v === "two" ? "2 days" : "Day"}
                </button>
              ))}
            </div>
            {viewMode !== "week" && (
              <div className="flex items-center gap-1 text-xs">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setFocusedDate(d => addDays(d, -1))}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <span className="rounded-full bg-muted/40 px-3 py-1 font-medium">
                  {viewMode === "two"
                    ? `${format(focusedDate, "EEE d")} – ${format(addDays(focusedDate, 1), "EEE d")}`
                    : format(focusedDate, "EEEE, MMM d")}
                </span>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setFocusedDate(d => addDays(d, 1))}><ChevronRight className="h-3.5 w-3.5" /></Button>
                {!isSameDay(focusedDate, new Date()) && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setFocusedDate(new Date())}>Today</Button>
                )}
              </div>
            )}
            <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => setLibraryOpen(true)}>
              <LibraryIcon className="mr-1 h-3.5 w-3.5" />Library
            </Button>
          </div>

          {viewMode === "week" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="p-2"></th>
                    {days.map(d => <th key={d.toISOString()} className="p-2">{format(d, "EEE d")}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {slots.map(s => (
                    <tr key={s} className="border-t border-border/60">
                      <td className="p-2 text-xs uppercase text-muted-foreground">{s}</td>
                      {days.map(d => {
                        const date = d.toISOString().slice(0,10);
                        const m = state.meals.find(x => x.date === date && x.slot === s) ?? null;
                        return (
                          <td key={d.toISOString()} className="p-1 align-top">
                            <MealCell meal={m} date={date} slot={s} onOpen={setActiveMeal}
                              onCreate={(data) => onCreate(date, s, data)}
                              onRename={(id, name) => updateMeal(id, { name })} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewMode !== "week" && (
            <div className={`grid gap-3 ${viewMode === "two" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
              {(viewMode === "two" ? [focusedDate, addDays(focusedDate, 1)] : [focusedDate]).map(d => {
                const date = d.toISOString().slice(0, 10);
                return (
                  <div key={date} className="rounded-2xl border border-border/60 bg-card/30 p-3">
                    <div className="mb-2 flex items-baseline justify-between">
                      <h3 className="font-display text-lg">{format(d, "EEEE")}</h3>
                      <span className="text-xs text-muted-foreground">{format(d, "MMM d")}</span>
                    </div>
                    <div className="space-y-2">
                      {slots.map(s => {
                        const m = state.meals.find(x => x.date === date && x.slot === s) ?? null;
                        return (
                          <div key={s} className="rounded-lg bg-background/40 p-2">
                            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{s}</div>
                            <MealCell meal={m} date={date} slot={s} onOpen={setActiveMeal}
                              onCreate={(data) => onCreate(date, s, data)}
                              onRename={(id, name) => updateMeal(id, { name })} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <LibrarySidebar open={libraryOpen} onOpenChange={setLibraryOpen} />
        </DndContext>
      </SectionCard>

      <SectionCard title="Grocery list" subtitle="Kanban — drag between categories" accent="sage">
        <GroceryKanban />
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SectionCard title="Saved favorites" accent="warm">
          <FavoritesPanel />
        </SectionCard>
        <SectionCard title="Pantry staples" subtitle="Skipped from grocery generation" accent="sage">
          <PantryPanel />
        </SectionCard>
      </div>

      <MealPrefsDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
      <RecipeDrawer meal={activeMeal} onClose={() => setActiveMeal(null)} onChanged={reloadAll} />
    </div>
  );
}
