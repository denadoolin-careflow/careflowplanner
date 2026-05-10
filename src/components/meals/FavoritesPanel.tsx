import { useEffect, useState } from "react";
import { startOfWeek, addDays, format } from "date-fns";
import { useStore } from "@/lib/store";
import { FavoriteMeal, listFavorites, removeFavorite, applyFavoriteToSlot } from "@/lib/meal-ai";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, CalendarPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RecipeEditor } from "./RecipeEditor";
import { toast } from "sonner";

const SLOTS = ["Breakfast","Lunch","Dinner","Snack"] as const;

export function FavoritesPanel() {
  const { user, reloadAll } = useStore();
  const [items, setItems] = useState<FavoriteMeal[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FavoriteMeal | null>(null);

  const load = () => { if (user) listFavorites(user.id).then(setItems); };
  useEffect(load, [user]);

  const del = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await removeFavorite(id);
  };

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (f: FavoriteMeal) => { setEditing(f); setEditorOpen(true); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {items.length ? `${items.length} saved recipe${items.length === 1 ? "" : "s"}` : "Build your recipe database here."}
        </p>
        <Button size="sm" variant="outline" className="rounded-full" onClick={openNew}>
          <Plus className="mr-1 h-3.5 w-3.5" />Add recipe
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Tap <strong>Add recipe</strong> or favorite an AI meal to keep it here.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(f => (
            <li key={f.id} className="group flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
              <button onClick={() => openEdit(f)} className="flex-1 text-left">
                <span className="font-medium">{f.name}</span>
                {f.slot && <span className="ml-1 text-[11px] text-muted-foreground">· {f.slot}</span>}
                {f.prep_minutes ? <span className="ml-1 text-[11px] text-muted-foreground">· {f.prep_minutes}m</span> : null}
              </button>
              <UseFavoriteButton fav={f} onApplied={reloadAll} />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-60" onClick={() => openEdit(f)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 transition group-hover:opacity-60" onClick={() => del(f.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <RecipeEditor open={editorOpen} onOpenChange={setEditorOpen} recipe={editing} onSaved={load} />
    </div>
  );
}

function UseFavoriteButton({ fav, onApplied }: { fav: FavoriteMeal; onApplied: () => void }) {
  const { user } = useStore();
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [date, setDate] = useState(days[0].toISOString().slice(0, 10));
  const [slot, setSlot] = useState<string>(fav.slot || "Dinner");
  const [groceries, setGroceries] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await applyFavoriteToSlot(user.id, fav, date, slot, { addGroceries: groceries, replace: true });
      toast.success(`Added to ${slot}, ${format(new Date(date + "T00:00:00"), "EEE d")}`);
      onApplied();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't add");
    } finally { setBusy(false); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-60 hover:opacity-100">
          <CalendarPlus className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div>
          <Label className="text-xs">Day</Label>
          <Select value={date} onValueChange={setDate}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {days.map(d => {
                const v = d.toISOString().slice(0, 10);
                return <SelectItem key={v} value={v}>{format(d, "EEE d")}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Slot</Label>
          <Select value={slot} onValueChange={setSlot}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={groceries} onCheckedChange={v => setGroceries(!!v)} />
          Add ingredients to grocery list
        </label>
        <Button className="w-full" size="sm" onClick={apply} disabled={busy}>
          {busy ? "Adding…" : "Add to plan"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
