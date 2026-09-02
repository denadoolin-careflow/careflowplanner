import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/cards/SectionCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { Syringe, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  daysBetween, deleteInjection, nextInjectionDate, useGlp1Profile, useInjections,
} from "@/lib/wellflow/data";
import { todayISO, type Glp1Profile } from "@/lib/wellflow/types";

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Glp1Tab({ onInjection }: { onInjection: () => void }) {
  const { profile, loading, save } = useGlp1Profile();
  const { injections, last } = useInjections();
  const [draft, setDraft] = useState<Glp1Profile>(profile);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setDraft(profile); }, [profile]);

  const next = nextInjectionDate(last?.date ?? null, profile.frequency);
  const countdown = next ? daysBetween(todayISO(), next) : null;

  const set = <K extends keyof Glp1Profile>(k: K, v: Glp1Profile[K]) =>
    setDraft(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setBusy(true);
    try { await save(draft); toast.success("Saved"); }
    catch { toast.error("Could not save"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="My GLP-1"
        subtitle="Your medication, tracked your way"
        accent="sage"
        action={<Button size="sm" className="gap-1.5" onClick={onInjection}><Syringe className="h-4 w-4" /> Log</Button>}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Last injection</p>
            {last ? (
              <>
                <p className="text-sm font-semibold">
                  {format(parseISO(`${last.date}T12:00:00`), "MMM d, yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[last.medication, last.dose, last.injection_site].filter(Boolean).join(" • ") || "Logged"}
                </p>
              </>
            ) : <p className="text-sm text-muted-foreground">Nothing logged yet</p>}
          </div>
          <div className="rounded-2xl bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Next injection</p>
            {next ? (
              <>
                <p className="text-sm font-semibold">{format(parseISO(`${next}T12:00:00`), "MMM d, yyyy")}</p>
                <p className="text-xs text-muted-foreground">
                  {countdown != null && countdown > 0
                    ? `In ${countdown} day${countdown === 1 ? "" : "s"}`
                    : countdown === 0 ? "Today" : "Due"}
                </p>
              </>
            ) : <p className="text-sm text-muted-foreground">Log an injection to see this</p>}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Medication details" subtitle="Exactly as prescribed to you" collapsibleId="wellflow-glp1-profile">
        {loading ? (
          <div className="h-32 animate-pulse rounded-xl bg-muted/50" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="glp1-name">Medication name</Label>
              <Input id="glp1-name" value={draft.medication_name ?? ""}
                     onChange={e => set("medication_name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="glp1-dose">Prescribed dose</Label>
              <Input id="glp1-dose" value={draft.prescribed_dose ?? ""} placeholder="e.g. 2.5 mg"
                     onChange={e => set("prescribed_dose", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="glp1-freq">Frequency</Label>
              <Select value={draft.frequency ?? "weekly"} onValueChange={v => set("frequency", v)}>
                <SelectTrigger id="glp1-freq"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="glp1-day">Injection day</Label>
              <Select value={draft.injection_day ?? "none"}
                      onValueChange={v => set("injection_day", v === "none" ? null : v)}>
                <SelectTrigger id="glp1-day"><SelectValue placeholder="Not set" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="glp1-start">Start date</Label>
              <Input id="glp1-start" type="date" value={draft.start_date ?? ""}
                     onChange={e => set("start_date", e.target.value || null)} />
            </div>
            <div>
              <Label htmlFor="glp1-provider">Provider (optional)</Label>
              <Input id="glp1-provider" value={draft.provider ?? ""}
                     onChange={e => set("provider", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="glp1-notes">Notes</Label>
              <Textarea id="glp1-notes" rows={2} value={draft.notes ?? ""}
                        onChange={e => set("notes", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button disabled={busy} onClick={submit}>Save details</Button>
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          CareFlow never recommends, calculates, or changes a dose. Bring dose questions, persistent
          side effects, or severe symptoms to your healthcare professional.
        </p>
      </SectionCard>

      <SectionCard title="Injection history">
        {injections.length === 0 ? (
          <EmptyState title="No injections logged" hint="Log one and it will appear here with dose, site, and how you felt.">
            <Button size="sm" className="mt-2" onClick={onInjection}>Log an injection</Button>
          </EmptyState>
        ) : (
          <ul className="space-y-1.5">
            {injections.map(i => (
              <li key={i.id} className="flex items-start gap-3 rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Syringe className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {format(parseISO(`${i.date}T12:00:00`), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[i.medication, i.dose, i.injection_site].filter(Boolean).join(" • ") || "Logged"}
                  </p>
                  {i.symptoms.length > 0 && (
                    <p className="text-xs text-muted-foreground">{i.symptoms.join(", ")}</p>
                  )}
                  {i.notes && <p className="text-xs text-muted-foreground">{i.notes}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Delete injection"
                        onClick={async () => { await deleteInjection(i.id); toast.success("Injection removed"); }}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
