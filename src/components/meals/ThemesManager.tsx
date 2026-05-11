import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Search, Pencil, Save, X, CalendarPlus } from "lucide-react";
import { useMealThemes, type MealTheme, applyThemeToWeek } from "@/lib/meal-themes";
import { useMealsLibrary } from "@/lib/meals-library";
import { toast } from "sonner";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const EMOJIS = ["🌮","🥩","🍝","🍕","🍣","🥗","🍜","🍛","🥘","🍳","🥞","🍔","🌯","🥙","🍤","🐟","🍗","🥬","🍲","🍱"];

export function ThemesManager({ open, onOpenChange, onAfterApply }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAfterApply?: () => void;
}) {
  const { items, create, update, remove } = useMealThemes();
  const { items: library } = useMealsLibrary();
  const [editing, setEditing] = useState<MealTheme | "new" | null>(null);

  const startNew = () => setEditing("new");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Day themes</DialogTitle>
        </DialogHeader>

        {editing == null ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Themes like Taco Tuesday let you group recipes and assign them to a weekday.</p>
              <Button size="sm" onClick={startNew} className="rounded-full">
                <Plus className="mr-1 h-3.5 w-3.5" />New theme
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                No themes yet. Create one to get started.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
                {items.map(t => (
                  <div key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/30 p-2">
                    <span className="text-2xl">{t.emoji ?? "🍽️"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{t.name}</span>
                        {t.weekday != null && (
                          <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] text-amber-300">{WEEKDAYS[t.weekday]}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {t.meal_ids.length} recipe{t.meal_ids.length === 1 ? "" : "s"}
                        {t.default_slot && ` · ${t.default_slot}`}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-400"
                      title="Apply to this week"
                      onClick={async () => {
                        if (t.weekday == null) { toast.info("Pin a weekday first."); return; }
                        if (!t.meal_ids.length) { toast.info("Add recipes to this theme first."); return; }
                        const r = await applyThemeToWeek(t, undefined, { mode: "fill_empty", addGroceries: true });
                        if (r.inserted === 0) toast.info("That slot is already taken.");
                        else toast.success(`Added ${t.name} to ${r.date}`);
                        onAfterApply?.();
                      }}>
                      <CalendarPlus className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                      onClick={() => { if (confirm(`Delete "${t.name}"?`)) remove(t.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <ThemeEditor
            initial={editing === "new" ? null : editing}
            library={library}
            onCancel={() => setEditing(null)}
            onSave={async (patch) => {
              if (editing === "new") {
                await create({ name: patch.name ?? "Untitled", ...patch });
              } else {
                await update(editing.id, patch);
              }
              setEditing(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ThemeEditor({ initial, library, onSave, onCancel }: {
  initial: MealTheme | null;
  library: ReturnType<typeof useMealsLibrary>["items"];
  onSave: (patch: Partial<MealTheme>) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "🌮");
  const [weekday, setWeekday] = useState<number | null>(initial?.weekday ?? null);
  const [defaultSlot, setDefaultSlot] = useState<string | null>(initial?.default_slot ?? null);
  const [picked, setPicked] = useState<Set<string>>(new Set(initial?.meal_ids ?? []));
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () => library.filter(m => !m.is_archived && (!q || m.title.toLowerCase().includes(q.toLowerCase()))),
    [library, q],
  );

  const toggle = (id: string) => setPicked(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input value={emoji} onChange={e => setEmoji(e.target.value.slice(0, 4))}
          className="h-9 w-14 text-center text-lg" />
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Theme name (e.g. Taco Tuesday)" className="h-9" />
      </div>
      <div className="flex flex-wrap gap-1">
        {EMOJIS.map(e => (
          <button key={e} onClick={() => setEmoji(e)}
            className={`grid h-7 w-7 place-items-center rounded-md border text-base transition ${emoji === e ? "border-amber-400 bg-amber-400/15" : "border-border/60 hover:bg-muted/40"}`}>
            {e}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 text-[10px] uppercase text-muted-foreground">Pin to weekday</div>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setWeekday(null)}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${weekday == null ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground"}`}>None</button>
            {WEEKDAYS.map((d, i) => (
              <button key={d} onClick={() => setWeekday(i)}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${weekday === i ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground"}`}>{d}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase text-muted-foreground">Default slot</div>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setDefaultSlot(null)}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${defaultSlot == null ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground"}`}>Any</button>
            {SLOTS.map(s => (
              <button key={s} onClick={() => setDefaultSlot(s)}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${defaultSlot === s ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground"}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase text-muted-foreground">
          <span>Recipes ({picked.size} selected)</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} className="h-8 pl-7" placeholder="Search recipes…" />
        </div>
        <div className="mt-1 grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
              No recipes match.
            </div>
          ) : filtered.map(m => (
            <label key={m.id}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition ${picked.has(m.id) ? "border-amber-400/40 bg-amber-400/10" : "border-border/60 hover:bg-muted/30"}`}>
              <Checkbox checked={picked.has(m.id)} onCheckedChange={() => toggle(m.id)} />
              <span className="text-base">{m.icon ?? "🍽️"}</span>
              <span className="truncate">{m.title}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} className="rounded-full">
          <X className="mr-1 h-3.5 w-3.5" />Cancel
        </Button>
        <Button size="sm" disabled={!name.trim()} className="rounded-full"
          onClick={() => onSave({ name: name.trim(), emoji, weekday, default_slot: defaultSlot, meal_ids: Array.from(picked) })}>
          <Save className="mr-1 h-3.5 w-3.5" />Save theme
        </Button>
      </div>
    </div>
  );
}