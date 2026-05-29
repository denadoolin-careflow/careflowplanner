import { useMemo, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Home, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  useCaregivingChores, caregivingChores,
  CHORE_CADENCES, CHORE_CADENCE_LABEL, type ChoreCadence,
} from "@/lib/caregiving-chores";
import type { CareRecipient } from "@/lib/types";

const ZONE_OPTIONS = [
  "", "Kitchen", "Bathrooms", "Bedrooms", "Laundry",
  "Living Room", "Playroom", "Outdoors", "Whole home",
];

export function CareChoresPanel({ recipient }: { recipient: CareRecipient }) {
  const all = useCaregivingChores();
  const list = useMemo(
    () => all.filter(c => c.recipient_id === recipient.id),
    [all, recipient.id]
  );

  const [title, setTitle] = useState("");
  const [zone, setZone] = useState("");
  const [cadence, setCadence] = useState<ChoreCadence>("weekly");
  const [assigned, setAssigned] = useState("");
  const [est, setEst] = useState("");
  const [notes, setNotes] = useState("");

  async function add() {
    if (!title.trim()) return;
    await caregivingChores.create({
      recipient_id: recipient.id,
      title: title.trim(),
      zone: zone || null,
      cadence,
      assigned_to: assigned.trim() || null,
      est_minutes: est ? Number(est) : null,
      notes: notes.trim() || null,
    });
    setTitle(""); setEst(""); setNotes("");
  }

  const grouped = useMemo(() => {
    const m: Record<string, typeof list> = {};
    list.forEach(c => {
      const k = c.zone || "Unzoned";
      (m[k] ||= []).push(c);
    });
    return m;
  }, [list]);

  return (
    <div className="space-y-5">
      <SectionCard title={`Chores for ${recipient.name}`} subtitle="Ongoing care tasks — surfaced in matching Home zones" accent="warm">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Chore</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sort laundry, refill meds…" />
          </div>
          <div>
            <Label>Home zone</Label>
            <select value={zone} onChange={e => setZone(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1.5 text-sm">
              {ZONE_OPTIONS.map(z => <option key={z} value={z}>{z || "— none —"}</option>)}
            </select>
          </div>
          <div>
            <Label>Cadence</Label>
            <select value={cadence} onChange={e => setCadence(e.target.value as ChoreCadence)} className="w-full rounded-md border bg-background px-2 py-1.5 text-sm">
              {CHORE_CADENCES.map(c => <option key={c} value={c}>{CHORE_CADENCE_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <Label>Assigned to</Label>
            <Input value={assigned} onChange={e => setAssigned(e.target.value)} placeholder="me, partner…" />
          </div>
          <div>
            <Label>Est. minutes</Label>
            <Input type="number" value={est} onChange={e => setEst(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={add} disabled={!title.trim()} className="rounded-full">
            <Plus className="mr-1 h-4 w-4" /> Add chore
          </Button>
        </div>
      </SectionCard>

      {list.length === 0 ? (
        <SectionCard accent="calm">
          <p className="text-sm text-muted-foreground">
            No chores yet. Add a few above — anything tagged with a Home zone will also surface in that zone on the Home Hub.
          </p>
        </SectionCard>
      ) : (
        Object.entries(grouped).map(([zoneName, chores]) => (
          <SectionCard key={zoneName} title={zoneName} accent="calm">
            <ul className="space-y-1.5">
              {chores.map(c => (
                <li key={c.id} className="group flex items-center gap-2 rounded-xl border bg-background/60 px-3 py-2 text-sm">
                  <Checkbox checked={c.done} onCheckedChange={() => caregivingChores.toggle(c.id)} />
                  <div className="min-w-0 flex-1">
                    <div className={c.done ? "line-through opacity-60" : ""}>{c.title}</div>
                    <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                      <span>{CHORE_CADENCE_LABEL[c.cadence]}</span>
                      {c.assigned_to && <span>· {c.assigned_to}</span>}
                      {c.est_minutes && <span>· {c.est_minutes} min</span>}
                      {c.linked_task_id && <span className="text-primary">· in Home</span>}
                    </div>
                  </div>
                  {!c.linked_task_id && (
                    <button
                      onClick={async () => {
                        await caregivingChores.sendToHome(c.id);
                        toast.success("Sent to Home tasks");
                      }}
                      className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                      aria-label="Send to Home"
                      title="Send to Home tasks"
                    >
                      <Home className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => caregivingChores.remove(c.id)}
                    className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>
        ))
      )}
    </div>
  );
}