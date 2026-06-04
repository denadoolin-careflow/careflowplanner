import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, Plus, Trash2 } from "lucide-react";
import { useRemembrances } from "@/lib/seasons/hooks";
import { format, parseISO } from "date-fns";

export default function SeasonsRemembrance() {
  const { remembrances, add, remove } = useRemembrances();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"person" | "pet" | "date">("person");
  const [birth, setBirth] = useState("");
  const [date, setDate] = useState("");
  const [story, setStory] = useState("");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Remembrance</h1>
          <p className="text-sm text-muted-foreground">A gentle space to honour the people, pets, and dates that shaped you.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 rounded-full"><Plus className="h-4 w-4" /> Add</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {remembrances.map(r => (
          <Card key={r.id} className="p-4 bg-gradient-to-br from-rose-50/50 to-transparent dark:from-rose-950/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                <div>
                  <div className="font-semibold text-sm">{r.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{r.kind}</div>
                </div>
              </div>
              <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            {(r.birthDate || r.remembranceDate) && (
              <div className="text-xs text-muted-foreground mt-2">
                {r.birthDate && <>Born {format(parseISO(r.birthDate), "MMM d, yyyy")}</>}
                {r.birthDate && r.remembranceDate && <> · </>}
                {r.remembranceDate && <>Remembered {format(parseISO(r.remembranceDate), "MMM d, yyyy")}</>}
              </div>
            )}
            {r.story && <p className="text-sm mt-3 whitespace-pre-wrap">{r.story}</p>}
          </Card>
        ))}
        {remembrances.length === 0 && <Card className="p-6 col-span-full text-center text-sm text-muted-foreground">No remembrance pages yet.</Card>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add remembrance</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Kind</Label>
                <Select value={kind} onValueChange={(v: any) => setKind(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person">Person</SelectItem>
                    <SelectItem value="pet">Pet</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Born</Label><Input type="date" value={birth} onChange={e => setBirth(e.target.value)} /></div>
              <div><Label>Remembered</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            </div>
            <div><Label>Story</Label><Textarea rows={4} value={story} onChange={e => setStory(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { if (!name.trim()) return; await add({ name: name.trim(), kind, birthDate: birth || null, remembranceDate: date || null, story: story || null }); setOpen(false); setName(""); setStory(""); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}