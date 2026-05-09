import { useState } from "react";
import { useStore, todayISO } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Pill, AlertCircle, HeartHandshake, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function Caregiving() {
  const { state, addCareNote, deleteCareNote } = useStore();
  const [recipientId, setRecipientId] = useState(state.recipients[0]?.id ?? "");
  const [body, setBody] = useState("");
  const recipient = state.recipients.find(r => r.id === recipientId);
  const notes = state.careNotes.filter(n => n.recipientId === recipientId).sort((a,b) => b.date.localeCompare(a.date));
  const appts = state.appointments.filter(a => a.recipientId === recipientId);

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-calm p-6">
        <h2 className="font-display text-3xl font-semibold">Caregiving hub</h2>
        <p className="mt-1 text-sm text-muted-foreground">The people you hold — gathered in one calm place.</p>
      </div>

      <div className="cozy-card flex flex-wrap gap-2 p-4">
        {state.recipients.map(r => (
          <Button key={r.id} variant={r.id === recipientId ? "default" : "outline"} className="rounded-full" onClick={() => setRecipientId(r.id)}>
            <HeartHandshake className="mr-2 h-4 w-4" />{r.name}
          </Button>
        ))}
      </div>

      {recipient && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SectionCard title={`About ${recipient.name}`} subtitle={recipient.kind} accent="calm">
            <p className="text-sm text-muted-foreground">{recipient.notes ?? "—"}</p>
            {recipient.sensory && (<>
              <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Sensory & preferences</div>
              <p className="text-sm">{recipient.sensory}</p>
            </>)}
          </SectionCard>

          <SectionCard title="Important contacts" accent="warm">
            {(recipient.contacts ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No contacts yet.</p> :
              <ul className="space-y-1.5">{recipient.contacts!.map((c,i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">{c.name} <span className="text-xs text-muted-foreground">· {c.role}</span></div>
                  {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                </li>
              ))}</ul>}
          </SectionCard>

          <SectionCard title="Medications" accent="sage">
            {(recipient.meds ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No medications listed.</p> :
              <ul className="space-y-1.5">{recipient.meds!.map((m,i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <Pill className="h-4 w-4 text-secondary-foreground" />
                  <span className="flex-1">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.dose} · {m.schedule}</span>
                </li>
              ))}</ul>}
          </SectionCard>

          <SectionCard title="Upcoming appointments" accent="calm">
            {appts.length === 0 ? <p className="text-sm text-muted-foreground">Linked appointments will appear here.</p> :
              <ul className="space-y-1.5 text-sm">{appts.map(a => <li key={a.id} className="rounded-lg bg-muted/40 px-3 py-2">{a.title} <span className="text-xs text-muted-foreground">· {format(parseISO(a.date), "MMM d")} {a.time ?? ""}</span></li>)}</ul>}
          </SectionCard>

          <SectionCard title="Caregiving journal" accent="warm" className="lg:col-span-2">
            <Textarea rows={3} placeholder="Add a note for the care log…" value={body} onChange={e => setBody(e.target.value)} />
            <Button className="mt-2" onClick={() => { if (!body.trim()) return; addCareNote({ recipientId, body }); setBody(""); }}>Save note</Button>
            <ul className="mt-4 space-y-2">
              {notes.map(n => (
                <li key={n.id} className="group flex items-start gap-3 rounded-xl bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">{format(parseISO(n.date), "MMM d")}</div>
                  <p className="flex-1 text-sm">{n.body}</p>
                  <button onClick={() => deleteCareNote(n.id)} className="opacity-0 group-hover:opacity-60"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Emergency info" accent="warm" className="lg:col-span-2">
            <div className="rounded-xl border border-accent/40 bg-accent-soft p-4 text-accent-foreground">
              <div className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Quick reference</div>
              <p className="mt-2 text-sm">{recipient.name} · {recipient.kind} · Allergies: none on file · ICE contact: see Important contacts above.</p>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
