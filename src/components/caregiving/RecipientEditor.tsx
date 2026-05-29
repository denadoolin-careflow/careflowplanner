import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Phone, Pill, CalendarIcon, X, Sparkles, Droplet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { zodiacFor, ageFrom } from "@/lib/care-profile";
import { useStore } from "@/lib/store";
import type { CareRecipient } from "@/lib/types";
import { toast } from "sonner";

type Mode = "add" | "edit";
type Contact = { name: string; phone?: string; role?: string };
type Med = { name: string; dose?: string; schedule?: string };
type Cycle = NonNullable<CareRecipient["cycle"]>;

const KINDS: CareRecipient["kind"][] = ["self", "child", "elder", "partner", "pet"];
const ZODIACS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SEXES: { value: NonNullable<CareRecipient["sex"]>; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  { value: "prefer_not", label: "Prefer not to say" },
];
const DIAGNOSIS_SUGGESTIONS = [
  "Autism", "ADHD", "Anxiety", "Depression", "Asthma", "Type 1 diabetes",
  "Sensory Processing", "Dyslexia", "PCOS", "Endometriosis", "Migraine",
  "Eczema", "Allergies",
];

export function RecipientEditor({
  open,
  onOpenChange,
  mode,
  recipient,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: Mode;
  recipient?: CareRecipient | null;
  onDeleted?: () => void;
}) {
  const { addRecipient, updateRecipient, deleteRecipient } = useStore();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<CareRecipient["kind"]>("self");
  const [notes, setNotes] = useState("");
  const [sensory, setSensory] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meds, setMeds] = useState<Med[]>([]);
  const [birthDate, setBirthDate] = useState<string>("");
  const [zodiac, setZodiac] = useState<string>("");
  const [sex, setSex] = useState<CareRecipient["sex"] | "">("");
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [diagInput, setDiagInput] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [cycle, setCycle] = useState<Cycle>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && recipient) {
      setName(recipient.name);
      setKind(recipient.kind);
      setNotes(recipient.notes ?? "");
      setSensory(recipient.sensory ?? "");
      setContacts(recipient.contacts ?? []);
      setMeds(recipient.meds ?? []);
      setBirthDate(recipient.birthDate ?? "");
      setZodiac(recipient.zodiac ?? "");
      setSex(recipient.sex ?? "");
      setDiagnoses(recipient.diagnoses ?? []);
      setDiagnosisNotes(recipient.diagnosisNotes ?? "");
      setCycle(recipient.cycle ?? {});
    } else {
      setName(""); setKind("self"); setNotes(""); setSensory("");
      setContacts([]); setMeds([]);
      setBirthDate(""); setZodiac(""); setSex("");
      setDiagnoses([]); setDiagInput(""); setDiagnosisNotes("");
      setCycle({});
    }
  }, [open, mode, recipient]);

  const autoZodiac = zodiacFor(birthDate);
  const age = ageFrom(birthDate);
  const showCycle = sex === "female" && kind !== "pet";

  const addDiagnosis = (raw: string) => {
    const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setDiagnoses(prev => {
      const next = [...prev];
      for (const p of parts) {
        const clean = p.slice(0, 60);
        if (clean && !next.some(x => x.toLowerCase() === clean.toLowerCase()) && next.length < 20) {
          next.push(clean);
        }
      }
      return next;
    });
    setDiagInput("");
  };

  const cleanContacts = () => contacts.filter(c => c.name.trim());
  const cleanMeds = () => meds.filter(m => m.name.trim());

  const save = async () => {
    if (!name.trim()) { toast.error("A name helps the people you hold feel real."); return; }
    if (name.trim().length > 80) { toast.error("Name is a touch long — under 80 characters."); return; }
    setSaving(true);
    try {
      const payload: Partial<CareRecipient> & { name: string; kind: CareRecipient["kind"] } = {
        name: name.trim(),
        kind,
        notes: notes.trim() || undefined,
        sensory: sensory.trim() || undefined,
        contacts: cleanContacts(),
        meds: cleanMeds(),
        birthDate: birthDate || undefined,
        zodiac: (zodiac || autoZodiac) || undefined,
        sex: sex || undefined,
        diagnoses,
        diagnosisNotes: diagnosisNotes.trim() || undefined,
        cycle: showCycle ? cycle : {},
      };
      if (mode === "edit" && recipient) {
        await updateRecipient(recipient.id, payload);
        toast.success("Saved softly.");
      } else {
        await addRecipient(payload);
        toast.success(`${payload.name} added to your circle.`);
      }
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!recipient) return;
    if (!confirm(`Remove ${recipient.name} from your caregiving hub? Their notes will go too.`)) return;
    await deleteRecipient(recipient.id);
    toast("Removed.");
    onOpenChange(false);
    onDeleted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "edit" ? `Edit ${recipient?.name ?? "profile"}` : "Add a profile"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="who" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="who">Who</TabsTrigger>
            <TabsTrigger value="body">Body & being</TabsTrigger>
            <TabsTrigger value="care">Care details</TabsTrigger>
          </TabsList>

          {/* WHO */}
          <TabsContent value="who" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="re-name">Name</Label>
                <Input id="re-name" value={name} onChange={e => setName(e.target.value)} placeholder="Who are you caring for?" maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label>Relationship</Label>
                <Select value={kind} onValueChange={v => setKind(v as CareRecipient["kind"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KINDS.map(k => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Birth date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !birthDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {birthDate ? format(parseISO(birthDate), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={birthDate ? parseISO(birthDate) : undefined}
                      onSelect={(d) => setBirthDate(d ? format(d, "yyyy-MM-dd") : "")}
                      captionLayout="dropdown-buttons"
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                      disabled={(d) => d > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {age !== undefined && <Badge variant="secondary" className="rounded-full text-[10px]">Age {age}</Badge>}
                  {autoZodiac && !zodiac && <Badge variant="secondary" className="rounded-full text-[10px]"><Sparkles className="mr-1 h-2.5 w-2.5" />{autoZodiac}</Badge>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Zodiac</Label>
                <Select value={zodiac || autoZodiac || ""} onValueChange={setZodiac}>
                  <SelectTrigger><SelectValue placeholder="Pick zodiac sign" /></SelectTrigger>
                  <SelectContent>
                    {ZODIACS.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Auto-derived from birth date — feel free to override.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="re-notes">Personal notes</Label>
              <Textarea id="re-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What you want to remember about them…" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="re-sensory">Sensory & preferences</Label>
              <Textarea id="re-sensory" rows={2} value={sensory} onChange={e => setSensory(e.target.value)} placeholder="Soft lights, certain foods, a comforting routine…" />
            </div>
          </TabsContent>

          {/* BODY & BEING */}
          <TabsContent value="body" className="mt-4 space-y-4">
            <fieldset className="space-y-2 rounded-xl border border-border/60 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diagnoses</legend>
              <div className="flex flex-wrap gap-1.5">
                {diagnoses.map((d, i) => (
                  <Badge key={i} variant="secondary" className="rounded-full pl-3 pr-1 py-1">
                    {d}
                    <button
                      type="button"
                      className="ml-1 rounded-full p-0.5 hover:bg-background/60"
                      onClick={() => setDiagnoses(prev => prev.filter((_, j) => j !== i))}
                      aria-label={`Remove ${d}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {!diagnoses.length && <span className="text-xs text-muted-foreground">None added yet.</span>}
              </div>
              <div className="flex gap-2">
                <Input
                  value={diagInput}
                  onChange={e => setDiagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addDiagnosis(diagInput);
                    }
                  }}
                  placeholder="Type and press Enter…"
                  maxLength={60}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addDiagnosis(diagInput)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DIAGNOSIS_SUGGESTIONS.filter(s => !diagnoses.some(d => d.toLowerCase() === s.toLowerCase())).slice(0, 8).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addDiagnosis(s)}
                    className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                  >
                    + {s}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="re-diag-notes" className="text-xs text-muted-foreground">Diagnosis notes</Label>
                <Textarea
                  id="re-diag-notes"
                  rows={2}
                  value={diagnosisNotes}
                  onChange={e => setDiagnosisNotes(e.target.value)}
                  placeholder="Onset, providers, accommodations…"
                />
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <Label>Sex</Label>
              <Select value={sex || ""} onValueChange={(v) => setSex(v as CareRecipient["sex"])}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {SEXES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {showCycle && (
              <fieldset className="space-y-3 rounded-xl border border-border/60 p-3">
                <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Droplet className="h-3 w-3" /> Cycle
                </legend>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cycle-tracks" className="text-sm font-normal">Track cycle for this person</Label>
                  <Switch id="cycle-tracks" checked={!!cycle.tracks} onCheckedChange={(v) => setCycle(c => ({ ...c, tracks: v }))} />
                </div>
                {cycle.tracks && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Avg cycle length (days)</Label>
                        <Input
                          type="number" min={14} max={60}
                          value={cycle.avgLength ?? ""}
                          onChange={e => setCycle(c => ({ ...c, avgLength: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="28"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Avg period length (days)</Label>
                        <Input
                          type="number" min={1} max={14}
                          value={cycle.periodLength ?? ""}
                          onChange={e => setCycle(c => ({ ...c, periodLength: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="5"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Last period start</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !cycle.lastPeriodStart && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {cycle.lastPeriodStart ? format(parseISO(cycle.lastPeriodStart), "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={cycle.lastPeriodStart ? parseISO(cycle.lastPeriodStart) : undefined}
                            onSelect={(d) => setCycle(c => ({ ...c, lastPeriodStart: d ? format(d, "yyyy-MM-dd") : undefined }))}
                            disabled={(d) => d > new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cycle notes</Label>
                      <Textarea
                        rows={2}
                        value={cycle.notes ?? ""}
                        onChange={e => setCycle(c => ({ ...c, notes: e.target.value }))}
                        placeholder="Patterns, symptoms, what helps…"
                      />
                    </div>
                  </>
                )}
              </fieldset>
            )}
          </TabsContent>

          {/* CARE DETAILS */}
          <TabsContent value="care" className="mt-4 space-y-4">
            <fieldset className="space-y-2 rounded-xl border border-border/60 p-3">
              <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Phone className="h-3 w-3" /> Important contacts
              </legend>
              {contacts.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                  <Input placeholder="Name" value={c.name} onChange={e => setContacts(cs => cs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <Input placeholder="Role" value={c.role ?? ""} onChange={e => setContacts(cs => cs.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} />
                  <Input placeholder="Phone" value={c.phone ?? ""} onChange={e => setContacts(cs => cs.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setContacts(cs => cs.filter((_, j) => j !== i))} aria-label="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setContacts(cs => [...cs, { name: "" }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add contact
              </Button>
            </fieldset>

            <fieldset className="space-y-2 rounded-xl border border-border/60 p-3">
              <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Pill className="h-3 w-3" /> Medications
              </legend>
              {meds.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                  <Input placeholder="Name" value={m.name} onChange={e => setMeds(ms => ms.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <Input placeholder="Dose" value={m.dose ?? ""} onChange={e => setMeds(ms => ms.map((x, j) => j === i ? { ...x, dose: e.target.value } : x))} />
                  <Input placeholder="Schedule" value={m.schedule ?? ""} onChange={e => setMeds(ms => ms.map((x, j) => j === i ? { ...x, schedule: e.target.value } : x))} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setMeds(ms => ms.filter((_, j) => j !== i))} aria-label="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setMeds(ms => [...ms, { name: "" }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add medication
              </Button>
            </fieldset>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-2 gap-2 sm:justify-between">
          {mode === "edit" ? (
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={remove}>
              <Trash2 className="mr-1 h-4 w-4" /> Remove
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{mode === "edit" ? "Save" : "Add profile"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
