import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Birthday, Holiday } from "@/lib/types";

interface Props {
  kind: "birthday" | "holiday";
  item: Birthday | Holiday | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BirthdayHolidayEditor({ kind, item, open, onOpenChange }: Props) {
  const { updateBirthday, updateHoliday, deleteBirthday, deleteHoliday } = useStore();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [relation, setRelation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!item) return;
    setName(item.name ?? "");
    setDate(item.date ?? "");
    setRelation((item as Birthday).relation ?? "");
    setNotes(item.notes ?? "");
  }, [item]);

  if (!item) return null;

  const save = async () => {
    if (kind === "birthday") {
      await updateBirthday(item.id, { name: name.trim() || item.name, date, relation: relation || undefined, notes: notes || undefined });
    } else {
      await updateHoliday(item.id, { name: name.trim() || item.name, date, notes: notes || undefined });
    }
    onOpenChange(false);
  };

  const remove = async () => {
    if (kind === "birthday") await deleteBirthday(item.id);
    else await deleteHoliday(item.id);
    onOpenChange(false);
  };

  const title = kind === "birthday" ? "Edit birthday" : "Edit holiday";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Update the details below.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="bh-name">Name</Label>
            <Input id="bh-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bh-date">Date</Label>
            <Input id="bh-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {kind === "birthday" && (
            <div className="grid gap-1.5">
              <Label htmlFor="bh-rel">Relation</Label>
              <Input id="bh-rel" placeholder="e.g. sister, friend" value={relation} onChange={(e) => setRelation(e.target.value)} />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="bh-notes">Notes</Label>
            <Textarea id="bh-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
