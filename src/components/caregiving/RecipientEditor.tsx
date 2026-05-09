import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Phone, Pill } from "lucide-react";
import { useStore } from "@/lib/store";
import type { CareRecipient } from "@/lib/types";
import { toast } from "sonner";

type Mode = "add" | "edit";
type Contact = { name: string; phone?: string; role?: string };
type Med = { name: string; dose?: string; schedule?: string };

const KINDS: CareRecipient["kind"][] = ["self", "child", "elder", "partner", "pet"];

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
    } else {
      setName(""); setKind("self"); setNotes(""); setSensory("");
      setContacts([]); setMeds([]);
    }
  }, [open, mode, recipient]);

  const cleanContacts = () => contacts.filter(c => c.name.trim());
  const cleanMeds = () => meds.filter(m => m.name.trim());

  const save = async () => {
    if (!name.trim()) { toast.error("A name helps the people you hold feel real."); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        kind,
        notes: notes.trim() || undefined,
        sensory: sensory.trim() || undefined,
        contacts: cleanContacts(),
        meds: cleanMeds(),
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "edit" ? `Edit ${recipient?.name ?? "profile"}` : "Add a profile"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="re-name">Name</Label>
              <Input id="re-name" value={name} onChange={e => setName(e.target.value)} placeholder="Who are you caring for?" />
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

          <div className="space-y-1.5">
            <Label htmlFor="re-notes">Personal notes</Label>
            <Textarea id="re-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What you want to remember about them…" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="re-sensory">Sensory & preferences</Label>
            <Textarea id="re-sensory" rows={2} value={sensory} onChange={e => setSensory(e.target.value)} placeholder="Soft lights, certain foods, a comforting routine…" />
          </div>

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
        </div>

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
