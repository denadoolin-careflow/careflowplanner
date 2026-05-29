import { useMemo, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarHeart, Plus, Trash2, Bell, Settings2 } from "lucide-react";
import { formatDistanceToNowStrict, format } from "date-fns";
import {
  useCheckins, checkinsStore,
  type CheckinCadence, type PersonCheckin,
} from "@/lib/checkins";
import { useCycle } from "@/lib/cycle-store";
import { phaseForDate, type CyclePhase } from "@/lib/cycle";
import type { CareRecipient } from "@/lib/types";

const PHASES: CyclePhase[] = ["menstrual", "follicular", "ovulatory", "luteal"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_LABEL: Record<string, string> = {
  sun: "Su", mon: "Mo", tue: "Tu", wed: "We", thu: "Th", fri: "Fr", sat: "Sa",
};

function supportsCycle(recipient: CareRecipient): boolean {
  // Cycle scheduling only meaningful for self and partner profiles.
  return recipient.kind === "self" || recipient.kind === "partner";
}

export function PersonCheckinsSection({ recipient }: { recipient: CareRecipient }) {
  const all = useCheckins();
  const { periods, settings } = useCycle();
  const [manageOpen, setManageOpen] = useState(false);
  const [respondTarget, setRespondTarget] = useState<PersonCheckin | null>(null);

  const list = useMemo(
    () => all.filter(c => c.recipient_id === recipient.id),
    [all, recipient.id]
  );

  return (
    <SectionCard
      title="Check-ins"
      subtitle="Cycle-aware wellbeing prompts"
      accent="calm"
      action={
        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setManageOpen(true)}>
          <Settings2 className="mr-1 h-3.5 w-3.5" /> Manage
        </Button>
      }
    >
      {list.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Schedule gentle check-ins for {recipient.name} — track mood, energy, milestones over time.
          </p>
          <Button size="sm" className="rounded-full" onClick={() => setManageOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add check-in
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map(c => {
            const due = c.next_due_at ? new Date(c.next_due_at) : null;
            const isDue = !due || due <= new Date();
            return (
              <li key={c.id} className="rounded-xl border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <CalendarHeart className="h-3.5 w-3.5 text-primary" />
                      {c.title}
                    </div>
                    {c.prompt && <p className="text-xs text-muted-foreground">{c.prompt}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {describeCadence(c)} ·{" "}
                      {due ? (isDue ? <span className="text-primary">due now</span> :
                        <>in {formatDistanceToNowStrict(due)}</>) : "—"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isDue ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setRespondTarget(c)}
                  >
                    <Bell className="mr-1 h-3 w-3" /> Respond
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ManageDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        recipient={recipient}
        checkins={list}
      />
      {respondTarget && (
        <RespondDialog
          open={!!respondTarget}
          onOpenChange={(o) => { if (!o) setRespondTarget(null); }}
          checkin={respondTarget}
          recipient={recipient}
          periods={periods}
          settings={settings}
        />
      )}
    </SectionCard>
  );
}

function describeCadence(c: PersonCheckin): string {
  switch (c.cadence) {
    case "daily": return "Daily";
    case "weekly": return "Weekly";
    case "custom_days":
      return (c.cadence_config.days ?? []).map(d => WEEKDAY_LABEL[d] ?? d).join(" ") || "Custom";
    case "cycle_phase": return `Cycle: ${c.cadence_config.phase ?? "—"}`;
  }
}

function ManageDialog({
  open, onOpenChange, recipient, checkins,
}: { open: boolean; onOpenChange: (o: boolean) => void; recipient: CareRecipient; checkins: PersonCheckin[] }) {
  const { periods, settings } = useCycle();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cadence, setCadence] = useState<CheckinCadence>("weekly");
  const [phase, setPhase] = useState<CyclePhase>("luteal");
  const [days, setDays] = useState<string[]>(["mon", "thu"]);

  const cycleOk = supportsCycle(recipient) && settings.enabled && periods.length > 0;

  async function add() {
    if (!title.trim()) return;
    const cfg =
      cadence === "cycle_phase" ? { phase } :
      cadence === "custom_days" ? { days } :
      {};
    await checkinsStore.create(recipient.id, {
      title: title.trim(),
      prompt: prompt.trim() || undefined,
      cadence,
      cadence_config: cfg,
    }, periods, settings);
    setTitle(""); setPrompt("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Check-ins for {recipient.name}</DialogTitle></DialogHeader>

        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New check-in</div>
          <div><Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Energy check, school reflection…" />
          </div>
          <div><Label>Prompt (optional)</Label>
            <Textarea rows={2} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="What helped today? What felt hard?" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Cadence</Label>
              <select value={cadence} onChange={e => setCadence(e.target.value as CheckinCadence)}
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom_days">Custom days</option>
                {supportsCycle(recipient) && <option value="cycle_phase">Cycle phase</option>}
              </select>
            </div>
            {cadence === "cycle_phase" && (
              <div>
                <Label>Phase</Label>
                <select value={phase} onChange={e => setPhase(e.target.value as CyclePhase)}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm">
                  {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
          </div>
          {cadence === "custom_days" && (
            <div>
              <Label>Days</Label>
              <div className="flex gap-1">
                {WEEKDAYS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(days.includes(d) ? days.filter(x => x !== d) : [...days, d])}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                      days.includes(d) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >{WEEKDAY_LABEL[d]}</button>
                ))}
              </div>
            </div>
          )}
          {cadence === "cycle_phase" && !cycleOk && (
            <p className="text-xs text-muted-foreground">
              No cycle data for this profile yet — reminders will fall back to weekly.
            </p>
          )}
          <Button size="sm" onClick={add} disabled={!title.trim()}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>

        <div className="mt-2 space-y-1.5">
          {checkins.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 p-2 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{c.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {describeCadence(c)}
                  {c.next_due_at && ` · next ${format(new Date(c.next_due_at), "MMM d")}`}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => checkinsStore.update(c.id, { active: !c.active } as any)}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground"
                >{c.active ? "on" : "off"}</button>
                <button onClick={() => checkinsStore.remove(c.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {checkins.length === 0 && (
            <p className="text-xs text-muted-foreground">No check-ins yet.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RespondDialog({
  open, onOpenChange, checkin, recipient, periods, settings,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  checkin: PersonCheckin;
  recipient: CareRecipient;
  periods: any;
  settings: any;
}) {
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [notes, setNotes] = useState("");

  async function save() {
    let phase: string | null = null;
    if (supportsCycle(recipient)) {
      try { phase = phaseForDate(new Date(), periods, settings) ?? null; } catch { phase = null; }
    }
    await checkinsStore.recordResponse(checkin, {
      mood, energy, notes: notes.trim() || undefined, cycle_phase: phase,
    }, periods, settings);
    setNotes("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{checkin.title}</DialogTitle>
        </DialogHeader>
        {checkin.prompt && <p className="text-sm text-muted-foreground">{checkin.prompt}</p>}
        <div className="space-y-4">
          <ScaleRow label="Mood" value={mood} onChange={setMood} lo="rough" hi="bright" />
          <ScaleRow label="Energy" value={energy} onChange={setEnergy} lo="low" hi="high" />
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScaleRow({ label, value, onChange, lo, hi }: { label: string; value: number; onChange: (n: number) => void; lo: string; hi: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <Label className="m-0">{label}</Label>
        <span className="text-muted-foreground">{lo} → {hi}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex h-9 flex-1 items-center justify-center rounded-lg text-sm font-medium transition ${
              value === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >{n}</button>
        ))}
      </div>
    </div>
  );
}