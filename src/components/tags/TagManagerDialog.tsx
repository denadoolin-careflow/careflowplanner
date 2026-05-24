import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTags } from "@/hooks/use-tags";
import { TAG_COLORS, readableTextOn } from "@/lib/tags";
import { tagIconFor, TAG_ICON_OPTIONS } from "./tag-icon";
import { Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function TagManagerDialog({ open, onOpenChange }: Props) {
  const { tags, rename, recolor, remove } = useTags();
  const [editId, setEditId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState("");
  const [draftIcon, setDraftIcon] = useState("");

  const startEdit = (id: string) => {
    const t = tags.find((x) => x.id === id);
    if (!t) return;
    setEditId(id);
    setDraftName(t.name);
    setDraftColor(t.color);
    setDraftIcon(t.icon);
  };

  const save = async () => {
    if (!editId) return;
    try {
      await rename(editId, draftName);
      await recolor(editId, { color: draftColor, icon: draftIcon });
      toast.success("Tag updated");
      setEditId(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save tag");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage tags</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {tags.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No tags yet. Create one from any task or note.</p>
          )}
          {tags.map((t) => {
            const Icon = tagIconFor(t.icon);
            const editing = editId === t.id;
            return (
              <div key={t.id} className="rounded-xl border border-border/60 bg-card/60 p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full"
                    style={{ backgroundColor: editing ? draftColor : t.color, color: readableTextOn(editing ? draftColor : t.color) }}
                  >
                    {(() => { const I = editing ? tagIconFor(draftIcon) : Icon; return <I className="h-3.5 w-3.5" />; })()}
                  </span>
                  {editing ? (
                    <Input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="h-8 flex-1 text-sm"
                    />
                  ) : (
                    <span className="flex-1 truncate text-sm font-medium">{t.name}</span>
                  )}
                  {!editing && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(t.id)}>Edit</Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          if (!confirm(`Delete tag “${t.name}”? Items keep their label string but lose its color.`)) return;
                          await remove(t.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
                {editing && (
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Color</div>
                      <div className="flex flex-wrap gap-1">
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setDraftColor(c.hex)}
                            className={cn(
                              "h-5 w-5 rounded-full ring-1 ring-border/40",
                              draftColor === c.hex && "ring-2 ring-foreground/70 scale-110",
                            )}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Icon</div>
                      <div className="grid grid-cols-8 gap-1">
                        {TAG_ICON_OPTIONS.map((i) => {
                          const I = tagIconFor(i);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setDraftIcon(i)}
                              className={cn(
                                "grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted",
                                draftIcon === i && "bg-primary/15 text-primary",
                              )}
                            >
                              <I className="h-3 w-3" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
                      <Button size="sm" onClick={save}><Save className="mr-1 h-3.5 w-3.5" /> Save</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}