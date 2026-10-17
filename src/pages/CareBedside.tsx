/**
 * Bedside comfort & relief-medication log plus the hospice team directory.
 * Tracking only — never dosing advice. Team members reuse care_providers.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, Pill, Plus, Trash2, HeartHandshake, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { BedsidePersonPlan } from "@/components/care/BedsidePersonPlan";
import { BedsideEntryEditor } from "@/components/care/BedsideEntryEditor";

const COMFORT = ["Repositioned", "Mouth care", "Lip balm", "Skin check", "Sips / ice chips", "Music / reading", "Calm breathing", "Restless"];
const ROLES = ["Hospice nurse", "Hospice on-call", "Doctor", "Social worker", "Chaplain", "Aide", "Volunteer", "Pharmacy", "Funeral home", "Other"];

interface Log { id: string; kind: string; label: string; pain: number | null; dose: string | null; note: string | null; logged_at: string }
interface Member { id: string; name: string; role: string | null; phone: string | null; email: string | null; notes: string | null }

const fmt = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

export default function CareBedside() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [team, setTeam] = useState<Member[]>([]);
  const [pain, setPain] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [med, setMed] = useState(""); const [dose, setDose] = useState("");
  const [m, setM] = useState({ name: "", role: ROLES[0], phone: "", email: "", notes: "" });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { state } = useStore() as any;
  const recipients: { id: string; name: string }[] = state.recipients ?? [];
  const [personId, setPersonId] = useState<string>(() => localStorage.getItem("careflow:bedside-person") ?? "");
  useEffect(() => { if (!personId && recipients[0]) setPersonId(recipients[0].id); }, [recipients, personId]);
  useEffect(() => { if (personId) localStorage.setItem("careflow:bedside-person", personId); }, [personId]);
  const person = recipients.find(r => r.id === personId);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 3 * 86400000).toISOString();
    const [{ data: l }, { data: t }] = await Promise.all([
      (personId ? supabase.from("bedside_logs").select("*").eq("recipient_id", personId) : supabase.from("bedside_logs").select("*")).neq("kind", "note").gte("logged_at", since).order("logged_at", { ascending: false }),
      supabase.from("care_providers").select("id,name,role,phone,email,notes").order("name"),
    ]);
    setLogs((l ?? []) as Log[]); setTeam((t ?? []) as Member[]);
  }, [personId]);
  useEffect(() => { void load(); }, [load]);

  const log = async (row: Partial<Log>) => {
    const { error } = await supabase.from("bedside_logs").insert({ ...row, recipient_id: personId || null } as any);
    if (error) return toast.error("Couldn't save");
    toast.success("Logged"); void load();
  };
  const remove = async (id: string) => { setLogs(x => x.filter(y => y.id !== id)); await supabase.from("bedside_logs").delete().eq("id", id); };

  const lastTurn = logs.find(l => l.label === "Repositioned");
  const lastMed = logs.find(l => l.kind === "med");

  const addMember = async () => {
    if (!m.name.trim()) return toast.error("Add a name");
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { error } = await supabase.from("care_providers").insert({ user_id: user.id, name: m.name.trim(), role: m.role, phone: m.phone || null, email: m.email || null, notes: m.notes || null } as any);
    if (error) return toast.error("Couldn't save");
    setM({ name: "", role: ROLES[0], phone: "", email: "", notes: "" }); setAdding(false); void load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bedside care</p>
        <h1 className="font-display text-3xl">Comfort, gently tracked</h1>
        <p className="mt-1 text-sm text-muted-foreground">A shared record so everyone knows what's been done. Tracking only — follow your hospice team's guidance for any medicine.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-border bg-card px-3 py-1">Last turned: <strong>{lastTurn ? ago(lastTurn.logged_at) : "—"}</strong></span>
          <span className="rounded-full border border-border bg-card px-3 py-1">Last relief medicine: <strong>{lastMed ? `${lastMed.label} · ${ago(lastMed.logged_at)}` : "—"}</strong></span>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Caring for</span>
        {recipients.length === 0 ? <a href="/caregiving" className="text-sm text-primary underline">Add a person in Caregiving</a> : recipients.map(r => (
          <button key={r.id} type="button" aria-pressed={r.id === personId} onClick={() => setPersonId(r.id)}
            className={cn("min-h-10 rounded-full border px-4 text-sm", r.id === personId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>{r.name}</button>
        ))}
      </div>

      <SectionCard title="Comfort check" subtitle="Tap what you just did">
        <div className="flex flex-wrap gap-2">
          {COMFORT.map(c => (
            <button key={c} type="button" onClick={() => void log({ kind: "comfort", label: c, pain, note: note || null })}
              className="min-h-11 rounded-full border border-border bg-card px-4 text-sm hover:border-primary/50">{c}</button>
          ))}
        </div>
        <p className="mt-4 mb-1.5 text-xs text-muted-foreground">Pain or discomfort (0 none – 10 worst)</p>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <button key={i} type="button" aria-pressed={pain === i} onClick={() => setPain(pain === i ? null : i)}
              className={cn("h-10 w-10 rounded-full border text-sm", pain === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>{i}</button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note (breathing, mood, visitors…)" className="h-11" />
          <Button className="h-11" onClick={() => { void log({ kind: "comfort", label: pain != null ? "Pain check" : "Note", pain, note: note || null }); setNote(""); setPain(null); }}>Save</Button>
        </div>
      </SectionCard>

      <SectionCard title="Relief medicine given" subtitle="Record as-needed (PRN) doses so no one doubles up">
        <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
          <Input value={med} onChange={e => setMed(e.target.value)} placeholder="Medicine name" className="h-11" />
          <Input value={dose} onChange={e => setDose(e.target.value)} placeholder="Amount" className="h-11" />
          <Button className="h-11" onClick={() => { if (!med.trim()) return toast.error("Add the medicine name"); void log({ kind: "med", label: med.trim(), dose: dose || null, pain }); setMed(""); setDose(""); }}>
            <Pill className="mr-1 h-4 w-4" />Log dose</Button>
        </div>
      </SectionCard>

      {person && <BedsidePersonPlan personId={person.id} personName={person.name} />}

      <SectionCard title="Last 3 days" subtitle="Newest first">
        {logs.length === 0 ? <EmptyState title="Nothing logged yet" hint="Comfort checks and doses will appear here." /> : (
          <ul className="space-y-1.5">
            {logs.map(l => editingId === l.id ? (
              <li key={l.id} className="rounded-xl border border-primary/40 bg-card/60 px-3 py-2 text-sm">
                <div className="mb-1 font-semibold">{l.label}</div>
                <BedsideEntryEditor entry={l} showDose={l.kind === "med"} onCancel={() => setEditingId(null)}
                  onSaved={next => { setLogs(x => x.map(y => y.id === l.id ? { ...y, ...next } : y).sort((a, b) => b.logged_at.localeCompare(a.logged_at))); setEditingId(null); }} />
              </li>
            ) : (
              <li key={l.id} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm">
                {l.kind === "med" ? <Pill className="h-4 w-4 text-primary" /> : <HeartHandshake className="h-4 w-4 text-secondary-foreground" />}
                <span className="min-w-0 flex-1 truncate">
                  <strong className="font-semibold">{l.label}</strong>{l.dose ? ` · ${l.dose}` : ""}{l.pain != null ? ` · pain ${l.pain}/10` : ""}
                  {l.note && <span className="text-muted-foreground"> — {l.note}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{fmt(l.logged_at)}</span>
                <button aria-label="Edit entry" onClick={() => setEditingId(l.id)} className="p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                <button aria-label="Remove entry" onClick={() => void remove(l.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Hospice team" subtitle="Who to call, and when"
        action={<Button size="sm" variant="ghost" onClick={() => setAdding(a => !a)}><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>}>
        {adding && (
          <div className="mb-3 grid gap-2 rounded-2xl border border-border/60 bg-card/60 p-3 sm:grid-cols-2">
            <Input placeholder="Name" value={m.name} onChange={e => setM({ ...m, name: e.target.value })} className="h-11" />
            <select value={m.role} onChange={e => setM({ ...m, role: e.target.value })} className="h-11 rounded-md border border-input bg-background px-3 text-sm">
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <Input placeholder="Phone" type="tel" value={m.phone} onChange={e => setM({ ...m, phone: e.target.value })} className="h-11" />
            <Input placeholder="Email" type="email" value={m.email} onChange={e => setM({ ...m, email: e.target.value })} className="h-11" />
            <Input placeholder="When to call (e.g. after-hours, pain not easing)" value={m.notes} onChange={e => setM({ ...m, notes: e.target.value })} className="h-11 sm:col-span-2" />
            <Button className="sm:col-span-2" onClick={addMember}>Save</Button>
          </div>
        )}
        {team.length === 0 ? <EmptyState title="No team members yet" hint="Add your hospice nurse and on-call line first." /> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {team.map(t => (
              <li key={t.id} className="rounded-2xl border border-border/60 bg-card/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate font-semibold">{t.name}</p><p className="text-xs text-accent-foreground">{t.role}</p></div>
                  <button aria-label={`Remove ${t.name}`} className="p-1 text-muted-foreground hover:text-destructive"
                    onClick={async () => { setTeam(x => x.filter(y => y.id !== t.id)); await supabase.from("care_providers").delete().eq("id", t.id); }}><Trash2 className="h-4 w-4" /></button>
                </div>
                {t.notes && <p className="mt-1 text-xs text-muted-foreground">{t.notes}</p>}
                <div className="mt-2 flex gap-2">
                  {t.phone && <Button asChild size="sm" variant="outline"><a href={`tel:${t.phone}`}><Phone className="mr-1 h-3.5 w-3.5" />Call</a></Button>}
                  {t.email && <Button asChild size="sm" variant="outline"><a href={`mailto:${t.email}`}><Mail className="mr-1 h-3.5 w-3.5" />Email</a></Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
