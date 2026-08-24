/**
 * "What's for dinner" — tonight's dinner at a glance, with one tap to pick
 * something from the meal library or type a name in.
 */
import { useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { ChevronRight, Clock3, Pencil, Plus, UtensilsCrossed } from "lucide-react";
import { DashCard, EmptyLine } from "@/components/today/dashboard/DashCard";
import { MealPickerPopover } from "@/components/meals/MealPickerPopover";
import { useStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";

export function DinnerTonightCard({ date, className }: { date: Date; className?: string }) {
  const { state, addMeal, updateMeal } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const dinner = state.meals.find(m => m.date === iso && m.slot === "Dinner");
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);

  const save = async () => {
    const name = draft.trim();
    setDraft("");
    setTyping(false);
    if (!name) return;
    if (dinner) await updateMeal(dinner.id, { name });
    else await addMeal({ name, date: iso, slot: "Dinner" });
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
    if (dinner) void updateMeal(dinner.id, patch);
    else void addMeal({ ...patch, date: iso, slot: "Dinner" });
    haptics.tap?.();
  };

  return (
    <DashCard
      eyebrow="Nourish"
      title="What's for dinner"
      className={className}
      action={
        <Link to="/meals" className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground">
          Meals <ChevronRight className="h-3 w-3" aria-hidden />
        </Link>
      }
    >
      <div className="space-y-2.5">
        {dinner ? (
          <div className="flex items-start gap-2">
            <UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium leading-snug [overflow-wrap:anywhere]">{dinner.name}</p>
              {dinner.prepMinutes ? (
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                  <Clock3 className="h-3 w-3" aria-hidden /> {dinner.prepMinutes} min prep
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <EmptyLine>Nothing planned for tonight yet.</EmptyLine>
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
            placeholder="Type tonight's dinner…"
            aria-label="Tonight's dinner"
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-[12.5px] outline-none focus:border-primary/50"
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <MealPickerPopover
              slot="Dinner"
              onPick={pick}
              trigger={
                <button
                  type="button"
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-border/60 bg-background/60 px-3 text-[11.5px] hover:bg-muted"
                >
                  {dinner ? <Pencil className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
                  {dinner ? "Change" : "Pick a meal"}
                </button>
              }
            />
            <button
              type="button"
              onClick={() => { setDraft(dinner?.name ?? ""); setTyping(true); }}
              className="inline-flex min-h-[32px] items-center text-[11.5px] text-muted-foreground hover:text-foreground"
            >
              Type it in
            </button>
          </div>
        )}
      </div>
    </DashCard>
  );
}
