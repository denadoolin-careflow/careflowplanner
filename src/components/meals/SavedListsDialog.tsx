import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import {
  SavedGroceryList, listSavedLists, saveCurrentList,
  deleteSavedList, loadSavedListIntoCurrent, updateSavedList,
} from "@/lib/grocery-lists";
import { startOfWeek, format } from "date-fns";
import { Trash2, Download, Pencil, Check, X, Save } from "lucide-react";
import { toast } from "sonner";

export function SavedListsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, user, reloadAll } = useStore();
  const [lists, setLists] = useState<SavedGroceryList[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const load = async () => { if (user) setLists(await listSavedLists(user.id)); };
  useEffect(() => { if (open) load(); }, [open, user]);

  useEffect(() => {
    if (open && !name) {
      const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
      setName(`Week of ${format(ws, "MMM d")}`);
    }
  }, [open]);

  const onSave = async () => {
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      const ws = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().slice(0, 10);
      await saveCurrentList(user.id, name.trim(), state.grocery, ws);
      toast.success("List saved.");
      setName("");
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Couldn't save"); }
    finally { setBusy(false); }
  };

  const onLoad = async (list: SavedGroceryList, mode: "replace" | "merge") => {
    if (!user) return;
    if (mode === "replace" && state.grocery.length && !confirm("Replace your current grocery list?")) return;
    setBusy(true);
    try {
      await loadSavedListIntoCurrent(user.id, list, mode);
      await reloadAll();
      toast.success(mode === "replace" ? "List loaded." : "List merged in.");
      onOpenChange(false);
    } catch (e: any) { toast.error(e?.message ?? "Couldn't load"); }
    finally { setBusy(false); }
  };

  const onDelete = async (id: string) => {
    setLists(prev => prev.filter(l => l.id !== id));
    await deleteSavedList(id);
  };

  const saveRename = async (id: string) => {
    if (!renameVal.trim()) { setRenaming(null); return; }
    await updateSavedList(id, { name: renameVal.trim() });
    setRenaming(null);
    await load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Saved grocery lists</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-border/60 p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Save your current list ({state.grocery.length} item{state.grocery.length === 1 ? "" : "s"}) to reload later.
          </p>
          <div className="flex gap-2">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="List name" />
            <Button onClick={onSave} disabled={busy || !state.grocery.length || !name.trim()}>
              <Save className="mr-1.5 h-4 w-4" />Save
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {lists.length === 0 ? (
            <p className="text-xs text-muted-foreground">No saved lists yet.</p>
          ) : lists.map(l => (
            <div key={l.id} className="group rounded-xl bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-2">
                {renaming === l.id ? (
                  <>
                    <Input value={renameVal} onChange={e => setRenameVal(e.target.value)} className="h-7 text-sm" autoFocus />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveRename(l.id)}><Check className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setRenaming(null)}><X className="h-3.5 w-3.5" /></Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{l.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {l.items.length} items · {format(new Date(l.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-60" onClick={() => { setRenaming(l.id); setRenameVal(l.name); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 transition group-hover:opacity-60" onClick={() => onDelete(l.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
              {renaming !== l.id && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => onLoad(l, "replace")} disabled={busy}>
                    <Download className="mr-1 h-3 w-3" />Load (replace)
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs" onClick={() => onLoad(l, "merge")} disabled={busy}>
                    Merge in
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
