import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Apple, Sun, Coffee, UtensilsCrossed, Cookie, Trash2, Heart } from "lucide-react";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";

const today = () => new Date().toISOString().slice(0, 10);

const SLOTS = [
  { key: "breakfast", label: "Breakfast", icon: Coffee, color: "hsl(40 60% 70%)" },
  { key: "lunch", label: "Lunch", icon: Sun, color: "hsl(20 60% 65%)" },
  { key: "dinner", label: "Dinner", icon: UtensilsCrossed, color: "hsl(280 30% 60%)" },
  { key: "snack", label: "Snack", icon: Cookie, color: "hsl(145 35% 55%)" },
];

const PHASE_NOURISHMENT: Record<string, { title: string; foods: string[] }> = {
  menstrual: { title: "Warming, mineral-rich", foods: ["bone broth", "dark leafy greens", "beets", "berries", "warm stews", "iron-rich foods", "ginger tea"] },
  follicular: { title: "Fresh, sprouted, energizing", foods: ["sprouts", "leafy greens", "citrus", "seeds", "fermented foods", "light grains", "eggs"] },
  ovulatory: { title: "Cooling, raw, vibrant", foods: ["salads", "fresh fruits", "coconut", "quinoa", "lean proteins", "berries", "cucumber"] },
  luteal: { title: "Grounding, magnesium-rich", foods: ["sweet potato", "pumpkin", "dark chocolate", "leafy greens", "nuts", "warming spices", "B6 foods"] },
};

type Meal = { id: string; date: string; slot: string; name: string; notes: string | null; tags: string[] };

export default function NourishmentPage({ uid }: { uid: string }) {
  const { periods, settings } = useCycle();
  const phase = getPhaseInfo(new Date(), periods, settings)?.phase ?? null;
  const nourishment = phase ? PHASE_NOURISHMENT[phase] : null;

  const [meals, setMeals] = useState<Meal[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from("meals").select("*")
      .eq("user_id", uid).eq("date", today()).order("slot");
    setMeals((data as Meal[]) ?? []);
  }
  useEffect(() => { load(); }, [uid]);

  async function addMeal(slot: string) {
    const name = (drafts[slot] || "").trim();
    if (!name) return;
    const { error } = await supabase.from("meals").insert({
      user_id: uid, date: today(), slot, name,
    });
    if (error) return toast.error(error.message);
    setDrafts(d => ({ ...d, [slot]: "" }));
    load();
  }
  async function del(id: string) { await supabase.from("meals").delete().eq("id", id); load(); }

  const bySlot = useMemo(() => {
    const m: Record<string, Meal[]> = {};
    for (const s of SLOTS) m[s.key] = [];
    for (const meal of meals) (m[meal.slot] ??= []).push(meal);
    return m;
  }, [meals]);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div
        className="cozy-card p-6"
        style={{ background: "linear-gradient(160deg, hsl(35 50% 94%) 0%, hsl(145 32% 95%) 100%)" }}
      >
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card/70">
            <Apple className="h-5 w-5 text-primary/70" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Body-neutral · no calorie counting</p>
            <h2 className="font-display text-3xl">Nourishment</h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Track what you ate so you can notice how it felt — not to earn or punish.
            </p>
          </div>
        </div>
      </div>

      {/* Phase-aware nourishment guidance */}
      {nourishment && (
        <div className="cozy-card p-5">
          <div className="mb-2 flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary/70" />
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              For your {phase} phase · {nourishment.title}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {nourishment.foods.map(f => (
              <span key={f} className="rounded-full border border-border/50 bg-card/60 px-3 py-1.5 text-sm capitalize">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Today's meals by slot */}
      <div className="grid gap-4 md:grid-cols-2">
        {SLOTS.map(s => {
          const Icon = s.icon;
          const slotMeals = bySlot[s.key] ?? [];
          return (
            <div key={s.key} className="cozy-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: `${s.color}20`, color: s.color }}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-display text-lg">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{slotMeals.length} logged</p>
                </div>
              </div>

              <ul className="space-y-1.5">
                {slotMeals.length === 0 ? (
                  <li className="text-xs italic text-muted-foreground">Nothing logged yet.</li>
                ) : slotMeals.map(m => (
                  <li key={m.id} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                    <span className="flex-1">{m.name}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(m.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="What did you have?"
                  value={drafts[s.key] ?? ""}
                  onChange={e => setDrafts(d => ({ ...d, [s.key]: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") addMeal(s.key); }}
                  className="bg-card/60"
                />
                <Button size="sm" onClick={() => addMeal(s.key)}>Add</Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        For meal planning, themes, and the full Meals Library, visit the Meals tab.
      </p>
    </div>
  );
}