/**
 * Per-person bedside plan: care notes, recurring medicine reminders and
 * today's meals for one care recipient. Meds reuse `medications` +
 * `medication_logs`; reminders use the shared medication scheduler; meals are
 * planner meals linked to the person via meal_people.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { useMedications, useMedicationLogs, todayISO } from "@/lib/medications";
import { useMealPeople, linkMealPerson } from "@/lib/meal-people";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Pill, Plus, Trash2, Utensils, CalendarPlus, Pencil } from "lucide-react";
import { BedsideEntryEditor } from "@/components/care/BedsideEntryEditor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useMealCompletion } from "@/lib/meal-completion";
import { legacyMedicineReminders, mealsOnCareDate, parseDoseTimes } from "@/lib/bedside-plan";

const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack", "Drink"] as const;

export function BedsidePersonPlan({ personId, personName }: { personId: string; personName: string }) {
  const { state, addMeal, deleteTask, updateMeal } = useStore();
  const today = todayISO();
  const { medications, api } = useMedications();
  const { statusOf, setStatus } = useMedicationLogs(today);
  const meds = medications.filter(m => m.recipient_id === personId && m.active);

  const [notes, setNotes] = useState<{ id: string; note: string; logged_at: string }[]>([]);
  const [noteText, setNoteText] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [medForm, setMedForm] = useState({ name: "", dose: "", times: "08:00" });
  const [mealForm, setMealForm] = useState({ name: "", slot: "Lunch" as (typeof SLOTS)[number], time: "", repeat: false });
  const [saving, setSaving] = useState(false);
  const { done: mealsDone, toggle: toggleMeal } = useMealCompletion(today);
  const run = async (action: () => Promise<unknown>) => {
    setSaving(true);
    try { await action(); } catch { toast.error("Couldn’t save this change. Please try again."); }
    finally { setSaving(false); }
  };

  const loadNotes = async () => {
    const { data } = await supabase.from("bedside_logs").select("id,note,logged_at")
      .eq("recipient_id", personId).eq("kind", "note").order("logged_at", { ascending: false }).limit(20);
    setNotes((data ?? []) as any);
  };
  useEffect(() => { void loadNotes(); }, [personId]);


  const todaysMeals = useMemo(() => mealsOnCareDate(state.meals, today), [state.meals, today]);
  const { links } = useMealPeople(todaysMeals.map((m: any) => m.id));
  const myLinks = links.filter(l => l.personId === personId);
  const myMeals = myLinks.map(l => ({ link: l, meal: todaysMeals.find((m: any) => m.id === l.mealId) })).filter(x => x.meal);

  const addNote = async () => {
    if (!noteText.trim()) return;
    const { error } = await supabase.from("bedside_logs").insert({ kind: "note", label: "Note", note: noteText.trim(), recipient_id: personId } as any);
    if (error) return toast.error("Couldn't save");
    setNoteText(""); void loadNotes();
  };

  const addMed = async () => {
    const times = parseDoseTimes(medForm.times);
    if (!medForm.name.trim() || times.length === 0) return toast.error("Add a name and valid times like 08:00, 20:00");
    const id = await api.create({ name: medForm.name.trim(), dose: medForm.dose || null, times, recipient_id: personId });
    if (!id) throw new Error("Couldn't save medicine");
    setMedForm({ name: "", dose: "", times: "08:00" });
    toast.success("Reminder added to your planner, repeating daily");
  };

  const stopMed = async (med: (typeof meds)[number]) => {
    await api.update(med.id, { active: false });
    for (const task of legacyMedicineReminders(state.tasks, med, personName)) await deleteTask(task.id);
    toast.success("Medicine reminders stopped; past doses are kept");
  };

  const addPersonMeal = async () => {
    if (!mealForm.name.trim()) return toast.error("Add what they're eating");
    const id = await addMeal({ name: `${personName} · ${mealForm.name.trim()}`, date: today, slot: mealForm.slot, recurrenceRule: mealForm.repeat ? { freq: "daily", interval: 1 } : undefined, recurrenceSeriesId: mealForm.repeat ? crypto.randomUUID() : undefined });
    if (!id) return toast.error("Couldn't save");
    await linkMealPerson({ mealId: id, personId, personKind: "recipient", serveTime: mealForm.time || null });
    setMealForm({ name: "", slot: mealForm.slot, time: "", repeat: mealForm.repeat });
    toast.success(mealForm.repeat ? "Meal added to your planner, repeating daily" : "Meal added to today's planner");
  };

  return (
    <>
      <SectionCard title={`${personName}'s medicines`} subtitle="Daily reminders that also appear on your planner">
        {meds.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {meds.flatMap(m => m.times.map(t => {
              const taken = statusOf(m.id, t) === "taken";
              return (
                <li key={m.id + t} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm">
                  <Button variant="ghost" size="icon" disabled={saving} aria-pressed={taken} aria-label={taken ? "Mark not taken" : "Mark taken"}
                    onClick={() => void run(() => setStatus(m.id, t, taken ? null : "taken"))}
                    className={cn("flex h-8 w-8 items-center justify-center rounded-full border", taken ? "border-secondary bg-secondary text-secondary-foreground" : "border-border")}>
                    {taken && <Check className="h-4 w-4" />}
                  </Button>
                  <Pill className="h-4 w-4 text-primary" />
                  <span className={cn("flex-1 truncate", taken && "text-muted-foreground line-through")}><strong>{m.name}</strong>{m.dose ? ` · ${m.dose}` : ""}</span>
                  <span className="text-xs text-muted-foreground">{t}</span>
                  <Button variant="ghost" size="icon" disabled={saving} aria-label={`Stop ${m.name}`} onClick={() => void run(() => stopMed(m))} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </li>
              );
            }))}
          </ul>
        )}
        <div className="grid gap-2 sm:grid-cols-[1fr_7rem_9rem_auto]">
          <Input placeholder="Medicine" value={medForm.name} onChange={e => setMedForm({ ...medForm, name: e.target.value })} className="h-11" />
          <Input placeholder="Amount" value={medForm.dose} onChange={e => setMedForm({ ...medForm, dose: e.target.value })} className="h-11" />
          <Input placeholder="08:00, 20:00" aria-label="Times" value={medForm.times} onChange={e => setMedForm({ ...medForm, times: e.target.value })} className="h-11" />
          <Button className="h-11" disabled={saving} onClick={() => void run(addMed)}><CalendarPlus className="mr-1 h-4 w-4" />Add</Button>
        </div>
      </SectionCard>

      <SectionCard title={`${personName}'s meals today`} subtitle="Shows on your planner — tick when eaten">
        {myMeals.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {myMeals.map(({ link, meal }: any) => (
              <li key={link.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm">
                <Button variant="ghost" size="icon" aria-pressed={!!mealsDone[meal.id]} aria-label={mealsDone[meal.id] ? "Mark not eaten" : "Mark eaten"}
                  onClick={() => void toggleMeal(meal.id)}
                  className={cn("flex h-8 w-8 items-center justify-center rounded-full border", mealsDone[meal.id] ? "border-secondary bg-secondary text-secondary-foreground" : "border-border")}>
                  {mealsDone[meal.id] && <Check className="h-4 w-4" />}
                </Button>
                <Utensils className="h-4 w-4 text-accent" />
                <span className={cn("flex-1 truncate", mealsDone[meal.id] && "text-muted-foreground line-through")}><strong>{meal.slot}</strong> · {meal.name}</span>
                {link.serveTime && <span className="text-xs text-muted-foreground">{link.serveTime.slice(0, 5)}</span>}
                {meal.recurrenceRule && <Button variant="ghost" size="icon" aria-label={`Stop repeating ${meal.name}`} onClick={() => void run(() => updateMeal(meal.id, { recurrenceRule: null as any }))}><Trash2 className="h-4 w-4" /></Button>}
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 sm:grid-cols-[1fr_8rem_7rem_auto]">
          <Input placeholder="What they'll eat" value={mealForm.name} onChange={e => setMealForm({ ...mealForm, name: e.target.value })} className="h-11" />
          <select aria-label="Meal" value={mealForm.slot} onChange={e => setMealForm({ ...mealForm, slot: e.target.value as any })} className="h-11 rounded-md border border-input bg-background px-3 text-sm">
            {SLOTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <Input type="time" aria-label="Serve time" value={mealForm.time} onChange={e => setMealForm({ ...mealForm, time: e.target.value })} className="h-11" />
          <Button className="h-11" disabled={saving} onClick={() => void run(addPersonMeal)}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
          <Checkbox checked={mealForm.repeat} onCheckedChange={checked => setMealForm({ ...mealForm, repeat: checked === true })} />Repeat daily
        </label>
      </SectionCard>

      <SectionCard title={`Notes about ${personName}`} subtitle="Shared care notes">
        <div className="flex gap-2">
          <Input value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && void run(addNote)} placeholder="Wishes, changes, what helped today…" className="h-11" />
          <Button className="h-11" disabled={saving} onClick={() => void run(addNote)}>Save</Button>
        </div>
        {notes.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {notes.map(n => editingNote === n.id ? (
              <li key={n.id} className="rounded-lg border border-primary/40 bg-card/60 px-3 py-2 text-sm">
                <BedsideEntryEditor entry={n} requireNote onCancel={() => setEditingNote(null)}
                  onSaved={next => { setNotes(x => x.map(y => y.id === n.id ? { ...y, logged_at: next.logged_at, note: next.note ?? "" } : y).sort((a, b) => b.logged_at.localeCompare(a.logged_at))); setEditingNote(null); }} />
              </li>
            ) : (
              <li key={n.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm">
                <span className="flex-1">{n.note}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(n.logged_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                <Button variant="ghost" size="icon" aria-label="Edit note" onClick={() => setEditingNote(n.id)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Remove note" onClick={() => void run(async () => { const { error } = await supabase.from("bedside_logs").delete().eq("id", n.id); if (error) throw error; setNotes(x => x.filter(y => y.id !== n.id)); })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
