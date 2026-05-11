import { useState, useMemo, useEffect } from "react";
import { useMealsLibrary, type LibraryMeal } from "@/lib/meals-library";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Heart, Star, Copy, Archive, Pencil, Clock, LayoutGrid, List as ListIcon, Search, Sparkles, CalendarPlus, CalendarDays, X, CheckSquare } from "lucide-react";
import { MealLibraryEditor } from "@/components/meals/MealLibraryEditor";
import { AIGenerateMealsDialog } from "@/components/meals/AIGenerateMealsDialog";
import { LibraryRecipeViewer } from "@/components/meals/LibraryRecipeViewer";
import { AddToWeekDialog } from "@/components/meals/AddToWeekDialog";
import { AddToDayPopover } from "@/components/meals/AddToDayPopover";
import { EmptyState } from "@/components/cards/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";

const SLOT_TABS = ["All", "Breakfast", "Lunch", "Dinner", "Snack"] as const;
const TAG_CHIPS = ["freezer", "low-energy", "sensory-safe", "quick", "kid-friendly"];

export default function MealsLibrary() {
  const { items, create, update, remove, duplicate, refresh } = useMealsLibrary();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [q, setQ] = useState("");
  const [slot, setSlot] = useState<string>("All");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [favOnly, setFavOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Partial<LibraryMeal> | null>(null);
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [viewing, setViewing] = useState<LibraryMeal | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [addQueue, setAddQueue] = useState<LibraryMeal[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && selected.size) setSelected(new Set()); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected.size]);

  const toggleSel = (id: string) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const openAddSelected = () => {
    const ms = items.filter(i => selected.has(i.id));
    if (!ms.length) return;
    setAddQueue(ms); setAddOpen(true);
  };
  const openAddSingle = (m: LibraryMeal) => { setAddQueue([m]); setAddOpen(true); };

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (i.is_archived !== showArchived) return false;
      if (favOnly && !i.is_favorite) return false;
      if (slot !== "All" && i.slot && i.slot !== slot) return false;
      if (q && !i.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (activeTags.length && !activeTags.every(t => (i.tags ?? []).includes(t))) return false;
      return true;
    });
  }, [items, showArchived, favOnly, slot, q, activeTags]);

  const onSave = async (m: Partial<LibraryMeal>) => {
    if (m.id) await update(m.id, m);
    else await create({ title: m.title!, ...m });
  };

  const newMeal = () => { setEditing({ title: "", energy_level: "medium", is_favorite: false }); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-warm flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold">Meals library</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your saved recipes — searchable, taggable, calm.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => setView(v => v === "cards" ? "table" : "cards")}>
            {view === "cards" ? <ListIcon className="mr-1 h-4 w-4" /> : <LayoutGrid className="mr-1 h-4 w-4" />}
            {view === "cards" ? "Table" : "Cards"}
          </Button>
          <Button variant="outline" onClick={() => setAiOpen(true)}
            className="rounded-full border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20 hover:text-amber-100">
            <Sparkles className="mr-1 h-4 w-4" />AI generate
          </Button>
          <Button onClick={newMeal} className="rounded-full"><Plus className="mr-1 h-4 w-4" />New recipe</Button>
        </div>
      </div>

      <SectionCard title="Filters" accent="calm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="h-9 w-48 pl-7" />
          </div>
          <div className="flex gap-1">
            {SLOT_TABS.map(s => (
              <button key={s} onClick={() => setSlot(s)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${slot === s ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {TAG_CHIPS.map(t => (
              <button key={t} onClick={() => setActiveTags(a => a.includes(t) ? a.filter(x => x !== t) : [...a, t])}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${activeTags.includes(t) ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={() => setFavOnly(f => !f)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${favOnly ? "border-amber-500/40 bg-amber-500/15 text-amber-300" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
            <Heart className={`mr-1 inline h-3 w-3 ${favOnly ? "fill-current" : ""}`} />Favorites
          </button>
          <button onClick={() => setShowArchived(a => !a)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${showArchived ? "border-muted-foreground/40 bg-muted/30 text-foreground" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
            {showArchived ? "Showing archived" : "Show archived"}
          </button>
        </div>
      </SectionCard>

      {filtered.length === 0 ? (
        <EmptyState title="No recipes here yet." hint="Add your favorites — your future self will thank you." >
          <Button onClick={newMeal} variant="outline" className="mt-2 rounded-full"><Plus className="mr-1 h-4 w-4" />New recipe</Button>
        </EmptyState>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(m => (
            <motion.div key={m.id} layout whileHover={{ y: -2 }}
              className={`cozy-card group relative flex flex-col gap-2 p-4 transition hover:shadow-[0_0_20px_hsl(var(--primary)/0.18)]
                ${selected.has(m.id) ? "ring-2 ring-amber-400/60 shadow-[0_0_18px_hsl(45_90%_55%/0.25)]" : ""}`}>
              <div onClick={(e) => { e.stopPropagation(); toggleSel(m.id); }}
                className={`absolute left-2 top-2 z-10 grid h-5 w-5 cursor-pointer place-items-center rounded-md border bg-background/80 backdrop-blur transition
                  ${selected.has(m.id) ? "border-amber-400/60 bg-amber-400/20 opacity-100" : "border-border/60 opacity-0 group-hover:opacity-100"}`}>
                <Checkbox checked={selected.has(m.id)} className="pointer-events-none h-3 w-3" />
              </div>
              <button onClick={() => setViewing(m)}
                className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 text-3xl">
                {m.image_url ? (
                  <img src={m.image_url} alt={m.title} loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span>{m.icon ?? "🍽️"}</span>
                )}
              </button>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <button onClick={() => setViewing(m)} className="text-left font-medium leading-tight hover:text-primary">
                    {m.title}
                  </button>
                  {m.description && <div className="line-clamp-2 text-[11px] text-muted-foreground">{m.description}</div>}
                </div>
                <button onClick={() => update(m.id, { is_favorite: !m.is_favorite })}>
                  <Heart className={`h-4 w-4 ${m.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                {m.slot && <span className="rounded-full bg-muted/50 px-1.5 py-0.5">{m.slot}</span>}
                {m.prep_minutes && <span className="inline-flex items-center gap-0.5 rounded-full bg-muted/50 px-1.5 py-0.5"><Clock className="h-2.5 w-2.5" />{m.prep_minutes}m</span>}
                {(m.tags ?? []).slice(0,3).map(t => <span key={t} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">{t}</span>)}
              </div>
              {m.family_rating ? (
                <div className="flex">{[1,2,3,4,5].map(n => (
                  <Star key={n} className={`h-3 w-3 ${n <= m.family_rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                ))}</div>
              ) : null}
              <div className="mt-auto flex gap-1 pt-1 opacity-0 transition group-hover:opacity-100">
                <AddToDayPopover meals={[m]} trigger={
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-400" title="Add to a day"><CalendarDays className="h-3 w-3" /></Button>
                } />
                <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-400" title="Add to week" onClick={() => openAddSingle(m)}><CalendarPlus className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditing(m); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => duplicate(m.id)}><Copy className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => update(m.id, { is_archived: !m.is_archived })}><Archive className="h-3 w-3" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="cozy-card overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr><th className="p-2"></th><th className="p-2 text-left">Title</th><th className="p-2">Slot</th><th className="p-2">Prep</th><th className="p-2">Energy</th><th className="p-2">Rating</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-t border-border/40">
                  <td className="p-2"><Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggleSel(m.id)} /></td>
                  <td className="p-2"><button onClick={() => setViewing(m)} className="text-left hover:text-primary">{m.title}</button></td>
                  <td className="p-2 text-center text-muted-foreground">{m.slot ?? "—"}</td>
                  <td className="p-2 text-center text-muted-foreground">{m.prep_minutes ?? "—"}</td>
                  <td className="p-2 text-center text-muted-foreground">{m.energy_level}</td>
                  <td className="p-2 text-center text-muted-foreground">{m.family_rating ?? "—"}</td>
                  <td className="p-2 text-right">
                    <AddToDayPopover meals={[m]} trigger={
                      <Button size="sm" variant="ghost" className="h-7 text-amber-400" title="Add to a day"><CalendarDays className="h-3 w-3" /></Button>
                    } />
                    <Button size="sm" variant="ghost" className="h-7 text-amber-400" onClick={() => openAddSingle(m)}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => { setEditing(m); setOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => duplicate(m.id)}>Dup</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => { if (confirm("Remove?")) remove(m.id); }}>Del</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MealLibraryEditor meal={editing} open={open} onClose={() => setOpen(false)} onSave={onSave} />
      <AIGenerateMealsDialog open={aiOpen} onOpenChange={setAiOpen} onDone={refresh} />
      <LibraryRecipeViewer
        meal={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
        onEdit={(m) => { setViewing(null); setEditing(m); setOpen(true); }}
        onDuplicate={(id) => duplicate(id)}
        onToggleFavorite={(m) => update(m.id, { is_favorite: !m.is_favorite })}
        onToggleArchive={(m) => update(m.id, { is_archived: !m.is_archived })}
        onAddToWeek={(m) => openAddSingle(m)}
      />
      <AddToWeekDialog
        meals={addQueue}
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={() => setSelected(new Set())}
      />

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit items-center gap-2 rounded-full border border-amber-400/40 bg-background/95 px-3 py-2 shadow-[0_0_24px_hsl(45_90%_55%/0.25)] backdrop-blur">
            <CheckSquare className="h-4 w-4 text-amber-400" />
            <span className="text-sm">{selected.size} selected</span>
            <AddToDayPopover
              meals={items.filter(i => selected.has(i.id))}
              onDone={() => setSelected(new Set())}
              align="center"
              trigger={
                <Button size="sm" variant="outline" className="rounded-full">
                  <CalendarDays className="mr-1 h-3.5 w-3.5" />Add to day
                </Button>
              }
            />
            <Button size="sm" onClick={openAddSelected} className="rounded-full">
              <CalendarPlus className="mr-1 h-3.5 w-3.5" />Add to week
            </Button>
            <button onClick={() => setSelected(new Set())} className="rounded-full p-1 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
