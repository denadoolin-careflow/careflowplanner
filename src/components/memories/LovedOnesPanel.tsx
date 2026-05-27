import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { createLovedOne, updateLovedOne, deleteLovedOne, type LovedOne } from "@/lib/loved-ones";
import { toast } from "sonner";

interface Person {
  id: string;
  name: string;
  emoji?: string;
  relation?: string;
  source: "recipient" | "loved_one";
  count: number;
}

interface Props {
  lovedOnes: LovedOne[];
  setLovedOnes: (v: LovedOne[]) => void;
  countsByRecipient: Record<string, number>;
  countsByLovedOne: Record<string, number>;
  selectedPersonKey: string | null;
  onSelect: (key: string | null) => void;
}

export function LovedOnesPanel({ lovedOnes, setLovedOnes, countsByRecipient, countsByLovedOne, selectedPersonKey, onSelect }: Props) {
  const { state } = useStore();
  const [editing, setEditing] = useState<LovedOne | null>(null);
  const [creating, setCreating] = useState(false);

  const people: Person[] = [
    ...(state.recipients ?? []).map((r) => ({
      id: r.id, name: r.name,
      relation: r.kind, source: "recipient" as const,
      count: countsByRecipient[r.id] ?? 0,
    })),
    ...lovedOnes.map((l) => ({
      id: l.id, name: l.name, emoji: l.avatarEmoji,
      relation: l.relation ?? l.kind, source: "loved_one" as const,
      count: countsByLovedOne[l.id] ?? 0,
    })),
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-xs uppercase tracking-wider text-[hsl(350_45%_45%)]">Loved Ones</div>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setCreating(true)}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
      <button
        onClick={() => onSelect(null)}
        className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${selectedPersonKey === null ? "border-[hsl(350_55%_70%)] bg-[hsl(350_45%_94%)]" : "border-transparent hover:bg-muted/40"}`}
      >
        🌸 All memories
      </button>
      {people.length === 0 && (
        <p className="px-1 py-2 text-xs text-muted-foreground">Tag people in memories to celebrate them here.</p>
      )}
      {people.map((p) => {
        const key = `${p.source}:${p.id}`;
        const active = selectedPersonKey === key;
        return (
          <div key={key} className="group flex items-center gap-1">
            <button
              onClick={() => onSelect(key)}
              className={`flex flex-1 items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${active ? "border-[hsl(350_55%_70%)] bg-[hsl(350_45%_94%)]" : "border-transparent hover:bg-muted/40"}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="text-base">{p.emoji ?? (p.source === "recipient" ? "💛" : "🌷")}</span>
                <span className="truncate">{p.name}</span>
              </span>
              <span className="ml-2 shrink-0 rounded-full bg-background px-1.5 text-[10px] text-muted-foreground">{p.count}</span>
            </button>
            {p.source === "loved_one" && (
              <button onClick={() => setEditing(lovedOnes.find((l) => l.id === p.id) ?? null)}
                className="opacity-0 transition group-hover:opacity-100">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        );
      })}

      <LovedOneDialog
        open={creating || !!editing}
        loved={editing}
        onOpenChange={(o) => { if (!o) { setEditing(null); setCreating(false); } }}
        onSaved={(l) => {
          if (editing) setLovedOnes(lovedOnes.map((x) => x.id === l.id ? l : x));
          else setLovedOnes([...lovedOnes, l]);
        }}
        onDeleted={(id) => setLovedOnes(lovedOnes.filter((x) => x.id !== id))}
      />
    </div>
  );
}

function LovedOneDialog({ open, loved, onOpenChange, onSaved, onDeleted }: {
  open: boolean;
  loved: LovedOne | null;
  onOpenChange: (o: boolean) => void;
  onSaved: (l: LovedOne) => void;
  onDeleted: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Partial<LovedOne>>({});
  useEffect(() => {
    if (!open) return;
    setDraft(loved ?? { name: "", avatarEmoji: "💛" });
  }, [open, loved]);
  const save = async () => {
    if (!draft.name?.trim()) { toast.error("Add a name"); return; }
    try {
      const out = loved ? await updateLovedOne(loved.id, draft) : await createLovedOne(draft);
      onSaved(out);
      onOpenChange(false);
    } catch (e: any) { toast.error(e?.message ?? "Could not save"); }
  };
  const remove = async () => {
    if (!loved) return;
    if (!confirm("Remove this person? Their memories will stay.")) return;
    try { await deleteLovedOne(loved.id); onDeleted(loved.id); onOpenChange(false); }
    catch (e: any) { toast.error(e?.message ?? "Could not delete"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{loved ? "Edit loved one" : "Add a loved one"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[80px,1fr] gap-2">
            <div>
              <Label className="text-xs">Emoji</Label>
              <Input value={draft.avatarEmoji ?? ""} onChange={(e) => setDraft({ ...draft, avatarEmoji: e.target.value })} className="mt-1 text-center text-xl" maxLength={2} />
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Relation</Label>
            <Input value={draft.relation ?? ""} onChange={(e) => setDraft({ ...draft, relation: e.target.value })} placeholder="grandma, friend, neighbor…" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Birthday</Label>
            <Input type="date" value={draft.birthDate ?? ""} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="mt-1" />
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {loved ? <Button variant="ghost" onClick={remove} className="text-destructive"><Trash2 className="mr-1.5 h-4 w-4" />Remove</Button> : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} className="bg-[hsl(350_55%_60%)] text-white hover:bg-[hsl(350_55%_55%)]">Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}