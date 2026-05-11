import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Download, Pin } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);
function weekStart(d = new Date()) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x.toISOString().slice(0, 10); }
const WEEKDAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function useUser() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  return uid;
}

function ZonesPanel({ uid }: { uid: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  async function load() {
    const { data } = await supabase.from("cleaning_tasks").select("*").eq("user_id", uid).order("zone");
    setTasks(data ?? []);
  }
  useEffect(() => { load(); }, [uid]);
  const grouped = useMemo(() => {
    const m: Record<string, any[]> = {};
    tasks.forEach(t => { (m[t.zone] = m[t.zone] || []).push(t); });
    return m;
  }, [tasks]);
  async function toggle(t: any) {
    await supabase.from("cleaning_tasks").update({ done: !t.done, last_done: !t.done ? today() : t.last_done }).eq("id", t.id);
    load();
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Object.entries(grouped).map(([zone, items]) => (
        <SectionCard key={zone} title={zone} accent="sage">
          <ul className="space-y-1">
            {items.map(t => (
              <li key={t.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
                <span className={t.done ? "line-through text-muted-foreground flex-1" : "flex-1"}>{t.title}</span>
                <span className="text-xs text-muted-foreground">{t.cadence}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ))}
      {Object.keys(grouped).length === 0 && <p className="text-sm text-muted-foreground">No cleaning tasks yet — add some on Home Reset.</p>}
    </div>
  );
}

function MaintenancePanel({ uid }: { uid: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ title: "", category: "", interval_months: "", next_due: "" });
  async function load() {
    const { data } = await supabase.from("home_maintenance").select("*").eq("user_id", uid).order("next_due", { nullsFirst: true });
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, [uid]);
  async function add() {
    if (!form.title) return;
    const { error } = await supabase.from("home_maintenance").insert({ user_id: uid, title: form.title, category: form.category || null, interval_months: form.interval_months ? Number(form.interval_months) : null, next_due: form.next_due || null });
    if (error) return toast.error(error.message);
    setForm({ title: "", category: "", interval_months: "", next_due: "" }); load();
  }
  async function markDone(it: any) {
    const next = it.interval_months ? new Date(Date.now() + Number(it.interval_months) * 30 * 86400000).toISOString().slice(0, 10) : null;
    await supabase.from("home_maintenance").update({ last_done: today(), next_due: next }).eq("id", it.id);
    load();
  }
  async function del(id: string) { await supabase.from("home_maintenance").delete().eq("id", id); load(); }
  return (
    <SectionCard title="Maintenance & improvement" accent="warm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
        <Input type="number" placeholder="Every N months" value={form.interval_months} onChange={e => setForm({ ...form, interval_months: e.target.value })} />
        <Input type="date" value={form.next_due} onChange={e => setForm({ ...form, next_due: e.target.value })} />
        <Button onClick={add}>Add</Button>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {items.map(it => {
          const overdue = it.next_due && it.next_due < today();
          return (
            <li key={it.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${overdue ? "bg-destructive/10" : "bg-muted/40"}`}>
              <span className="flex-1">{it.title} {it.category && <span className="text-xs text-muted-foreground">· {it.category}</span>}</span>
              <span className="text-xs text-muted-foreground">{it.next_due ? `due ${it.next_due}` : "—"}</span>
              <Button size="sm" variant="outline" onClick={() => markDone(it)}>Done</Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(it.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function DocumentsPanel({ uid }: { uid: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ title: "", category: "Other", file: null as File | null, expires_on: "" });
  async function load() {
    const { data } = await supabase.from("home_documents").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    setDocs(data ?? []);
  }
  useEffect(() => { load(); }, [uid]);
  async function upload() {
    if (!form.file || !form.title) return;
    const path = `${uid}/${Date.now()}-${form.file.name}`;
    const { error: upErr } = await supabase.storage.from("home-documents").upload(path, form.file);
    if (upErr) return toast.error(upErr.message);
    const { error } = await supabase.from("home_documents").insert({ user_id: uid, title: form.title, category: form.category, file_path: path, mime_type: form.file.type, size_bytes: form.file.size, expires_on: form.expires_on || null });
    if (error) return toast.error(error.message);
    setForm({ title: "", category: "Other", file: null, expires_on: "" });
    (document.getElementById("doc-file") as HTMLInputElement | null)?.value && ((document.getElementById("doc-file") as HTMLInputElement).value = "");
    load();
  }
  async function open(d: any) {
    const { data, error } = await supabase.storage.from("home-documents").createSignedUrl(d.file_path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }
  async function del(d: any) {
    await supabase.storage.from("home-documents").remove([d.file_path]);
    await supabase.from("home_documents").delete().eq("id", d.id);
    load();
  }
  return (
    <SectionCard title="Important documents" accent="calm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{["Insurance","Warranties","Manuals","Medical","Financial","Other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Input id="doc-file" type="file" onChange={e => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
        <Input type="date" value={form.expires_on} onChange={e => setForm({ ...form, expires_on: e.target.value })} />
        <Button onClick={upload}>Upload</Button>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {docs.map(d => (
          <li key={d.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span className="flex-1">{d.title} <span className="text-xs text-muted-foreground">· {d.category}</span></span>
            {d.expires_on && <span className="text-xs text-muted-foreground">expires {d.expires_on}</span>}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => open(d)}><Download className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(d)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function NotesPanel({ uid }: { uid: string }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ title: "", body: "" });
  async function load() {
    const { data } = await supabase.from("home_notes").select("*").eq("user_id", uid).order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setNotes(data ?? []);
  }
  useEffect(() => { load(); }, [uid]);
  async function add() {
    if (!form.title && !form.body) return;
    await supabase.from("home_notes").insert({ user_id: uid, title: form.title || null, body: form.body || null });
    setForm({ title: "", body: "" }); load();
  }
  async function pin(n: any) { await supabase.from("home_notes").update({ pinned: !n.pinned }).eq("id", n.id); load(); }
  async function del(id: string) { await supabase.from("home_notes").delete().eq("id", id); load(); }
  return (
    <SectionCard title="Notes" accent="warm">
      <div className="space-y-2">
        <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <Textarea placeholder="Body…" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
        <div className="flex justify-end"><Button onClick={add}>Add note</Button></div>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {notes.map(n => (
          <li key={n.id} className="rounded-lg bg-muted/40 p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                {n.title && <div className="font-medium">{n.title}</div>}
                {n.body && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>}
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => pin(n)}><Pin className={`h-3.5 w-3.5 ${n.pinned ? "fill-current" : ""}`} /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(n.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function ChoreChart({ uid }: { uid: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [assigns, setAssigns] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [memberForm, setMemberForm] = useState({ name: "", emoji: "🙂" });
  const [aForm, setAForm] = useState<any>({ member_id: "", title: "", weekdays: [0,1,2,3,4] as number[] });
  const ws = weekStart();
  async function load() {
    const [m, a, c] = await Promise.all([
      supabase.from("household_members").select("*").eq("user_id", uid).order("sort_order"),
      supabase.from("chore_assignments").select("*").eq("user_id", uid).order("sort_order"),
      supabase.from("chore_completions").select("*").eq("user_id", uid).eq("week_start", ws),
    ]);
    setMembers(m.data ?? []); setAssigns(a.data ?? []); setCompletions(c.data ?? []);
  }
  useEffect(() => { load(); }, [uid]);
  async function addMember() {
    if (!memberForm.name) return;
    await supabase.from("household_members").insert({ user_id: uid, name: memberForm.name, avatar_emoji: memberForm.emoji });
    setMemberForm({ name: "", emoji: "🙂" }); load();
  }
  async function delMember(id: string) { await supabase.from("household_members").delete().eq("id", id); load(); }
  async function addAssign() {
    if (!aForm.member_id || !aForm.title) return;
    await supabase.from("chore_assignments").insert({ user_id: uid, member_id: aForm.member_id, title: aForm.title, weekdays: aForm.weekdays });
    setAForm({ ...aForm, title: "" }); load();
  }
  async function delAssign(id: string) { await supabase.from("chore_assignments").delete().eq("id", id); load(); }
  async function toggleDay(a: any, weekday: number) {
    const existing = completions.find(c => c.assignment_id === a.id && c.weekday === weekday);
    if (existing) {
      await supabase.from("chore_completions").delete().eq("id", existing.id);
    } else {
      await supabase.from("chore_completions").insert({ user_id: uid, assignment_id: a.id, member_id: a.member_id, week_start: ws, weekday });
    }
    load();
  }
  function isDone(a: any, wd: number) { return completions.some(c => c.assignment_id === a.id && c.weekday === wd); }
  return (
    <div className="space-y-4">
      <SectionCard title="Household members" accent="sage">
        <div className="flex gap-2">
          <Input placeholder="Emoji" value={memberForm.emoji} onChange={e => setMemberForm({ ...memberForm, emoji: e.target.value })} className="w-20" />
          <Input placeholder="Name" value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} />
          <Button onClick={addMember}>Add</Button>
        </div>
        <ul className="mt-2 flex flex-wrap gap-2">
          {members.map(m => (
            <li key={m.id} className="flex items-center gap-1 rounded-full bg-muted/40 px-3 py-1 text-sm">
              <span>{m.avatar_emoji} {m.name}</span>
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => delMember(m.id)}><Trash2 className="h-3 w-3" /></Button>
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Chore assignments" subtitle={`Week of ${ws}`} accent="calm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select value={aForm.member_id || ""} onValueChange={v => setAForm({ ...aForm, member_id: v })}>
            <SelectTrigger><SelectValue placeholder="Member" /></SelectTrigger>
            <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.avatar_emoji} {m.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Chore title" value={aForm.title} onChange={e => setAForm({ ...aForm, title: e.target.value })} className="sm:col-span-2" />
          <Button onClick={addAssign}>Add</Button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground">
              <th className="text-left">Member</th><th className="text-left">Chore</th>
              {WEEKDAYS.map(d => <th key={d} className="px-1">{d}</th>)}<th></th>
            </tr></thead>
            <tbody>
              {assigns.map(a => {
                const m = members.find(x => x.id === a.member_id);
                return (
                  <tr key={a.id} className="border-t border-border/50">
                    <td className="py-2">{m ? `${m.avatar_emoji} ${m.name}` : "—"}</td>
                    <td className="py-2">{a.title}</td>
                    {WEEKDAYS.map((_, wd) => (
                      <td key={wd} className="px-1 text-center">
                        {(a.weekdays || []).includes(wd) ? (
                          <input type="checkbox" checked={isDone(a, wd)} onChange={() => toggleDay(a, wd)} />
                        ) : <span className="text-muted-foreground">·</span>}
                      </td>
                    ))}
                    <td><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => delAssign(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

export default function HomeAreas() {
  const uid = useUser();
  if (!uid) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-sage p-6">
        <h2 className="font-display text-3xl font-semibold">Home</h2>
        <p className="mt-1 text-sm text-muted-foreground">Cleaning, maintenance, documents, notes, and chores.</p>
      </div>
      <Tabs defaultValue="zones">
        <TabsList className="flex-wrap">
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="docs">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="chores">Chores</TabsTrigger>
        </TabsList>
        <TabsContent value="zones"><ZonesPanel uid={uid} /></TabsContent>
        <TabsContent value="maintenance"><MaintenancePanel uid={uid} /></TabsContent>
        <TabsContent value="docs"><DocumentsPanel uid={uid} /></TabsContent>
        <TabsContent value="notes"><NotesPanel uid={uid} /></TabsContent>
        <TabsContent value="chores"><ChoreChart uid={uid} /></TabsContent>
      </Tabs>
    </div>
  );
}