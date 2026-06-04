import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Repeat, Trash2 } from "lucide-react";
import { useTraditions, useTraditionItems, useTraditionInstance } from "@/lib/seasons/hooks";

export default function SeasonsTraditions() {
  const { traditions, add, remove } = useTraditions();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [recurs, setRecurs] = useState(true);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Traditions</h1>
          <p className="text-sm text-muted-foreground">Save the rituals that make your family yours.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 rounded-full"><Plus className="h-4 w-4" /> New tradition</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {traditions.map(t => (
          <TraditionCard key={t.id} id={t.id} title={t.title} description={t.description} recurs={t.recursYearly} onDelete={() => remove(t.id)} />
        ))}
        {traditions.length === 0 && <Card className="p-6 col-span-full text-center text-sm text-muted-foreground">No traditions yet.</Card>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New tradition</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Christmas Eve" /></div>
            <div><Label>Description</Label><Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Matching pajamas, hot chocolate, family movie…" /></div>
            <label className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
              <span className="text-sm">Repeats yearly</span>
              <Switch checked={recurs} onCheckedChange={setRecurs} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { if (!title.trim()) return; await add({ title: title.trim(), description: desc, recursYearly: recurs }); setOpen(false); setTitle(""); setDesc(""); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TraditionCard({ id, title, description, recurs, onDelete }: { id: string; title: string; description?: string | null; recurs: boolean; onDelete: () => void }) {
  const year = new Date().getFullYear();
  const { items, add, remove } = useTraditionItems(id);
  const { instance, toggleItem, complete } = useTraditionInstance(id, year);
  const [val, setVal] = useState("");
  const doneCount = items.filter(i => instance?.itemState[i.id]).length;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" />
          <div>
            <div className="font-semibold">{title}</div>
            {description && <div className="text-xs text-muted-foreground">{description}</div>}
          </div>
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <div className="mt-3 space-y-1">
        {items.map(it => (
          <label key={it.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!instance?.itemState[it.id]} onChange={e => toggleItem(it.id, e.target.checked)} />
            <span className={instance?.itemState[it.id] ? "line-through text-muted-foreground" : ""}>{it.title}</span>
            <button onClick={() => remove(it.id)} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
          </label>
        ))}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={async e => { e.preventDefault(); if (!val.trim()) return; await add(val.trim()); setVal(""); }}>
        <Input value={val} onChange={e => setVal(e.target.value)} placeholder="Add a tradition item…" className="h-8 text-xs" />
        <Button type="submit" size="sm" variant="ghost" className="h-8 w-8 p-0"><Plus className="h-3.5 w-3.5" /></Button>
      </form>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{doneCount}/{items.length} this year</span>
        {items.length > 0 && doneCount === items.length && !instance?.completedAt && (
          <Button variant="outline" size="sm" onClick={complete}>Mark complete</Button>
        )}
        {recurs && <span>Repeats yearly</span>}
      </div>
    </Card>
  );
}