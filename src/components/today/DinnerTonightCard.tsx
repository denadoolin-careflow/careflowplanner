/**
 * "What's for dinner" — tonight's dinner at a glance, who it's for and when,
 * gentle suggestions when nothing is planned, and a per-person "served"
 * toggle so the card can say when everyone's been fed.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Clock3, Pencil, Plus, Sparkles, UsersRound, UtensilsCrossed } from "lucide-react";
import { DashCard, EmptyLine } from "@/components/today/dashboard/DashCard";
import { MealPickerPopover } from "@/components/meals/MealPickerPopover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PersonAvatar } from "@/components/people/PersonPicker";
import { AddPersonPopover } from "@/components/people/AddPersonPopover";
import { usePeopleDirectory } from "@/lib/people-directory";
import { useMealPeople, linkMealPerson, unlinkMealPerson, setMealServeTime, setMealPersonServed } from "@/lib/meal-people";
import { useMealsLibrary } from "@/lib/meals-library";
import { useTodayCarePeople } from "@/lib/today-care-people";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

const SLOTS = ["Breakfast", "Lunch", "Dinner"] as const;

export function DinnerTonightCard({ date, className }: { date: Date; className?: string }) {
  const { state, addMeal, updateMeal } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const people = usePeopleDirectory();
  const { items: library } = useMealsLibrary();
  const { selectedIds: careIds } = useTodayCarePeople();
  const [slot, setSlot] = useState<(typeof SLOTS)[number]>("Dinner");
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);

  const todaysMeals = useMemo(() => state.meals.filter(m => m.date === iso), [state.meals, iso]);
  const mealIds = useMemo(() => todaysMeals.map(m => m.id), [todaysMeals]);
  const { links } = useMealPeople(mealIds);

  const meal = todaysMeals.find(m => m.slot === slot);
  const mealLinks = meal ? links.filter(l => l.mealId === meal.id) : [];
  const serveTime = mealLinks.find(l => l.serveTime)?.serveTime;
  const servedCount = mealLinks.filter(l => l.servedAt).length;
  const allServed = mealLinks.length > 0 && servedCount === mealLinks.length;

  // Today's chosen care people — suggestions and auto-linking aim at them.
  const carePeople = useMemo(
    () => people.filter(p => careIds.includes(p.id)),
    [people, careIds],
  );

  const suggestions = useMemo(() => {
    if (meal) return [];
    return library
      .filter(l => !l.is_archived && (!l.slot || l.slot === slot))
      .sort((a, b) => Number(b.is_favorite ?? false) - Number(a.is_favorite ?? false))
      .slice(0, 3);
  }, [library, meal, slot]);

  // When a suggestion creates the meal, link today's care people to it.
  const autoLinkRef = useRef(false);
  useEffect(() => {
    if (!meal || !autoLinkRef.current) return;
    if (carePeople.length === 0) { autoLinkRef.current = false; return; }
    autoLinkRef.current = false;
    for (const p of carePeople) {
      void linkMealPerson({ mealId: meal.id, personId: p.id, personKind: p.kind }).catch(() => { /* best-effort */ });
    }
  }, [meal, carePeople]);

  const fedIds = new Set(links.map(l => l.personId));
  const unfed = people.filter(p => !fedIds.has(p.id));

  const save = async () => {
    const name = draft.trim();
    setDraft("");
    setTyping(false);
    if (!name) return;
    if (meal) await updateMeal(meal.id, { name });
    else { autoLinkRef.current = true; await addMeal({ name, date: iso, slot }); }
    haptics.success?.();
  };

  const pick = (picked: { name: string; prep_minutes?: number | null; ingredients?: string[]; steps?: string[]; tags?: string[] }) => {
    const patch = {
      name: picked.name,
      prepMinutes: picked.prep_minutes ?? undefined,
      ingredients: picked.ingredients,
      steps: picked.steps,
      tags: picked.tags,
    };
    if (meal) void updateMeal(meal.id, patch);
    else { autoLinkRef.current = true; void addMeal({ ...patch, date: iso, slot }); }
    haptics.tap?.();
  };

  const togglePerson = async (id: string, kind: "recipient" | "loved_one") => {
    if (!meal) return;
    if (mealLinks.some(l => l.personId === id)) await unlinkMealPerson(meal.id, id);
    else await linkMealPerson({ mealId: meal.id, personId: id, personKind: kind, serveTime: serveTime ?? null });
    haptics.tap?.();
  };

  const toggleServed = async (personId: string, served: boolean) => {
    if (!meal) return;
    if (served) haptics.success?.(); else haptics.tap?.();
    try { await setMealPersonServed(meal.id, personId, served); } catch { /* best-effort */ }
  };

  return (
    <DashCard
      eyebrow="Nourish"
      title="What's for dinner"
      className={className}
      action={
        <div className="flex items-center gap-2">
          {allServed && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10.5px] text-primary">
              <Check className="h-3 w-3" aria-hidden /> Served
            </span>
          )}
          <Link to="/meals" className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground">
            Meals <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      }
      footer={
        unfed.length > 0 ? (
          <p className="text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
            No meal linked yet for {unfed.slice(0, 3).map(p => p.name).join(", ")}
            {unfed.length > 3 ? ` +${unfed.length - 3}` : ""}.
          </p>
        ) : undefined
      }
    >
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Meal slot">
          {SLOTS.map(s => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={slot === s}
              onClick={() => setSlot(s)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                slot === s ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {meal ? (
          <div className="flex items-start gap-2">
            <UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium leading-snug [overflow-wrap:anywhere]">{meal.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground">
                {meal.prepMinutes ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" aria-hidden /> {meal.prepMinutes} min prep
                  </span>
                ) : null}
                {mealLinks.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <UsersRound className="h-3 w-3" aria-hidden />
                    {servedCount} of {mealLinks.length} served{serveTime ? ` · ${serveTime}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyLine>Nothing planned for {slot.toLowerCase()} yet.</EmptyLine>
        )}

        {/* Per-person served toggles */}
        {meal && mealLinks.length > 0 && (
          <ul className="space-y-1" aria-label="Who's been served">
            {mealLinks.map(l => {
              const person = people.find(p => p.id === l.personId);
              const served = !!l.servedAt;
              return (
                <li key={l.personId} className="flex items-center gap-2 text-[12.5px]">
                  {person
                    ? <PersonAvatar person={person} className="h-4 w-4 text-[9px]" />
                    : <UsersRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
                  <span className={cn("min-w-0 flex-1 truncate", served && "text-muted-foreground")}>
                    {person?.name ?? "Someone"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleServed(l.personId, !served)}
                    aria-pressed={served}
                    aria-label={served ? `Mark ${person?.name ?? "person"} not served` : `Mark ${person?.name ?? "person"} served`}
                    className={cn(
                      "inline-flex min-h-[26px] shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] transition-all active:scale-95",
                      served
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <Check className="h-3 w-3" aria-hidden />
                    {served ? `Served ${format(new Date(l.servedAt!), "h:mm a")}` : "Mark served"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Gentle suggestions when nothing is planned */}
        {!meal && suggestions.length > 0 && (
          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              <Sparkles className="h-3 w-3" aria-hidden />
              Ideas{carePeople.length > 0 ? ` for ${carePeople.map(p => p.name).slice(0, 2).join(" & ")}` : ""}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick({ name: s.title, prep_minutes: s.prep_minutes, ingredients: s.ingredients, steps: s.steps, tags: s.tags })}
                  className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 text-[11.5px] transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="max-w-[10rem] truncate">{s.title}</span>
                  {s.prep_minutes ? <span className="shrink-0 text-[10px] text-muted-foreground">{s.prep_minutes}m</span> : null}
                </button>
              ))}
            </div>
          </div>
        )}

        {typing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") { setDraft(""); setTyping(false); }
            }}
            placeholder={`Type ${slot.toLowerCase()}…`}
            aria-label={`${slot} name`}
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-[12.5px] outline-none focus:border-primary/50"
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <MealPickerPopover
              slot={slot}
              onPick={pick}
              trigger={
                <button
                  type="button"
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-border/60 bg-background/60 px-3 text-[11.5px] hover:bg-muted"
                >
                  {meal ? <Pencil className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
                  {meal ? "Change" : "Pick a meal"}
                </button>
              }
            />
            <button
              type="button"
              onClick={() => { setDraft(meal?.name ?? ""); setTyping(true); }}
              className="inline-flex min-h-[32px] items-center text-[11.5px] text-muted-foreground hover:text-foreground"
            >
              Type it in
            </button>

            {meal && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Choose who this meal is for"
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-border/60 bg-background/60 px-3 text-[11.5px] hover:bg-muted"
                  >
                    <UsersRound className="h-3.5 w-3.5" aria-hidden /> Who &amp; when
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-60 space-y-2 p-2">
                  <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                    {people.map(p => {
                      const on = mealLinks.some(l => l.personId === p.id);
                      return (
                        <li key={`${p.kind}:${p.id}`}>
                          <button
                            type="button"
                            onClick={() => void togglePerson(p.id, p.kind)}
                            aria-pressed={on}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] hover:bg-muted",
                              on && "bg-primary/10 text-primary",
                            )}
                          >
                            <PersonAvatar person={p} className="h-4 w-4 text-[9px]" />
                            <span className="min-w-0 flex-1 truncate">{p.name}</span>
                          </button>
                        </li>
                      );
                    })}
                    {people.length === 0 && (
                      <li className="px-2 py-1.5 text-[11.5px] text-muted-foreground">No people yet.</li>
                    )}
                  </ul>
                  <label className="flex items-center justify-between gap-2 border-t border-border/50 pt-2 text-[12px]">
                    <span className="text-muted-foreground">Serve time</span>
                    <input
                      type="time"
                      value={serveTime ?? ""}
                      onChange={(e) => void setMealServeTime(meal.id, e.target.value || null)}
                      aria-label="Serve time"
                      className="rounded-lg border border-border/60 bg-background px-2 py-1 text-[12px]"
                    />
                  </label>
                  <AddPersonPopover label="Add person" />
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </div>
    </DashCard>
  );
}
