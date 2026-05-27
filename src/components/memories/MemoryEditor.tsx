import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Heart, Pin, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AttachmentsField } from "@/components/attachments/AttachmentsField";
import { MEMORY_TYPES, type Memory, type MemoryType, createMemory, updateMemory, deleteMemory, seasonOf } from "@/lib/memories";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { useStore } from "@/lib/store";
import type { LovedOne } from "@/lib/loved-ones";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  memory: Memory | null;
  lovedOnes: LovedOne[];
  onSaved: (m: Memory) => void;
  onDeleted?: (id: string) => void;
  defaults?: Partial<Memory>;
}

export function MemoryEditor({ open, onOpenChange, memory, lovedOnes, onSaved, onDeleted, defaults }: Props) {
  const { state } = useStore();
  const [draft, setDraft] = useState<Partial<Memory>>({});
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (!open) return;
    if (memory) setDraft(memory);
    else {
      const today = new Date().toISOString().slice(0, 10);
      const phase = getMoonPhase(new Date());
      setDraft({
        title: "",
        memoryType: "favorite_moment",
        date: today,
        tags: [],
        recipientIds: [],
        lovedOneIds: [],
        attachments: [],
        isFavorite: false,
        isPinned: false,
        moonPhase: MOON_INFO[phase]?.label,
        season: seasonOf(today),
        coverIndex: 0,
        ...defaults,
      });
    }
  }, [open, memory, defaults]);

  const save = async () => {
    if (!draft.title?.trim()) { toast.error("Add a title"); return; }
    setSaving(true);
    try {
      const saved = memory
        ? await updateMemory(memory.id, draft)
        : await createMemory(draft);
      toast.success(memory ? "Memory updated" : "Memory saved");
      onSaved(saved);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!memory) return;
    if (!confirm("Delete this memory?")) return;
    try {
      await deleteMemory(memory.id);
      onDeleted?.(memory.id);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete");
    }
  };

  const toggleRecipient = (id: string) => {
    const cur = draft.recipientIds ?? [];
    setDraft({ ...draft, recipientIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };
  const toggleLovedOne = (id: string) => {
    const cur = draft.lovedOneIds ?? [];
    setDraft({ ...draft, lovedOneIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, "");
    if (!t) return;
    const cur = draft.tags ?? [];
    if (cur.includes(t)) return;
    setDraft({ ...draft, tags: [...cur, t] });
    setTagInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto bg-card/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {memory ? "Edit memory" : "New memory"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input
              value={draft.title ?? ""}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="A small moment to remember…"
              className="mt-1 border-0 bg-transparent px-0 font-display text-xl shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
              <Select value={draft.memoryType ?? "favorite_moment"} onValueChange={(v) => setDraft({ ...draft, memoryType: v as MemoryType })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEMORY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="mr-1.5">{t.emoji}</span>{t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={draft.date ?? ""}
                onChange={(e) => setDraft({ ...draft, date: e.target.value, season: seasonOf(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What happened? What did it feel like?"
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid gap-3 rounded-2xl border border-[hsl(0_45%_85%/0.4)] bg-[hsl(20_70%_97%/0.5)] p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Reflections</div>
            <Textarea placeholder="What made this meaningful?" rows={2}
              value={draft.meaningfulNote ?? ""} onChange={(e) => setDraft({ ...draft, meaningfulNote: e.target.value })}
              className="border-0 bg-background/50" />
            <Textarea placeholder="What do I want to remember?" rows={2}
              value={draft.rememberNote ?? ""} onChange={(e) => setDraft({ ...draft, rememberNote: e.target.value })}
              className="border-0 bg-background/50" />
            <div className="grid grid-cols-2 gap-3">
              <Textarea placeholder="What felt challenging?" rows={2}
                value={draft.challengingNote ?? ""} onChange={(e) => setDraft({ ...draft, challengingNote: e.target.value })}
                className="border-0 bg-background/50" />
              <Textarea placeholder="What felt beautiful?" rows={2}
                value={draft.beautifulNote ?? ""} onChange={(e) => setDraft({ ...draft, beautifulNote: e.target.value })}
                className="border-0 bg-background/50" />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Photos & files</Label>
            <div className="mt-2">
              <AttachmentsField
                scope="memory"
                ownerId={memory?.id ?? "new"}
                value={draft.attachments}
                onChange={(v) => setDraft({ ...draft, attachments: v })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mood</Label>
              <Input value={draft.mood ?? ""} onChange={(e) => setDraft({ ...draft, mood: e.target.value })}
                placeholder="e.g. tender, joyful, bittersweet" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Location</Label>
              <Input value={draft.location ?? ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="Where?" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</Label>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5">
              {(draft.tags ?? []).map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">
                  #{t}
                  <button onClick={() => setDraft({ ...draft, tags: (draft.tags ?? []).filter((x) => x !== t) })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
                onBlur={() => addTag(tagInput)}
                placeholder="Add tag…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {(state.recipients?.length ?? 0) + lovedOnes.length > 0 && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Loved ones</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(state.recipients ?? []).map((r) => {
                  const on = draft.recipientIds?.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggleRecipient(r.id)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-[hsl(350_55%_60%)] bg-[hsl(350_55%_60%/0.15)]" : "border-border/60 bg-card hover:bg-muted/60"}`}
                    >
                      {r.name}
                    </button>
                  );
                })}
                {lovedOnes.map((l) => {
                  const on = draft.lovedOneIds?.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => toggleLovedOne(l.id)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-[hsl(350_55%_60%)] bg-[hsl(350_55%_60%/0.15)]" : "border-border/60 bg-card hover:bg-muted/60"}`}
                    >
                      {l.avatarEmoji ?? "💛"} {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/40 p-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setDraft({ ...draft, isFavorite: !draft.isFavorite })}
                className="flex items-center gap-1.5 text-sm">
                <Heart className={`h-4 w-4 ${draft.isFavorite ? "fill-[hsl(350_55%_60%)] text-[hsl(350_55%_60%)]" : "text-muted-foreground"}`} />
                Favorite
              </button>
              <button onClick={() => setDraft({ ...draft, isPinned: !draft.isPinned })}
                className="flex items-center gap-1.5 text-sm">
                <Pin className={`h-4 w-4 ${draft.isPinned ? "fill-[hsl(20_60%_55%)] text-[hsl(20_60%_55%)]" : "text-muted-foreground"}`} />
                Pin
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              {draft.moonPhase && <span>🌙 {draft.moonPhase}</span>}
              {draft.season && <span className="ml-2 capitalize">· {draft.season}</span>}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-between gap-2 sm:justify-between">
          {memory ? (
            <Button variant="ghost" onClick={remove} className="text-destructive">
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-[hsl(350_55%_60%)] text-white hover:bg-[hsl(350_55%_55%)]">
              {saving ? "Saving…" : "Save memory"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}