import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

function useUser() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  return uid;
}

function CheckInPanel({ uid }: { uid: string }) {
  const [row, setRow] = useState<any>({ date: today(), sleep_hours: "", water_cups: "", mood: "", stress: "", meds_taken: false, mindfulness_minutes: "", notes: "" });
  useEffect(() => {
    supabase.from("health_checkins").select("*").eq("user_id", uid).eq("date", today()).maybeSingle()
      .then(({ data }) => { if (data) setRow({ ...data, sleep_hours: data.sleep_hours ?? "", water_cups: data.water_cups ?? "", mindfulness_minutes: data.mindfulness_minutes ?? "" }); });
  }, [uid]);
  async function save() {
    const payload: any = { user_id: uid, date: today(), sleep_hours: row.sleep_hours === "" ? null : Number(row.sleep_hours), water_cups: row.water_cups === "" ? null : Number(row.water_cups), mood: row.mood || null, stress: row.stress || null, meds_taken: !!row.meds_taken, mindfulness_minutes: row.mindfulness_minutes === "" ? null : Number(row.mindfulness_minutes), notes: row.notes || null };
    const { error } = await supabase.from("health_checkins").upsert(payload, { onConflict: "user_id,date" });
    if (error) toast.error(error.message); else toast.success("Saved check-in");
  }
  return (
    <SectionCard title="Today's check-in" accent="calm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><Label>Sleep (hours)</Label><Input type="number" step="0.1" value={row.sleep_hours} onChange={e => setRow({ ...row, sleep_hours: e.target.value })} /></div>
        <div><Label>Water (cups)</Label><Input type="number" value={row.water_cups} onChange={e => setRow({ ...row, water_cups: e.target.value })} /></div>
        <div><Label>Mood</Label>
          <Select value={row.mood || ""} onValueChange={v => setRow({ ...row, mood: v })}>
            <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
            <SelectContent>{["great","good","ok","low","rough"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Stress</Label>
          <Select value={row.stress || ""} onValueChange={v => setRow({ ...row, stress: v })}>
            <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
            <SelectContent>{["calm","mild","tense","high"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Mindfulness (min)</Label><Input type="number" value={row.mindfulness_minutes} onChange={e => setRow({ ...row, mindfulness_minutes: e.target.value })} /></div>
        <label className="flex items-center gap-2 self-end"><input type="checkbox" checked={!!row.meds_taken} onChange={e => setRow({ ...row, meds_taken: e.target.checked })} /> Meds taken</label>
      </div>
      <Textarea className="mt-3" placeholder="Notes…" value={row.notes ?? ""} onChange={e => setRow({ ...row, notes: e.target.value })} />
      <div className="mt-3 flex justify-end"><Button onClick={save}>Save</Button></div>
    </SectionCard>
  );
}

function MovementPanel({ uid }: { uid: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [form, setForm] = useState({ date: today(), activity: "", minutes: "", intensity: "moderate", notes: "" });
  async function load() {
    const { data } = await supabase.from("movement_logs").select("*").eq("user_id", uid).order("date", { ascending: false }).limit(30);
    setLogs(data ?? []);
  }
  useEffect(() => { load(); }, [uid]);
  async function add() {
    if (!form.activity || !form.minutes) return;
    const { error } = await supabase.from("movement_logs").insert({ user_id: uid, date: form.date, activity: form.activity, minutes: Number(form.minutes), intensity: form.intensity, notes: form.notes || null });
    if (error) return toast.error(error.message);
    setForm({ ...form, activity: "", minutes: "", notes: "" });
    load();
  }
  async function del(id: string) { await supabase.from("movement_logs").delete().eq("id", id); load(); }
  const weekTotal = useMemo(() => {
    const since = new Date(); since.setDate(since.getDate() - 7);
    return logs.filter(l => new Date(l.date) >= since).reduce((s, l) => s + (l.minutes || 0), 0);
  }, [logs]);
  return (
    <SectionCard title="Movement" subtitle={`${weekTotal} min this week`} accent="sage">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <Input placeholder="Activity" value={form.activity} onChange={e => setForm({ ...form, activity: e.target.value })} />
        <Input type="number" placeholder="Min" value={form.minutes} onChange={e => setForm({ ...form, minutes: e.target.value })} />
        <Select value={form.intensity} onValueChange={v => setForm({ ...form, intensity: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{["light","moderate","vigorous"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={add}>Add</Button>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {logs.map(l => (
          <li key={l.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span className="w-24 text-xs text-muted-foreground">{l.date}</span>
            <span className="flex-1">{l.activity}</span>
            <span className="text-xs">{l.minutes}m · {l.intensity}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function WeightPanel({ uid }: { uid: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [form, setForm] = useState({ date: today(), weight_lb: "" });
  async function load() {
    const { data } = await supabase.from("weight_logs").select("*").eq("user_id", uid).order("date", { ascending: true }).limit(90);
    setLogs(data ?? []);
  }
  useEffect(() => { load(); }, [uid]);
  async function add() {
    if (!form.weight_lb) return;
    const { error } = await supabase.from("weight_logs").insert({ user_id: uid, date: form.date, weight_lb: Number(form.weight_lb) });
    if (error) return toast.error(error.message);
    setForm({ date: today(), weight_lb: "" });
    load();
  }
  return (
    <SectionCard title="Weight" accent="warm">
      <div className="flex gap-2">
        <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <Input type="number" step="0.1" placeholder="lbs" value={form.weight_lb} onChange={e => setForm({ ...form, weight_lb: e.target.value })} />
        <Button onClick={add}>Log</Button>
      </div>
      <div className="mt-4 h-48">
        <ResponsiveContainer>
          <LineChart data={logs.map(l => ({ date: l.date.slice(5), weight: Number(l.weight_lb) }))}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

function GoalsPanel({ uid }: { uid: string }) {
  const [g, setG] = useState<any>({ goal_type: "maintain", target_weight_lb: "", target_calories: "", target_protein_g: "", weekly_movement_minutes: 150 });
  useEffect(() => {
    supabase.from("health_goals").select("*").eq("user_id", uid).maybeSingle()
      .then(({ data }) => { if (data) setG({ ...data, target_weight_lb: data.target_weight_lb ?? "", target_calories: data.target_calories ?? "", target_protein_g: data.target_protein_g ?? "" }); });
  }, [uid]);
  async function save() {
    const payload = { user_id: uid, goal_type: g.goal_type, target_weight_lb: g.target_weight_lb === "" ? null : Number(g.target_weight_lb), target_calories: g.target_calories === "" ? null : Number(g.target_calories), target_protein_g: g.target_protein_g === "" ? null : Number(g.target_protein_g), weekly_movement_minutes: Number(g.weekly_movement_minutes) || 150 };
    const { error } = await supabase.from("health_goals").upsert(payload, { onConflict: "user_id" });
    if (error) toast.error(error.message); else toast.success("Saved");
  }
  return (
    <SectionCard title="Goals & meal plan" accent="calm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><Label>Goal</Label>
          <Select value={g.goal_type} onValueChange={v => setG({ ...g, goal_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["lose","maintain","gain","high-protein","low-carb","heart-healthy","energy"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Target weight (lbs)</Label><Input type="number" value={g.target_weight_lb} onChange={e => setG({ ...g, target_weight_lb: e.target.value })} /></div>
        <div><Label>Daily calories</Label><Input type="number" value={g.target_calories} onChange={e => setG({ ...g, target_calories: e.target.value })} /></div>
        <div><Label>Daily protein (g)</Label><Input type="number" value={g.target_protein_g} onChange={e => setG({ ...g, target_protein_g: e.target.value })} /></div>
        <div><Label>Weekly movement (min)</Label><Input type="number" value={g.weekly_movement_minutes} onChange={e => setG({ ...g, weekly_movement_minutes: e.target.value })} /></div>
      </div>
      <div className="mt-3 flex justify-end"><Button onClick={save}>Save</Button></div>
      <p className="mt-3 text-xs text-muted-foreground">Tailored meal suggestions: filter your Meals Library by tags matching your goal.</p>
    </SectionCard>
  );
}

export default function Health() {
  const uid = useUser();
  if (!uid) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-sage p-6">
        <h2 className="font-display text-3xl font-semibold">Health</h2>
        <p className="mt-1 text-sm text-muted-foreground">Self-care, movement, weight, and meal goals.</p>
      </div>
      <Tabs defaultValue="checkin">
        <TabsList className="flex-wrap">
          <TabsTrigger value="checkin">Check-in</TabsTrigger>
          <TabsTrigger value="movement">Movement</TabsTrigger>
          <TabsTrigger value="weight">Weight</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>
        <TabsContent value="checkin"><CheckInPanel uid={uid} /></TabsContent>
        <TabsContent value="movement"><MovementPanel uid={uid} /></TabsContent>
        <TabsContent value="weight"><WeightPanel uid={uid} /></TabsContent>
        <TabsContent value="goals"><GoalsPanel uid={uid} /></TabsContent>
      </Tabs>
    </div>
  );
}