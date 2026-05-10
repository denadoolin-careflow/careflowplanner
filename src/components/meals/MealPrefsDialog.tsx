import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_PREFS, MealPreferences, loadPrefs, savePrefs } from "@/lib/meal-ai";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

function csv(v: string[]) { return v.join(", "); }
function parseCsv(s: string) { return s.split(",").map(x => x.trim()).filter(Boolean); }

export function MealPrefsDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved?: () => void }) {
  const { user } = useStore();
  const [prefs, setPrefs] = useState<MealPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) loadPrefs(user.id).then(setPrefs);
  }, [open, user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await savePrefs(user.id, prefs);
      toast.success("Preferences saved.");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message ?? "Couldn't save"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Meal preferences</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Family size</Label>
              <Input type="number" min={1} max={12} value={prefs.family_size}
                onChange={(e) => setPrefs(p => ({ ...p, family_size: Math.max(1, Number(e.target.value) || 1) }))} />
            </div>
            <div>
              <Label>Max prep (min)</Label>
              <Input type="number" min={5} max={180} value={prefs.max_prep_minutes}
                onChange={(e) => setPrefs(p => ({ ...p, max_prep_minutes: Math.max(5, Number(e.target.value) || 30) }))} />
            </div>
          </div>
          <div>
            <Label>Budget</Label>
            <Select value={prefs.budget_level} onValueChange={(v: any) => setPrefs(p => ({ ...p, budget_level: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Tight (frugal)</SelectItem>
                <SelectItem value="medium">Comfortable</SelectItem>
                <SelectItem value="high">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Diets (comma separated)</Label>
            <Input placeholder="vegetarian, gluten-free…" value={csv(prefs.diets)}
              onChange={(e) => setPrefs(p => ({ ...p, diets: parseCsv(e.target.value) }))} />
          </div>
          <div>
            <Label>Allergies</Label>
            <Input placeholder="peanut, shellfish…" value={csv(prefs.allergies)}
              onChange={(e) => setPrefs(p => ({ ...p, allergies: parseCsv(e.target.value) }))} />
          </div>
          <div>
            <Label>Dislikes</Label>
            <Input placeholder="mushrooms, olives…" value={csv(prefs.dislikes)}
              onChange={(e) => setPrefs(p => ({ ...p, dislikes: parseCsv(e.target.value) }))} />
          </div>
          <div>
            <Label>Cuisines you love</Label>
            <Input placeholder="Mediterranean, Mexican…" value={csv(prefs.cuisines)}
              onChange={(e) => setPrefs(p => ({ ...p, cuisines: parseCsv(e.target.value) }))} />
          </div>
          <div>
            <Label>Picky-eater notes</Label>
            <Textarea rows={2} placeholder="Sam: beige foods, no sauces touching…" value={prefs.picky_notes ?? ""}
              onChange={(e) => setPrefs(p => ({ ...p, picky_notes: e.target.value || null }))} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
            <div>
              <Label className="text-sm">Low-energy mode</Label>
              <p className="text-[11px] text-muted-foreground">Prefer no-cook & 15-min meals.</p>
            </div>
            <Switch checked={prefs.low_energy} onCheckedChange={(v) => setPrefs(p => ({ ...p, low_energy: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}