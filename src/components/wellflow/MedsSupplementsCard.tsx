/**
 * Medicines and supplements inside WellFlow — today's doses with one-tap
 * taken/skip, plus a small add form. Tracking only: no dose advice.
 */
import { useMemo, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Pill, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MED_KINDS, doseSlots, scheduleMedicationReminders, useMedicationLogs, useMedications,
} from "@/lib/medications";
import { todayISO } from "@/lib/wellflow/types";

const timeLabel = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m || 0).padStart(2, "0")} ${ampm}`;
};

export function MedsSupplementsCard({ date = todayISO() }: { date?: string }) {
  const { medications: meds, api } = useMedications();
  const { setStatus, statusOf } = useMedicationLogs(date);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [time, setTime] = useState("08:00");
  const [kind, setKind] = useState<string>("supplement");

  const slots = useMemo(() => doseSlots(meds), [meds]);

  const add = async () => {
    if (!name.trim()) { toast.error("Give it a name"); return; }
    await api.create({ name: name.trim(), dose: dose.trim() || null, times: [time], kind });
    void scheduleMedicationReminders();
    toast.success(`${name.trim()} added`);
    setName(""); setDose(""); setAdding(false);
  };

  return (
    <SectionCard
      title="Medicines & supplements"
      subtitle="Today's doses — tracking only, never dose advice"
      accent="warm"
      action={
        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setAdding(a => !a)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      }
    >
      {adding && (
        <div className="mb-3 space-y-2 rounded-2xl border border-border/50 bg-card/60 p-3">
          <div className="flex flex-wrap gap-1.5">
            {MED_KINDS.map(k => (
              <button key={k.key} type="button" onClick={() => setKind(k.key)} aria-pressed={kind === k.key}
                      className={cn("min-h-[2.25rem] rounded-full border px-3 text-xs",
                        kind === k.key ? "border-primary bg-primary/15 font-medium" : "border-border/60 bg-card/50 text-muted-foreground")}>
                {k.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label htmlFor="ms-name">Name</Label>
              <Input id="ms-name" className="h-11" value={name} onChange={e => setName(e.target.value)}
                     placeholder="Vitamin D" />
            </div>
            <div>
              <Label htmlFor="ms-dose">Dose</Label>
              <Input id="ms-dose" className="h-11" value={dose} onChange={e => setDose(e.target.value)}
                     placeholder="2000 IU" />
            </div>
            <div>
              <Label htmlFor="ms-time">Time</Label>
              <Input id="ms-time" type="time" className="h-11" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={add}>Save</Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {slots.length === 0 ? (
        <EmptyState title="Nothing scheduled" hint="Add a medicine or supplement to see today's doses here." />
      ) : (
        <ul className="space-y-1.5">
          {slots.map(s => {
            const status = statusOf(s.med.id, s.time);
            return (
              <li key={`${s.med.id}-${s.time}`}
                  className={cn("flex items-center gap-2 rounded-2xl border px-3 py-2",
                    status === "taken" ? "border-primary/40 bg-primary/10"
                      : status === "skipped" ? "border-border/40 bg-muted/30 opacity-70"
                      : "border-border/40 bg-card/50")}>
                <Pill className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {s.med.name}
                  <span className="text-muted-foreground">
                    {" "}· {timeLabel(s.time)}{s.med.dose ? ` · ${s.med.dose}` : ""}
                  </span>
                </span>
                <button type="button" aria-label={`Mark ${s.med.name} taken`}
                        className={cn("rounded-lg p-1.5", status === "taken" ? "text-primary" : "text-muted-foreground")}
                        onClick={() => void setStatus(s.med.id, s.time, status === "taken" ? null : "taken")}>
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" aria-label={`Skip ${s.med.name}`}
                        className={cn("rounded-lg p-1.5", status === "skipped" ? "text-foreground" : "text-muted-foreground")}
                        onClick={() => void setStatus(s.med.id, s.time, status === "skipped" ? null : "skipped")}>
                  <X className="h-4 w-4" />
                </button>
                <button type="button" aria-label={`Remove ${s.med.name}`}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                        onClick={async () => { await api.remove(s.med.id); toast.success("Removed"); }}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
