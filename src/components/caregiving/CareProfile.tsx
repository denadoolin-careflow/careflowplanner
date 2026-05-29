import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  CalendarIcon, Plus, Trash2, Stethoscope, Phone, Mail, MapPin, GraduationCap,
  School, Sparkles, FileHeart, Heart, ShieldAlert, Loader2, Pencil, Save, X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  useRecipientData, medicalHistory, careProviders, careAINotes,
  PROVIDER_ROLES, LOVE_LANGUAGES, EDUCATION_LEVELS, WEEKDAYS,
  zodiacFor, ageFrom,
} from "@/lib/care-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CareRecipient } from "@/lib/types";
import { aiInvoke } from "@/lib/ai-invoke";

const SLOTS = ["breakfast", "lunch", "dinner", "snacks"] as const;
type Slot = typeof SLOTS[number];

export function CareProfile({ recipient }: { recipient: CareRecipient }) {
  const { updateRecipient } = useStore();
  const { history, providers, aiNotes, reload } = useRecipientData(recipient.id);

  return (
    <Tabs defaultValue="profile" className="space-y-4">
      <TabsList className="flex w-full flex-wrap justify-start gap-1 rounded-xl bg-card/60 p-1">
        <TabsTrigger value="profile" className="rounded-lg text-xs">Profile</TabsTrigger>
        <TabsTrigger value="food" className="rounded-lg text-xs">Food</TabsTrigger>
        <TabsTrigger value="medical" className="rounded-lg text-xs">Medical</TabsTrigger>
        <TabsTrigger value="providers" className="rounded-lg text-xs">Providers</TabsTrigger>
        <TabsTrigger value="education" className="rounded-lg text-xs">Education</TabsTrigger>
        <TabsTrigger value="ai" className="rounded-lg text-xs">AI Notes</TabsTrigger>
      </TabsList>

      <TabsContent value="profile"><ProfileTab recipient={recipient} updateRecipient={updateRecipient} /></TabsContent>
      <TabsContent value="food"><FoodTab recipient={recipient} updateRecipient={updateRecipient} /></TabsContent>
      <TabsContent value="medical"><MedicalTab recipient={recipient} history={history} reload={reload} /></TabsContent>
      <TabsContent value="providers"><ProvidersTab recipient={recipient} providers={providers} reload={reload} /></TabsContent>
      <TabsContent value="education"><EducationTab recipient={recipient} updateRecipient={updateRecipient} /></TabsContent>
      <TabsContent value="ai"><AINotesTab recipient={recipient} history={history} providers={providers} aiNotes={aiNotes} reload={reload} /></TabsContent>
    </Tabs>
  );
}

/* ============== Profile core ============== */
function ProfileTab({
  recipient, updateRecipient,
}: { recipient: CareRecipient; updateRecipient: (id: string, p: Partial<CareRecipient>) => Promise<void> }) {
  const [birthDate, setBirthDate] = useState(recipient.birthDate ?? "");
  const [location, setLocation] = useState(recipient.location ?? "");
  const [loveLanguages, setLoveLanguages] = useState<string[]>(recipient.loveLanguages ?? []);
  const [ssnLast4, setSsnLast4] = useState(recipient.ssnLast4 ?? "");
  const [ssnFull, setSsnFull] = useState(recipient.ssnFull ?? "");
  const [showFull, setShowFull] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBirthDate(recipient.birthDate ?? "");
    setLocation(recipient.location ?? "");
    setLoveLanguages(recipient.loveLanguages ?? []);
    setSsnLast4(recipient.ssnLast4 ?? "");
    setSsnFull(recipient.ssnFull ?? "");
  }, [recipient.id]);

  const zodiac = useMemo(() => zodiacFor(birthDate) ?? recipient.zodiac, [birthDate, recipient.zodiac]);
  const age = ageFrom(birthDate);

  const save = async () => {
    setSaving(true);
    try {
      await updateRecipient(recipient.id, {
        birthDate: birthDate || undefined,
        location: location.trim() || undefined,
        zodiac: zodiac || undefined,
        loveLanguages,
        ssnLast4: ssnLast4.replace(/\D/g, "").slice(-4) || undefined,
        ssnFull: ssnFull.trim() || undefined,
      });
      toast.success("Profile saved");
    } finally { setSaving(false); }
  };

  const toggleLL = (l: string) =>
    setLoveLanguages(curr => curr.includes(l) ? curr.filter(x => x !== l) : [...curr, l]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Birth date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !birthDate && "text-muted-foreground")}>
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
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <div className="flex gap-1.5 text-xs text-muted-foreground">
            {age !== undefined && <span>Age {age}</span>}
            {zodiac && <Badge variant="secondary" className="rounded-full text-[10px]">♒ {zodiac}</Badge>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Location</Label>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" className="pl-8" />
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border/60 p-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Love languages</Label>
        <div className="flex flex-wrap gap-1.5">
          {LOVE_LANGUAGES.map(l => (
            <button
              key={l}
              type="button"
              onClick={() => toggleLL(l)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                loveLanguages.includes(l)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted/60",
              )}
            >
              <Heart className="mr-1 inline h-3 w-3" /> {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
        <div className="flex items-start gap-2 text-xs text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Social Security Numbers are stored in your secure database with row-level security.
            We strongly recommend keeping only the last 4 digits unless you really need the full SSN.
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">SSN — last 4</Label>
            <Input
              inputMode="numeric"
              maxLength={4}
              value={ssnLast4}
              onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Full SSN (optional)</Label>
            <div className="flex gap-1">
              <Input
                type={showFull ? "text" : "password"}
                value={ssnFull}
                onChange={(e) => setSsnFull(e.target.value)}
                placeholder="•••-••-••••"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setShowFull(s => !s)}>
                {showFull ? "Hide" : "Show"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save profile
        </Button>
      </div>
    </div>
  );
}

/* ============== Food ============== */
function FoodTab({
  recipient, updateRecipient,
}: { recipient: CareRecipient; updateRecipient: (id: string, p: Partial<CareRecipient>) => Promise<void> }) {
  const [prefs, setPrefs] = useState(recipient.foodPreferences ?? {});
  const [allergiesText, setAllergiesText] = useState((recipient.foodPreferences?.allergies ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrefs(recipient.foodPreferences ?? {});
    setAllergiesText((recipient.foodPreferences?.allergies ?? []).join(", "));
  }, [recipient.id]);

  // Pull meals library for suggestions
  const [libMeals, setLibMeals] = useState<{ id: string; title: string; slot: string | null }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("meals_library" as any).select("id,title,slot")
        .eq("is_archived", false).order("title");
      setLibMeals((data ?? []) as any);
    })();
  }, []);

  const updateSlot = (slot: Slot, patch: any) =>
    setPrefs(p => ({ ...p, [slot]: { ...(p as any)[slot], ...patch } }));

  const save = async () => {
    setSaving(true);
    try {
      const allergies = allergiesText.split(",").map(s => s.trim()).filter(Boolean);
      await updateRecipient(recipient.id, { foodPreferences: { ...prefs, allergies } });
      toast.success("Food preferences saved");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Allergies (comma separated)</Label>
        <Input value={allergiesText} onChange={(e) => setAllergiesText(e.target.value)} placeholder="e.g. peanuts, dairy" />
      </div>

      {SLOTS.map(slot => {
        const slotPrefs: any = (prefs as any)[slot] ?? {};
        const linkedIds: string[] = slotPrefs.mealIds ?? [];
        const slotMeals = libMeals.filter(m => !m.slot || m.slot === slot);
        return (
          <div key={slot} className="space-y-2 rounded-xl border border-border/60 p-3">
            <h3 className="font-display text-base capitalize">{slot}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Likes (comma separated)</Label>
                <Input
                  value={(slotPrefs.likes ?? []).join(", ")}
                  onChange={(e) => updateSlot(slot, { likes: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dislikes (comma separated)</Label>
                <Input
                  value={(slotPrefs.dislikes ?? []).join(", ")}
                  onChange={(e) => updateSlot(slot, { dislikes: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Linked meals from library</Label>
              <ScrollArea className="max-h-32 rounded-md border border-border/40 p-2">
                <div className="flex flex-wrap gap-1.5">
                  {slotMeals.length === 0 && <span className="text-xs italic text-muted-foreground">No meals in library yet.</span>}
                  {slotMeals.map(m => {
                    const on = linkedIds.includes(m.id);
                    return (
                      <button
                        key={m.id} type="button"
                        onClick={() => updateSlot(slot, { mealIds: on ? linkedIds.filter(x => x !== m.id) : [...linkedIds, m.id] })}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted/60",
                        )}
                      >{m.title}</button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            <Textarea
              rows={2}
              placeholder="Notes (textures, timing, who feeds them, etc.)"
              value={slotPrefs.notes ?? ""}
              onChange={(e) => updateSlot(slot, { notes: e.target.value })}
            />
          </div>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save food preferences
        </Button>
      </div>
    </div>
  );
}

/* ============== Medical history ============== */
function MedicalTab({
  recipient, history, reload,
}: { recipient: CareRecipient; history: any[]; reload: () => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<any>({ date: format(new Date(), "yyyy-MM-dd"), title: "", category: "", provider: "", notes: "" });

  const submit = async () => {
    if (!draft.title.trim()) { toast.error("Title required"); return; }
    await medicalHistory.add({
      recipient_id: recipient.id,
      date: draft.date,
      title: draft.title.trim(),
      category: draft.category || null,
      provider: draft.provider || null,
      notes: draft.notes || null,
    });
    setDraft({ date: format(new Date(), "yyyy-MM-dd"), title: "", category: "", provider: "", notes: "" });
    setAdding(false);
    await reload();
  };

  return (
    <div className="space-y-3">
      {adding ? (
        <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {draft.date ? format(parseISO(draft.date), "MMM d, yyyy") : "Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseISO(draft.date)}
                  onSelect={(d) => d && setDraft({ ...draft, date: format(d, "yyyy-MM-dd") })}
                  captionLayout="dropdown-buttons"
                  fromYear={1900}
                  toYear={new Date().getFullYear()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Input placeholder="Title (e.g. Knee surgery)" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <Input placeholder="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
          </div>
          <Input placeholder="Provider / hospital" value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} />
          <Textarea rows={2} placeholder="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={submit}>Add entry</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setAdding(true)} variant="outline" className="rounded-full">
          <Plus className="mr-1 h-4 w-4" /> Add medical entry
        </Button>
      )}

      {history.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/40 bg-card/30 p-4 text-center text-xs italic text-muted-foreground">
          No medical history recorded.
        </p>
      ) : (
        <ul className="space-y-2">
          {history.map(h => (
            <li key={h.id} className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileHeart className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{h.title}</span>
                  {h.category && <Badge variant="secondary" className="rounded-full text-[10px]">{h.category}</Badge>}
                  <span className="text-xs text-muted-foreground">{format(parseISO(h.date), "MMM d, yyyy")}</span>
                </div>
                {h.provider && <p className="text-xs text-muted-foreground">{h.provider}</p>}
                {h.notes && <p className="mt-1 text-sm whitespace-pre-wrap">{h.notes}</p>}
              </div>
              <button
                onClick={async () => { await medicalHistory.remove(h.id); await reload(); }}
                className="opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100"
                aria-label="Remove"
              ><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============== Providers ============== */
function ProvidersTab({
  recipient, providers, reload,
}: { recipient: CareRecipient; providers: any[]; reload: () => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<any>({ name: "", role: "doctor", specialty: "", phone: "", email: "", address: "", notes: "", next_appt: "" });

  const submit = async () => {
    if (!draft.name.trim()) { toast.error("Provider name required"); return; }
    await careProviders.add({
      recipient_id: recipient.id,
      name: draft.name.trim(),
      role: draft.role,
      specialty: draft.specialty || null,
      phone: draft.phone || null,
      email: draft.email || null,
      address: draft.address || null,
      notes: draft.notes || null,
      next_appt: draft.next_appt || null,
    });
    setDraft({ name: "", role: "doctor", specialty: "", phone: "", email: "", address: "", notes: "", next_appt: "" });
    setAdding(false);
    await reload();
  };

  return (
    <div className="space-y-3">
      {adding ? (
        <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Input placeholder="Name (Dr. Lee)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDER_ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Specialty" value={draft.specialty} onChange={(e) => setDraft({ ...draft, specialty: e.target.value })} />
            <Input placeholder="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            <Input placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {draft.next_appt ? format(parseISO(draft.next_appt), "MMM d, yyyy") : "Next appointment"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={draft.next_appt ? parseISO(draft.next_appt) : undefined}
                  onSelect={(d) => setDraft({ ...draft, next_appt: d ? format(d, "yyyy-MM-dd") : "" })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Input placeholder="Address" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
          <Textarea rows={2} placeholder="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={submit}>Add provider</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setAdding(true)} variant="outline" className="rounded-full">
          <Plus className="mr-1 h-4 w-4" /> Add provider
        </Button>
      )}

      {providers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/40 bg-card/30 p-4 text-center text-xs italic text-muted-foreground">
          No care providers added yet.
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {providers.map(p => (
            <div key={p.id} className="group rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm truncate">{p.name}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    <Badge variant="secondary" className="rounded-full text-[10px] capitalize">{p.role}</Badge>
                    {p.specialty && <span>{p.specialty}</span>}
                  </div>
                </div>
                <button
                  onClick={async () => { await careProviders.remove(p.id); await reload(); }}
                  className="opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100"
                  aria-label="Remove"
                ><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="mt-2 space-y-0.5 text-xs">
                {p.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" />{p.phone}</div>}
                {p.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-muted-foreground" />{p.email}</div>}
                {p.address && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-muted-foreground" />{p.address}</div>}
                {p.next_appt && <div className="flex items-center gap-1.5"><CalendarIcon className="h-3 w-3 text-muted-foreground" />Next: {format(parseISO(p.next_appt), "MMM d, yyyy")}</div>}
                {p.notes && <p className="mt-1 text-muted-foreground">{p.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============== Education ============== */
function EducationTab({
  recipient, updateRecipient,
}: { recipient: CareRecipient; updateRecipient: (id: string, p: Partial<CareRecipient>) => Promise<void> }) {
  const [school, setSchool] = useState(recipient.school ?? "");
  const [level, setLevel] = useState(recipient.educationLevel ?? "");
  const [schedule, setSchedule] = useState<Record<string, string>>(recipient.schedule ?? {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSchool(recipient.school ?? "");
    setLevel(recipient.educationLevel ?? "");
    setSchedule(recipient.schedule ?? {});
  }, [recipient.id]);

  const save = async () => {
    setSaving(true);
    try {
      await updateRecipient(recipient.id, {
        school: school.trim() || undefined,
        educationLevel: level || undefined,
        schedule,
      });
      toast.success("Education saved");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>School / program</Label>
          <div className="relative">
            <School className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={school} onChange={(e) => setSchool(e.target.value)} className="pl-8" placeholder="e.g. Maple Elementary" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Education level</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue placeholder="Choose level" /></SelectTrigger>
            <SelectContent>
              {EDUCATION_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border/60 p-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          <GraduationCap className="mr-1 inline h-3 w-3" /> Weekly schedule
        </Label>
        <div className="grid gap-2">
          {WEEKDAYS.map(d => (
            <div key={d} className="grid grid-cols-[60px_1fr] items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{d}</span>
              <Input
                value={schedule[d] ?? ""}
                onChange={(e) => setSchedule(s => ({ ...s, [d]: e.target.value }))}
                placeholder="e.g. 8:30–3:00 school, 4:00 therapy"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save education
        </Button>
      </div>
    </div>
  );
}

/* ============== AI Notes ============== */
function AINotesTab({
  recipient, history, providers, aiNotes, reload,
}: { recipient: CareRecipient; history: any[]; providers: any[]; aiNotes: any[]; reload: () => Promise<void> }) {
  const { state } = useStore();
  const [focus, setFocus] = useState<"general" | "developmental" | "mental" | "physical" | "daily">("general");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const careNotes = state.careNotes.filter(n => n.recipientId === recipient.id).slice(0, 5);

  const generate = async () => {
    setGenerating(true);
    try {
      const context = {
        name: recipient.name,
        kind: recipient.kind,
        age: ageFrom(recipient.birthDate),
        zodiac: recipient.zodiac ?? zodiacFor(recipient.birthDate),
        location: recipient.location,
        notes: recipient.notes,
        sensory: recipient.sensory,
        loveLanguages: recipient.loveLanguages ?? [],
        foodPreferences: recipient.foodPreferences ?? {},
        school: recipient.school,
        educationLevel: recipient.educationLevel,
        schedule: recipient.schedule ?? {},
        meds: recipient.meds ?? [],
        contacts: recipient.contacts ?? [],
        providers: providers.map(p => ({ name: p.name, role: p.role, specialty: p.specialty })),
        medicalHistory: history.slice(0, 20).map(h => ({ date: h.date, title: h.title, category: h.category, notes: h.notes })),
        recentNotes: careNotes.map(n => ({ date: n.date, body: n.body })),
      };
      const { data, error } = await aiInvoke("ai-care-note", {
        body: { focus, prompt, context },
      });
      if (error) throw error;
      const body = (data as any)?.body;
      if (!body) throw new Error("Empty response");
      await careAINotes.add({ recipient_id: recipient.id, focus, prompt: prompt || null, body });
      setPrompt("");
      await reload();
      toast.success("AI note added");
    } catch (e: any) {
      toast.error(e?.message ?? "AI failed");
    } finally { setGenerating(false); }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Focus</Label>
          <Select value={focus} onValueChange={(v) => setFocus(v as any)}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General support</SelectItem>
              <SelectItem value="developmental">Developmental</SelectItem>
              <SelectItem value="mental">Mental / emotional</SelectItem>
              <SelectItem value="physical">Physical health</SelectItem>
              <SelectItem value="daily">Daily plan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Ask something specific about ${recipient.name}, or leave blank for a fresh take…`}
        />
        <div className="flex justify-end">
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            Generate AI note
          </Button>
        </div>
      </div>

      {aiNotes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/40 bg-card/30 p-4 text-center text-xs italic text-muted-foreground">
          AI notes you generate will appear here. They pull in profile, food, medical, providers, schedule, and recent journal entries.
        </p>
      ) : (
        <ul className="space-y-2">
          {aiNotes.map(n => (
            <li key={n.id} className="group rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                <Badge variant="secondary" className="rounded-full text-[10px] capitalize">{n.focus}</Badge>
                <span>{format(parseISO(n.created_at), "MMM d, h:mm a")}</span>
                <button
                  onClick={async () => { await careAINotes.remove(n.id); await reload(); }}
                  className="ml-auto opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100"
                  aria-label="Remove"
                ><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              {n.prompt && <p className="mb-1 text-xs italic text-muted-foreground">"{n.prompt}"</p>}
              <div className="whitespace-pre-wrap text-sm">{n.body}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}