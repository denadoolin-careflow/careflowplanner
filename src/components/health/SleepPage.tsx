import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Moon, Sunrise, Sparkles, Cloud } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

const WIND_DOWN_OPTIONS = [
  { key: "no_screens", label: "Screens off early", icon: "📵" },
  { key: "warm_shower", label: "Warm shower", icon: "🛁" },
  { key: "tea", label: "Herbal tea", icon: "🫖" },
  { key: "stretch", label: "Gentle stretch", icon: "🌿" },
  { key: "journal", label: "Journal", icon: "📓" },
  { key: "read", label: "Read", icon: "📖" },
  { key: "breathwork", label: "Breathwork", icon: "🌬" },
  { key: "magnesium", label: "Magnesium", icon: "🌙" },
];

type SleepLog = {
  id: string; date: string; bedtime: string | null; wake_time: string | null;
  hours_slept: number | null; quality: number | null; wind_down: string[] | null;
  dreams: string | null; notes: string | null;
};

function computeHours(bedtime?: string | null, wake?: string | null): number | null {
  if (!bedtime || !wake) return null;
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

export default function SleepPage({ uid }: { uid: string }) {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [form, setForm] = useState({
    bedtime: "22:30", wake_time: "06:30", quality: 3,
    wind_down: [] as string[], dreams: "", notes: "",
  });
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const { data } = await supabase.from("sleep_logs").select("*")
      .eq("user_id", uid).order("date", { ascending: false }).limit(30);
    setLogs((data as SleepLog[]) ?? []);
    const todays = (data as SleepLog[])?.find(l => l.date === today());
    if (todays) {
      setForm({
        bedtime: todays.bedtime ?? "22:30",
        wake_time: todays.wake_time ?? "06:30",
        quality: todays.quality ?? 3,
        wind_down: todays.wind_down ?? [],
        dreams: todays.dreams ?? "",
        notes: todays.notes ?? "",
      });
    }
    setLoaded(true);
  }
  useEffect(() => { load(); }, [uid]);

  async function save() {
    const hours = computeHours(form.bedtime, form.wake_time);
    const { error } = await supabase.from("sleep_logs").upsert({
      user_id: uid, date: today(),
      bedtime: form.bedtime, wake_time: form.wake_time, hours_slept: hours,
      quality: form.quality, wind_down: form.wind_down,
      dreams: form.dreams || null, notes: form.notes || null,
    }, { onConflict: "user_id,date" });
    if (error) return toast.error(error.message);
    toast.success("Sleep tucked in 🌙");
    load();
  }

  function toggleWindDown(key: string) {
    setForm(f => ({
      ...f,
      wind_down: f.wind_down.includes(key) ? f.wind_down.filter(x => x !== key) : [...f.wind_down, key],
    }));
  }

  const hours = computeHours(form.bedtime, form.wake_time);

  const trend = useMemo(() => {
    const days: { date: string; hours: number; quality: number | null; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const l = logs.find(x => x.date === ds);
      days.push({
        date: ds,
        hours: l?.hours_slept ? Number(l.hours_slept) : 0,
        quality: l?.quality ?? null,
        label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      });
    }
    return days;
  }, [logs]);

  const avgHours = useMemo(() => {
    const valid = trend.filter(d => d.hours > 0);
    if (!valid.length) return 0;
    return Math.round((valid.reduce((s, d) => s + d.hours, 0) / valid.length) * 10) / 10;
  }, [trend]);

  if (!loaded) return <div className="p-6 text-sm text-muted-foreground">Drifting in…</div>;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div
        className="cozy-card p-6"
        style={{ background: "linear-gradient(160deg, hsl(230 35% 92%) 0%, hsl(280 25% 94%) 100%)" }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card/70">
              <Moon className="h-5 w-5 text-primary/70" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Rest is productive</p>
              <h2 className="font-display text-3xl">Sleep</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Track sleep without obsession. Honor your wind-down. Greet your dreams.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">2-week avg</p>
            <p className="font-display text-4xl text-primary">{avgHours}<span className="ml-1 text-sm text-muted-foreground">hrs</span></p>
          </div>
        </div>

        {/* Trend */}
        <div className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Last 14 nights</p>
          <div className="flex items-end gap-1.5 h-24">
            {trend.map(d => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-primary/60"
                    style={{ height: `${Math.min(100, (d.hours / 10) * 100)}%`, minHeight: d.hours > 0 ? 4 : 0 }}
                    title={d.hours > 0 ? `${d.hours}h` : "no log"}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Times */}
      <div className="cozy-card p-5">
        <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Last night</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Moon className="h-3.5 w-3.5" /> Bedtime
            </div>
            <Input type="time" value={form.bedtime} onChange={e => setForm({ ...form, bedtime: e.target.value })} />
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Sunrise className="h-3.5 w-3.5" /> Wake
            </div>
            <Input type="time" value={form.wake_time} onChange={e => setForm({ ...form, wake_time: e.target.value })} />
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/60 p-4 text-center">
            <p className="text-xs text-muted-foreground">In bed</p>
            <p className="mt-1 font-display text-3xl">{hours ?? "–"}<span className="ml-1 text-sm text-muted-foreground">hrs</span></p>
          </div>
        </div>
      </div>

      {/* Quality */}
      <div className="cozy-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">How did it feel?</p>
          <span className="font-display text-xl">{form.quality}<span className="text-xs text-muted-foreground">/5</span></span>
        </div>
        <input
          type="range" min={1} max={5} step={1} value={form.quality}
          onChange={e => setForm({ ...form, quality: Number(e.target.value) })}
          className="w-full accent-primary"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Rough</span><span>Restorative</span>
        </div>
      </div>

      {/* Wind-down */}
      <div className="cozy-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary/70" />
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Wind-down rituals</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WIND_DOWN_OPTIONS.map(o => {
            const on = form.wind_down.includes(o.key);
            return (
              <button
                key={o.key}
                onClick={() => toggleWindDown(o.key)}
                className={`flex items-center gap-2 rounded-2xl border p-3 text-sm transition-all ${
                  on ? "border-primary bg-primary/10" : "border-border/50 bg-card/60 hover:border-primary/40"
                }`}
              >
                <span className="text-lg">{o.icon}</span>
                <span className="text-left text-xs">{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dreams & Notes */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="cozy-card p-5">
          <div className="mb-2 flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary/70" />
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Dream journal</p>
          </div>
          <Textarea
            rows={4}
            placeholder="Fragments, images, feelings…"
            value={form.dreams}
            onChange={e => setForm({ ...form, dreams: e.target.value })}
            className="bg-card/60"
          />
        </div>
        <div className="cozy-card p-5">
          <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Notes</p>
          <Textarea
            rows={4}
            placeholder="Anything that affected sleep?"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="bg-card/60"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save}>Save tonight</Button>
      </div>
    </div>
  );
}