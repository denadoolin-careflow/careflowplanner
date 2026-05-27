import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Brain, Heart, Sparkles, Wind, Cloud, Sun } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

const EMOTIONS = [
  "grateful", "anxious", "hopeful", "tender", "overwhelmed", "curious",
  "lonely", "loved", "tired", "inspired", "irritated", "peaceful",
  "scattered", "focused", "sad", "joyful", "numb", "alive",
];

const SCALES = [
  { key: "mood_score", label: "Mood", icon: Sun, low: "Heavy", high: "Light" },
  { key: "anxiety", label: "Anxiety", icon: Wind, low: "Calm", high: "Activated" },
  { key: "focus", label: "Focus", icon: Brain, low: "Foggy", high: "Clear" },
  { key: "sensory_load", label: "Sensory load", icon: Cloud, low: "Quiet", high: "Loud" },
] as const;

type Log = {
  id: string;
  date: string;
  mood_score: number | null;
  anxiety: number | null;
  focus: number | null;
  sensory_load: number | null;
  emotions: string[] | null;
  gratitude: string | null;
  support_needed: string | null;
  notes: string | null;
  intention: string | null;
};

const empty = {
  mood_score: 3, anxiety: 3, focus: 3, sensory_load: 3,
  emotions: [] as string[], gratitude: "", support_needed: "", notes: "", intention: "",
};

export default function MentalHealthPage({ uid }: { uid: string }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [form, setForm] = useState<typeof empty>(empty);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("mental_health_logs")
      .select("*")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .limit(30);
    setLogs((data as Log[]) ?? []);
    const todays = (data as Log[])?.find(l => l.date === today());
    if (todays) {
      setForm({
        mood_score: todays.mood_score ?? 3,
        anxiety: todays.anxiety ?? 3,
        focus: todays.focus ?? 3,
        sensory_load: todays.sensory_load ?? 3,
        emotions: todays.emotions ?? [],
        gratitude: todays.gratitude ?? "",
        support_needed: todays.support_needed ?? "",
        notes: todays.notes ?? "",
        intention: todays.intention ?? "",
      });
    }
    setLoaded(true);
  }
  useEffect(() => { load(); }, [uid]);

  async function save() {
    const { error } = await supabase.from("mental_health_logs").upsert({
      user_id: uid,
      date: today(),
      mood_score: form.mood_score,
      anxiety: form.anxiety,
      focus: form.focus,
      sensory_load: form.sensory_load,
      emotions: form.emotions,
      gratitude: form.gratitude || null,
      support_needed: form.support_needed || null,
      notes: form.notes || null,
      intention: form.intention?.trim() ? form.intention.trim() : null,
    }, { onConflict: "user_id,date" });
    if (error) return toast.error(error.message);
    toast.success("Felt and honored 💚");
    load();
  }

  function toggleEmotion(e: string) {
    setForm(f => ({
      ...f,
      emotions: f.emotions.includes(e) ? f.emotions.filter(x => x !== e) : [...f.emotions, e],
    }));
  }

  const trend = useMemo(() => {
    const days: { date: string; mood: number | null; anxiety: number | null }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const l = logs.find(x => x.date === ds);
      days.push({ date: ds, mood: l?.mood_score ?? null, anxiety: l?.anxiety ?? null });
    }
    return days;
  }, [logs]);

  if (!loaded) return <div className="p-6 text-sm text-muted-foreground">Holding space…</div>;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div
        className="cozy-card p-6"
        style={{ background: "linear-gradient(160deg, hsl(145 32% 95%) 0%, hsl(40 45% 96%) 100%)" }}
      >
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card/70">
            <Heart className="h-5 w-5 text-primary/70" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">A safe place to feel</p>
            <h2 className="font-display text-3xl">Mental Health</h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              No fixing, no measuring against anyone else. Just noticing — gently and honestly.
            </p>
          </div>
        </div>

        {/* 14-day trend */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span>Last 14 days · mood</span>
            <span>Higher = lighter</span>
          </div>
          <div className="mt-2 flex h-20 items-end gap-1">
            {trend.map(d => (
              <div key={d.date} className="flex flex-1 flex-col items-stretch">
                <div
                  className="flex-1 rounded-t bg-primary/60"
                  style={{ opacity: d.mood ? 0.3 + (d.mood / 5) * 0.7 : 0.1, transform: d.mood ? `scaleY(${d.mood / 5})` : "scaleY(0.04)", transformOrigin: "bottom" }}
                  title={d.mood ? `${d.date} · mood ${d.mood}` : d.date}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scales */}
      <div className="cozy-card p-5">
        <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">How are you, really?</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {SCALES.map(s => {
            const Icon = s.icon;
            const val = (form as any)[s.key] as number;
            return (
              <div key={s.key} className="rounded-2xl border border-border/40 bg-card/60 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary/70" />
                    <span className="text-sm">{s.label}</span>
                  </div>
                  <span className="font-display text-xl">{val}<span className="text-xs text-muted-foreground">/5</span></span>
                </div>
                <input
                  type="range" min={1} max={5} step={1} value={val}
                  onChange={e => setForm(f => ({ ...f, [s.key]: Number(e.target.value) }))}
                  className="w-full accent-primary"
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{s.low}</span><span>{s.high}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Emotions */}
      <div className="cozy-card p-5">
        <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">What feelings are present?</p>
        <div className="flex flex-wrap gap-2">
          {EMOTIONS.map(e => {
            const on = form.emotions.includes(e);
            return (
              <button
                key={e}
                onClick={() => toggleEmotion(e)}
                className={`rounded-full border px-3 py-1.5 text-sm capitalize transition-all ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-card/60 hover:border-primary/40"
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gratitude & Support */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="cozy-card p-5">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary/70" />
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">A small gratitude</p>
          </div>
          <Textarea
            rows={3}
            placeholder="One tiny thing that felt good…"
            value={form.gratitude}
            onChange={e => setForm(f => ({ ...f, gratitude: e.target.value }))}
            className="bg-card/60"
          />
        </div>
        <div className="cozy-card p-5">
          <div className="mb-2 flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary/70" />
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">What support do you need?</p>
          </div>
          <Textarea
            rows={3}
            placeholder="From yourself, someone else, or the world…"
            value={form.support_needed}
            onChange={e => setForm(f => ({ ...f, support_needed: e.target.value }))}
            className="bg-card/60"
          />
        </div>
      </div>

      {/* Free notes */}
      <div className="cozy-card p-5">
        <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Anything else?</p>
        <Textarea
          rows={4}
          placeholder="Let it out, no shape required…"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          className="bg-card/60"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={save}>Save today's reflection</Button>
        </div>
      </div>

      {/* History */}
      {logs.length > 0 && (
        <div className="cozy-card p-5">
          <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Recent reflections</p>
          <ul className="space-y-2">
            {logs.slice(0, 8).map(l => (
              <li key={l.id} className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">{l.date.slice(5)}</span>
                  <span className="flex-1 text-xs text-muted-foreground">
                    mood {l.mood_score ?? "–"} · anx {l.anxiety ?? "–"} · focus {l.focus ?? "–"}
                  </span>
                </div>
                {l.emotions && l.emotions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {l.emotions.slice(0, 6).map(e => (
                      <span key={e} className="rounded-full bg-card/70 px-2 py-0.5 text-[10px] capitalize">{e}</span>
                    ))}
                  </div>
                )}
                {l.gratitude && <p className="mt-1 text-xs italic text-muted-foreground">✨ {l.gratitude}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}