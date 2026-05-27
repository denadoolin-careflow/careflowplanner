import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Droplets, Wind, Flower2, Sparkles, Sun, Moon, Trash2 } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

const BREATH_PRACTICES = [
  { key: "box", label: "Box breath", duration: 5, desc: "4-4-4-4 · settling" },
  { key: "478", label: "4-7-8", duration: 5, desc: "Inhale 4, hold 7, exhale 8 · soothing" },
  { key: "physio", label: "Physiological sigh", duration: 3, desc: "Double inhale, long exhale · reset" },
  { key: "ocean", label: "Ocean breath", duration: 8, desc: "Slow ujjayi · grounding" },
];

const RITUALS = [
  { key: "tea", label: "Warm tea", icon: "🫖" },
  { key: "stretch", label: "Stretch", icon: "🌿" },
  { key: "sunlight", label: "Sunlight", icon: "☀️" },
  { key: "cold_water", label: "Cold water", icon: "💧" },
  { key: "magnesium", label: "Magnesium", icon: "🌙" },
  { key: "walk", label: "Mindful walk", icon: "🍃" },
];

type Ritual = { id: string; date: string; ritual_type: string; amount: number | null; duration_minutes: number | null };

export default function WellnessPage({ uid }: { uid: string }) {
  const [rows, setRows] = useState<Ritual[]>([]);
  const [waterGoal] = useState(8);
  const [breathNotes, setBreathNotes] = useState("");

  async function load() {
    const since = new Date(); since.setDate(since.getDate() - 7);
    const { data } = await supabase
      .from("wellness_rituals")
      .select("*")
      .eq("user_id", uid)
      .gte("date", since.toISOString().slice(0, 10))
      .order("created_at", { ascending: false });
    setRows((data as Ritual[]) ?? []);
  }
  useEffect(() => { load(); }, [uid]);

  const todayRows = rows.filter(r => r.date === today());
  const waterCups = todayRows.filter(r => r.ritual_type === "water").reduce((s, r) => s + (r.amount || 1), 0);
  const breathMin = todayRows.filter(r => r.ritual_type.startsWith("breath_")).reduce((s, r) => s + (r.duration_minutes || 0), 0);
  const ritualsToday = todayRows.filter(r => RITUALS.some(x => x.key === r.ritual_type)).map(r => r.ritual_type);

  async function addWater() {
    const { error } = await supabase.from("wellness_rituals").insert({ user_id: uid, date: today(), ritual_type: "water", amount: 1 });
    if (error) return toast.error(error.message);
    load();
  }
  async function removeWater() {
    const last = todayRows.find(r => r.ritual_type === "water");
    if (!last) return;
    await supabase.from("wellness_rituals").delete().eq("id", last.id);
    load();
  }
  async function logBreath(key: string, duration: number) {
    const { error } = await supabase.from("wellness_rituals").insert({
      user_id: uid, date: today(), ritual_type: `breath_${key}`, duration_minutes: duration, notes: breathNotes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Breath honored 🌬");
    setBreathNotes("");
    load();
  }
  async function toggleRitual(key: string) {
    const existing = todayRows.find(r => r.ritual_type === key);
    if (existing) {
      await supabase.from("wellness_rituals").delete().eq("id", existing.id);
    } else {
      await supabase.from("wellness_rituals").insert({ user_id: uid, date: today(), ritual_type: key });
    }
    load();
  }

  const weekTotalWater = useMemo(() => {
    const days: { date: string; cups: number; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const cups = rows.filter(r => r.date === ds && r.ritual_type === "water").reduce((s, r) => s + (r.amount || 1), 0);
      days.push({ date: ds, cups, label: d.toLocaleDateString(undefined, { weekday: "narrow" }) });
    }
    return days;
  }, [rows]);

  const waterPct = Math.min(100, (waterCups / waterGoal) * 100);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div
        className="cozy-card p-6"
        style={{ background: "linear-gradient(160deg, hsl(195 40% 94%) 0%, hsl(145 32% 95%) 100%)" }}
      >
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card/70">
            <Flower2 className="h-5 w-5 text-primary/70" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Small rituals, regulated body</p>
            <h2 className="font-display text-3xl">Wellness</h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Hydration, breath, and tiny practices that tell your nervous system: <em>you're safe</em>.
            </p>
          </div>
        </div>
      </div>

      {/* Hydration ring */}
      <div className="cozy-card p-6">
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-primary/70" />
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Hydration today</p>
            </div>
            <p className="mt-2 font-display text-4xl">{waterCups}<span className="ml-1 text-base text-muted-foreground">/ {waterGoal} cups</span></p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={removeWater} disabled={waterCups === 0}>–</Button>
              <Button size="sm" onClick={addWater}>+ one cup</Button>
            </div>
          </div>
          <div className="relative h-32 w-32">
            <svg viewBox="0 0 100 100" className="-rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeDasharray={`${(waterPct / 100) * 264} 264`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-display text-2xl">{Math.round(waterPct)}%</span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">This week</p>
          <div className="flex items-end gap-2 h-16">
            {weekTotalWater.map(d => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-primary/60"
                    style={{ height: `${Math.min(100, (d.cups / waterGoal) * 100)}%`, minHeight: d.cups > 0 ? 3 : 0 }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breathwork */}
      <div className="cozy-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-primary/70" />
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Breath practices</p>
          </div>
          <p className="text-xs text-muted-foreground">{breathMin} min today</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {BREATH_PRACTICES.map(p => (
            <div key={p.key} className="rounded-2xl border border-border/40 bg-card/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => logBreath(p.key, p.duration)}>
                  +{p.duration}m
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Textarea
          className="mt-3 bg-card/60"
          rows={2}
          placeholder="Optional note for your next breath log…"
          value={breathNotes}
          onChange={e => setBreathNotes(e.target.value)}
        />
      </div>

      {/* Tiny rituals */}
      <div className="cozy-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary/70" />
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Tiny rituals today</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {RITUALS.map(r => {
            const on = ritualsToday.includes(r.key);
            return (
              <button
                key={r.key}
                onClick={() => toggleRitual(r.key)}
                className={`flex items-center gap-2 rounded-2xl border p-3 text-sm transition-all ${
                  on ? "border-primary bg-primary/10" : "border-border/50 bg-card/60 hover:border-primary/40"
                }`}
              >
                <span className="text-xl">{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent rituals */}
      <div className="cozy-card p-5">
        <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Last 7 days</p>
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Tend your first ritual today.</p>
        ) : (
          <ul className="space-y-1.5">
            {rows.slice(0, 14).map(r => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                <span className="w-20 text-xs text-muted-foreground">{r.date.slice(5)}</span>
                <span className="flex-1 capitalize">{r.ritual_type.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">
                  {r.amount ? `${r.amount}× ` : ""}{r.duration_minutes ? `${r.duration_minutes}m` : ""}
                </span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await supabase.from("wellness_rituals").delete().eq("id", r.id); load(); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}