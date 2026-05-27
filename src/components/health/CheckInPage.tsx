import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sun, Moon, Heart, Sparkles, Wind, Leaf } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

const MOODS = [
  { word: "radiant", emoji: "🌞", score: 5 },
  { word: "warm", emoji: "🌿", score: 4 },
  { word: "steady", emoji: "🍃", score: 3 },
  { word: "tender", emoji: "🌫", score: 2 },
  { word: "heavy", emoji: "🌑", score: 1 },
];

const STRESS = [
  { word: "calm", label: "Calm waters" },
  { word: "mild", label: "Small ripples" },
  { word: "tense", label: "Wound tight" },
  { word: "high", label: "Stormy" },
];

const NEEDS = ["rest", "movement", "nourishment", "connection", "solitude", "softness", "creativity", "fresh air"];

function StepDot({ active }: { active: boolean }) {
  return <span className={`h-1.5 rounded-full transition-all ${active ? "w-8 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />;
}

export default function CheckInPage({ uid }: { uid: string }) {
  const [step, setStep] = useState(0);
  const [row, setRow] = useState<any>({
    date: today(),
    sleep_hours: "",
    water_cups: "",
    mood: "",
    stress: "",
    meds_taken: false,
    mindfulness_minutes: "",
    notes: "",
    intention: "",
  });
  const [needs, setNeeds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("health_checkins")
      .select("*")
      .eq("user_id", uid)
      .eq("date", today())
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRow({
            ...data,
            sleep_hours: data.sleep_hours ?? "",
            water_cups: data.water_cups ?? "",
            mindfulness_minutes: data.mindfulness_minutes ?? "",
            intention: data.intention ?? "",
          });
        }
        setLoading(false);
      });
  }, [uid]);

  async function save() {
    const notesWithNeeds = needs.length
      ? `${row.notes ?? ""}${row.notes ? "\n\n" : ""}Today I need: ${needs.join(", ")}`
      : row.notes;
    const payload: any = {
      user_id: uid,
      date: today(),
      sleep_hours: row.sleep_hours === "" ? null : Number(row.sleep_hours),
      water_cups: row.water_cups === "" ? null : Number(row.water_cups),
      mood: row.mood || null,
      stress: row.stress || null,
      meds_taken: !!row.meds_taken,
      mindfulness_minutes: row.mindfulness_minutes === "" ? null : Number(row.mindfulness_minutes),
      notes: notesWithNeeds || null,
      intention: row.intention?.trim() ? row.intention.trim() : null,
    };
    const { error } = await supabase.from("health_checkins").upsert(payload, { onConflict: "user_id,date" });
    if (error) toast.error(error.message);
    else {
      toast.success("Tucked in with care 🌿");
      setStep(5);
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Settling in…</div>;

  const steps = ["Mood", "Body", "Mind", "Needs", "Reflect"];

  return (
    <div
      className="cozy-card overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(145 32% 95%) 0%, hsl(40 45% 96%) 100%)" }}
    >
      <div className="border-b border-border/40 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">A gentle pause</p>
            <h2 className="font-display text-2xl">Daily check-in</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => <StepDot key={i} active={i === step} />)}
          </div>
        </div>
      </div>

      <div className="min-h-[420px] px-6 py-8">
        {step === 0 && (
          <div className="space-y-6 text-center">
            <Sun className="mx-auto h-8 w-8 text-primary/60" />
            <h3 className="font-display text-3xl">How does your heart feel?</h3>
            <p className="text-sm text-muted-foreground">No right answer. Just notice.</p>
            <div className="grid grid-cols-5 gap-3">
              {MOODS.map(m => (
                <button
                  key={m.word}
                  onClick={() => setRow({ ...row, mood: m.word })}
                  className={`group flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                    row.mood === m.word ? "border-primary bg-card shadow-soft scale-105" : "border-border/40 hover:border-primary/40 bg-card/60"
                  }`}
                >
                  <span className="text-3xl">{m.emoji}</span>
                  <span className="text-xs capitalize">{m.word}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <Heart className="mx-auto h-8 w-8 text-primary/60" />
              <h3 className="mt-4 font-display text-3xl">How did your body rest?</h3>
            </div>
            <div className="space-y-5">
              <SliderField
                label="Hours slept"
                value={row.sleep_hours === "" ? 7 : Number(row.sleep_hours)}
                min={0} max={12} step={0.5}
                onChange={v => setRow({ ...row, sleep_hours: v })}
                suffix="hrs"
              />
              <SliderField
                label="Cups of water so far"
                value={row.water_cups === "" ? 4 : Number(row.water_cups)}
                min={0} max={16} step={1}
                onChange={v => setRow({ ...row, water_cups: v })}
                suffix="cups"
              />
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/40 bg-card/60 px-4 py-3">
                <input
                  type="checkbox"
                  checked={!!row.meds_taken}
                  onChange={e => setRow({ ...row, meds_taken: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">I took my medications & supplements</span>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <Wind className="mx-auto h-8 w-8 text-primary/60" />
              <h3 className="mt-4 font-display text-3xl">How's your nervous system?</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STRESS.map(s => (
                <button
                  key={s.word}
                  onClick={() => setRow({ ...row, stress: s.word })}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    row.stress === s.word ? "border-primary bg-card shadow-soft" : "border-border/40 hover:border-primary/40 bg-card/60"
                  }`}
                >
                  <p className="font-display text-lg capitalize">{s.word}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </button>
              ))}
            </div>
            <SliderField
              label="Mindful minutes today"
              value={row.mindfulness_minutes === "" ? 0 : Number(row.mindfulness_minutes)}
              min={0} max={120} step={5}
              onChange={v => setRow({ ...row, mindfulness_minutes: v })}
              suffix="min"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <Leaf className="mx-auto h-8 w-8 text-primary/60" />
              <h3 className="mt-4 font-display text-3xl">What do you need today?</h3>
              <p className="mt-2 text-sm text-muted-foreground">Pick as many as feel true.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {NEEDS.map(n => {
                const on = needs.includes(n);
                return (
                  <button
                    key={n}
                    onClick={() => setNeeds(on ? needs.filter(x => x !== n) : [...needs, n])}
                    className={`rounded-full border px-4 py-2 text-sm capitalize transition-all ${
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-card/60 hover:border-primary/40"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center">
              <Moon className="mx-auto h-8 w-8 text-primary/60" />
              <h3 className="mt-4 font-display text-3xl">Anything else you want to remember?</h3>
            </div>
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Today's intention
              </p>
              <input
                type="text"
                placeholder="A word or phrase to anchor the day…"
                value={row.intention ?? ""}
                onChange={e => setRow({ ...row, intention: e.target.value })}
                className="w-full rounded-2xl border border-border/40 bg-card/70 px-4 py-3 text-base outline-none transition focus:border-primary"
              />
            </div>
            <Textarea
              rows={6}
              placeholder="A thought, a small win, a worry, a noticing…"
              value={row.notes ?? ""}
              onChange={e => setRow({ ...row, notes: e.target.value })}
              className="bg-card/70"
            />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 py-12 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary/70" />
            <h3 className="font-display text-3xl">Thank you for showing up.</h3>
            <p className="text-sm text-muted-foreground">Your check-in is saved. Carry softness with you.</p>
            <Button
              variant="outline"
              onClick={() => setStep(0)}
              className="mt-4"
            >
              Adjust today's check-in
            </Button>
          </div>
        )}
      </div>

      {step < 5 && (
        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep(s => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={save}>Save check-in</Button>
          )}
        </div>
      )}
    </div>
  );
}

function SliderField({
  label, value, min, max, step, onChange, suffix,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <span className="font-display text-xl">{value}<span className="ml-1 text-xs text-muted-foreground">{suffix}</span></span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}