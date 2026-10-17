import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fromLocalInput, toLocalInput } from "@/lib/bedside-edit";

export interface EditableEntry { id: string; logged_at: string; note: string | null; dose?: string | null }

/** Inline editor for a bedside_logs row: when it happened, dose and note. */
export function BedsideEntryEditor({ entry, showDose, requireNote, onSaved, onCancel }: {
  entry: EditableEntry; showDose?: boolean; requireNote?: boolean;
  onSaved: (next: EditableEntry) => void; onCancel: () => void;
}) {
  const [when, setWhen] = useState(toLocalInput(entry.logged_at));
  const [dose, setDose] = useState(entry.dose ?? "");
  const [note, setNote] = useState(entry.note ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const logged_at = fromLocalInput(when);
    if (!logged_at) return toast.error("Pick a date and time that isn't in the future");
    if (requireNote && !note.trim()) return toast.error("Note can't be empty");
    const patch: any = { logged_at, note: note.trim() || null };
    if (showDose) patch.dose = dose.trim() || null;
    setSaving(true);
    const { error } = await supabase.from("bedside_logs").update(patch).eq("id", entry.id);
    setSaving(false);
    if (error) return toast.error("Couldn't save changes");
    toast.success("Updated");
    onSaved({ ...entry, ...patch });
  };

  return (
    <div className="grid w-full gap-2 sm:grid-cols-[auto_1fr]">
      <Input type="datetime-local" aria-label="When" value={when} max={toLocalInput(new Date().toISOString())} onChange={e => setWhen(e.target.value)} className="h-10" />
      <div className="flex gap-2">
        {showDose && <Input aria-label="Dose" value={dose} onChange={e => setDose(e.target.value)} placeholder="Amount" className="h-10 w-28" />}
        <Input aria-label="Note" value={note} onChange={e => setNote(e.target.value)} placeholder="Note" className="h-10 flex-1" />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" disabled={saving} onClick={() => void save()}>Save</Button>
      </div>
    </div>
  );
}
