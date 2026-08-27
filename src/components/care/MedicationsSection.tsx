import { useMemo, useState } from "react";
import { Pill, Plus, Trash2, Check, X, Clock } from "lucide-react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";
import {
  useMedications, useMedicationLogs, doseSlots, todayISO,
  type Medication,
} from "@/lib/medications";

function timeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m || 0).padStart(2, "0")} ${ampm}`;
}

function MedDialog({ med, onDone }: { med?: Medication; onDone?: () => void }) {
  const { api } = useMedications();
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(med?.name ?? "");
  const [dose, setDose] = useState(med?.dose ?? "");
  const [notes, setNotes] = useState(med?.notes ?? "");
  const [times, setTimes] = useState<string[]>(med?.times ?? ["08:00"]);
  const [recipientId, setRecipientId] = useState<string>(med?.recipient_id ?? "");

  const save = async () => {
    const clean = times.filter(Boolean);
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      dose: dose.trim() || null,
      notes: notes.trim() || null,
      times: clean,
      recipient_id: recipientId || null,
    };
    if (med) await api.update(med.id, payload);
    else await api.create(payload);
    setOpen(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {med
          ? <button type="button" className="text-left text-sm font-medium hover:text-primary">{med.name}</button>
          : <Button size="sm" variant="outline"><Plus className="mr-1 h-3.5 w-3.5" />Add medication</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{med ? "Edit medication" : "New medication"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Levothyroxine)" />
          <Input value={dose} onChange={e => setDose(e.target.value)} placeholder="Dose (e.g. 50mcg)" />
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">For</p>
            <select
              aria-label="Who this medication is for"
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Me</option>
              {(state.recipients ?? []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Reminder times</p>
            <div className="space-y-1.5">
              {times.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="time" value={t} aria-label={`Reminder time ${i + 1}`}
                    onChange={e => setTimes(ts => ts.map((x, j) => j === i ? e.target.value : x))}
                    className="h-9"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8"
                    aria-label="Remove time"
                    onClick={() => setTimes(ts => ts.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setTimes(ts => [...ts, "12:00"])}>
                <Plus className="mr-1 h-3.5 w-3.5" />Add a time
              </Button>
            </div>
          </div>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (with food, side effects…)" rows={2} />
          <div className="flex justify-between">
            {med && (
              <Button variant="ghost" size="sm" className="text-destructive"
                onClick={async () => { await api.remove(med.id); setOpen(false); }}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />Delete
              </Button>
            )}
            <Button size="sm" className="ml-auto" onClick={save}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Medications for you and each care person, plus today's dose checklist. */
export function MedicationsSection() {
  const { medications: meds } = useMedications();
  const { state } = useStore();
  const iso = todayISO();
  const { statusOf, setStatus } = useMedicationLogs(iso);

  const slots = useMemo(() => doseSlots(meds), [meds]);
  const nameFor = (id: string | null) =>
    id ? ((state.recipients ?? []).find(r => r.id === id)?.name ?? "Someone") : "Me";

  const groups = useMemo(() => {
    const m = new Map<string, Medication[]>();
    for (const med of meds) {
      const k = nameFor(med.recipient_id);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(med);
    }
    return [...m.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meds, state.recipients]);

  return (
    <SectionCard
      title="Medications"
      subtitle="Scheduled doses for you and the people you care for."
      accent="calm"
      action={<MedDialog />}
    >
      {meds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No medications yet. Add one to get gentle dose reminders on the planner.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Today</p>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No doses scheduled today.</p>
            ) : (
              <ul className="space-y-1.5">
                {slots.map(s => {
                  const st = statusOf(s.med.id, s.time);
                  return (
                    <li key={`${s.med.id}-${s.time}`}
                      className={cn("flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm",
                        st === "taken" && "opacity-70")}>
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="w-20 shrink-0 font-mono text-xs">{timeLabel(s.time)}</span>
                      <span className={cn("min-w-0 flex-1 truncate", st === "taken" && "line-through")}>
                        {s.med.name}{s.med.dose ? ` · ${s.med.dose}` : ""}
                      </span>
                      <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
                        {nameFor(s.med.recipient_id)}
                      </span>
                      <Button
                        size="sm" variant={st === "taken" ? "default" : "outline"} className="h-7 px-2 text-[11px]"
                        onClick={() => { haptics.snap(); void setStatus(s.med.id, s.time, st === "taken" ? null : "taken"); }}
                      >
                        <Check className="mr-1 h-3 w-3" />Taken
                      </Button>
                      <Button
                        size="sm" variant={st === "skipped" ? "secondary" : "ghost"} className="h-7 px-2 text-[11px]"
                        onClick={() => void setStatus(s.med.id, s.time, st === "skipped" ? null : "skipped")}
                      >
                        Skip
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {groups.map(([person, list]) => (
            <div key={person}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{person}</p>
              <ul className="space-y-1.5">
                {list.map(med => (
                  <li key={med.id} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2">
                    <Pill className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <MedDialog med={med} />
                      <p className="truncate text-[11px] text-muted-foreground">
                        {[med.dose, med.times.map(timeLabel).join(", ")].filter(Boolean).join(" · ") || "No times set"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
