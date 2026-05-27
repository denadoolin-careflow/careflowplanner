import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Wind, Flame, Waves, Mountain, Heart, Leaf } from "lucide-react";
import { useCycle } from "@/lib/store";

const today = () => new Date().toISOString().slice(0, 10);

const INTENTS = [
  { key: "restore", label: "Restore", icon: Waves, color: "hsl(195 40% 55%)" },
  { key: "energize", label: "Energize", icon: Flame, color: "hsl(20 70% 60%)" },
  { key: "ground", label: "Ground", icon: Mountain, color: "hsl(30 30% 50%)" },
  { key: "soften", label: "Soften", icon: Leaf, color: "hsl(145 40% 50%)" },
  { key: "play", label: "Play", icon: Heart, color: "hsl(340 60% 65%)" },
  { key: "breathe", label: "Breathe", icon: Wind, color: "hsl(180 35% 55%)" },
];

const QUICK_ADD = [
  { activity: "Walk", minutes: 20, intensity: "light", intent: "ground" },
  { activity: "Yin yoga", minutes: 30, intensity: "light", intent: "restore" },
  { activity: "Stretching", minutes: 10, intensity: "light", intent: "soften" },
  { activity: "Dance break", minutes: 15, intensity: "moderate", intent: "play" },
  { activity: "Strength flow", minutes: 30, intensity: "moderate", intent: "energize" },
  { activity: "Breathwork", minutes: 10, intensity: "light", intent: "breathe" },
];

const PHASE_GUIDANCE: Record<string, { title: string; body: string }> = {
  menstrual: { title: "This is a rest phase", body: "Walks, gentle stretching, restorative yoga, breathwork. Skip the high-intensity if your body says so." },
  follicular: { title: "Energy is rising", body: "Build, learn, try a new movement. Strength training and creative flows feel good now." },
  ovulatory: { title: "Peak vitality", body: "High-energy classes, group movement, dancing. Channel the spark." },
  luteal: { title: "Wind down gently", body: "Steady cardio early, switch to pilates, yoga, and walks as the phase progresses." },
};

export default function MovementPage({ uid }: { uid: string }) {
  const { phaseToday } = useCycle();
  const [logs, setLogs] = useState<any[]>([]);
  const [form, setForm] = useState({ date: today(), activity: "", minutes: "", intensity: "moderate", notes: "", intent: "restore" });

  async function load() {
    const { data } = await supabase.from("movement_logs").select("*").eq("user_id", uid).order("date", { ascending: false }).limit(60);
    setLogs(data ?? []);
  }
  useEffect(() => { load(); }, [uid]);

  async function add(custom?: Partial<typeof form>) {
    const f = { ...form, ...(custom ?? {}) };
    if (!f.activity || !f.minutes) return toast.error("Add an activity & minutes");
    const notes = f.intent ? `[${f.intent}] ${f.notes ?? ""}`.trim() : f.notes;
    const { error } = await supabase.from("movement_logs").insert({
      user_id: uid, date: f.date, activity: f.activity, minutes: Number(f.minutes), intensity: f.intensity, notes: notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Movement honored 🌿");
    setForm({ date: today(), activity: "", minutes: "", intensity: "moderate", notes: "", intent: "restore" });
    load();
  }

  async function del(id: string) { await supabase.from("movement_logs").delete().eq("id", id); load(); }

  const weekTotal = useMemo(() => {
    const since = new Date(); since.setDate(since.getDate() - 7);
    return logs.filter(l => new Date(l.date) >= since).reduce((s, l) => s + (l.minutes || 0), 0);
  }, [logs]);

  const last7Days = useMemo(() => {
    const days: { date: string; minutes: number; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const mins = logs.filter(l => l.date === ds).reduce((s, l) => s + (l.minutes || 0), 0);
      days.push({ date: ds, minutes: mins, label: d.toLocaleDateString(undefined, { weekday: "narrow" }) });
    }
    return days;
  }, [logs]);

  const maxDay = Math.max(60, ...last7Days.map(d => d.minutes));
  const guidance = PHASE_GUIDANCE[phaseToday ?? ""] ?? PHASE_GUIDANCE.follicular;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div
        className="cozy-card p-6"
        style={{ background: "linear-gradient(160deg, hsl(145 32% 94%) 0%, hsl(40 45% 96%) 100%)" }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Movement, not punishment</p>
            <h2 className="font-display text-3xl">{guidance.title}</h2>
            <p className="max-w-md text-sm text-muted-foreground">{guidance.body}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">This week</p>
            <p className="font-display text-4xl text-primary">{weekTotal}<span className="ml-1 text-sm text-muted-foreground">min</span></p>
          </div>
        </div>

        {/* 7-day bars */}
        <div className="mt-6 flex items-end gap-2 h-24">
          {last7Days.map(d => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-primary/70 transition-all"
                  style={{ height: `${(d.minutes / maxDay) * 100}%`, minHeight: d.minutes > 0 ? 4 : 0 }}
                  title={`${d.minutes} min`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick add chips */}
      <div className="cozy-card p-5">
        <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Quick log</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ADD.map(q => (
            <button
              key={q.activity}
              onClick={() => add(q)}
              className="rounded-full border border-border/50 bg-card/60 px-3 py-1.5 text-sm hover:border-primary/40 hover:bg-card transition-all"
            >
              + {q.activity} <span className="text-muted-foreground">· {q.minutes}m</span>
            </button>
          ))}
        </div>
      </div>

      {/* Detailed log */}
      <div className="cozy-card p-5">
        <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Log with intention</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <Input placeholder="What did you do?" value={form.activity} onChange={e => setForm({ ...form, activity: e.target.value })} />
          <Input type="number" placeholder="Minutes" value={form.minutes} onChange={e => setForm({ ...form, minutes: e.target.value })} />
          <select
            value={form.intensity}
            onChange={e => setForm({ ...form, intensity: e.target.value })}
            className="rounded-md border border-input bg-background px-3 text-sm"
          >
            {["light", "moderate", "vigorous"].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <p className="mt-4 mb-2 text-xs text-muted-foreground">Intention</p>
        <div className="flex flex-wrap gap-2">
          {INTENTS.map(i => {
            const on = form.intent === i.key;
            const Icon = i.icon;
            return (
              <button
                key={i.key}
                onClick={() => setForm({ ...form, intent: i.key })}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                  on ? "border-primary bg-primary/10" : "border-border/50 bg-card/60 hover:border-primary/40"
                }`}
                style={on ? { color: i.color } : {}}
              >
                <Icon className="h-3.5 w-3.5" />
                {i.label}
              </button>
            );
          })}
        </div>

        <Textarea
          className="mt-3 bg-card/60"
          rows={2}
          placeholder="How did it feel? (optional)"
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={() => add()}>Log movement</Button>
        </div>
      </div>

      {/* History */}
      <div className="cozy-card p-5">
        <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Recent</p>
        {logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No movement logged yet. That's okay too.</p>
        ) : (
          <ul className="space-y-1.5">
            {logs.slice(0, 12).map(l => (
              <li key={l.id} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                <span className="w-20 text-xs text-muted-foreground">{l.date.slice(5)}</span>
                <span className="flex-1">{l.activity}</span>
                <span className="text-xs text-muted-foreground">{l.minutes}m · {l.intensity}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(l.id)}>
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