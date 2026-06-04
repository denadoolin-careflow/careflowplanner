import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, CheckSquare, Trash2 } from "lucide-react";
import { useBucketLists, useBucketItems } from "@/lib/seasons/hooks";
import type { BucketSeason } from "@/lib/seasons/types";
import { SEASON_META } from "@/lib/seasons/season-utils";

const SEASONS: BucketSeason[] = ["spring", "summer", "autumn", "winter", "all"];

export default function SeasonsBucketLists() {
  const { lists, add, remove } = useBucketLists();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [season, setSeason] = useState<BucketSeason>("summer");

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Bucket Lists</h1>
          <p className="text-sm text-muted-foreground">Seasonal experiences to chase, share, and remember.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 rounded-full"><Plus className="h-4 w-4" /> New list</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lists.map(l => <ListCard key={l.id} id={l.id} title={l.title} season={l.season} onDelete={() => remove(l.id)} />)}
        {lists.length === 0 && <Card className="p-6 col-span-full text-center text-sm text-muted-foreground">No bucket lists yet.</Card>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New bucket list</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Summer 2026" /></div>
            <div>
              <Label>Season</Label>
              <Select value={season} onValueChange={v => setSeason(v as BucketSeason)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEASONS.map(s => <SelectItem key={s} value={s}>{s === "all" ? "All year" : SEASON_META[s as Exclude<BucketSeason,"all">].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { if (!title.trim()) return; await add({ title: title.trim(), season }); setOpen(false); setTitle(""); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListCard({ id, title, season, onDelete }: { id: string; title: string; season: BucketSeason; onDelete: () => void }) {
  const { items, add, toggle, remove } = useBucketItems(id);
  const [val, setVal] = useState("");
  const done = items.filter(i => i.done).length;
  const meta = season === "all" ? null : SEASON_META[season as Exclude<BucketSeason,"all">];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <div>
            <div className="font-semibold text-sm">{title}</div>
            <div className="text-xs text-muted-foreground">{meta ? `${meta.emoji} ${meta.label}` : "All year"}</div>
          </div>
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <Progress value={items.length ? Math.round((done / items.length) * 100) : 0} className="mb-3" />
      <div className="space-y-1">
        {items.map(it => (
          <label key={it.id} className="flex items-center gap-2 text-sm group">
            <input type="checkbox" checked={it.done} onChange={e => toggle(it.id, e.target.checked)} />
            <span className={`flex-1 ${it.done ? "line-through text-muted-foreground" : ""}`}>{it.title}</span>
            <button onClick={() => remove(it.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </label>
        ))}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={async e => { e.preventDefault(); if (!val.trim()) return; await add(val.trim()); setVal(""); }}>
        <Input value={val} onChange={e => setVal(e.target.value)} placeholder="Add experience…" className="h-8 text-xs" />
        <Button type="submit" size="sm" variant="ghost" className="h-8 w-8 p-0"><Plus className="h-3.5 w-3.5" /></Button>
      </form>
    </Card>
  );
}