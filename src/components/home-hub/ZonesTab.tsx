import { useMemo, useState } from "react";
import {
  BedDouble, UtensilsCrossed, Bath, WashingMachine, DoorOpen, Sofa,
  Trees, TreePine, Sparkles, Wand2, Loader2, Plus, ChevronRight,
  ListChecks, Moon, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { aiInvoke } from "@/lib/ai-invoke";
import { useResetChecklists } from "@/lib/reset-checklists";
import { ChecklistTree } from "@/components/reset/ChecklistTree";

const ZONE_PREFIX = "Zone: ";

type ZoneDef = {
  label: string;
  icon: typeof BedDouble;
  accent: string;
  bar: string;
};

const DEFAULT_ZONES: ZoneDef[] = [
  { label: "Bedroom",  icon: BedDouble,       accent: "from-rose-100/70 to-rose-50/40 ring-rose-200/60",         bar: "bg-rose-400" },
  { label: "Kitchen",  icon: UtensilsCrossed, accent: "from-emerald-100/70 to-emerald-50/40 ring-emerald-200/60", bar: "bg-emerald-500" },
  { label: "Bathroom", icon: Bath,            accent: "from-violet-100/70 to-violet-50/40 ring-violet-200/60",   bar: "bg-violet-500" },
  { label: "Laundry",  icon: WashingMachine,  accent: "from-sky-100/70 to-sky-50/40 ring-sky-200/60",            bar: "bg-sky-500" },
  { label: "Entryway", icon: DoorOpen,        accent: "from-amber-100/70 to-amber-50/40 ring-amber-200/60",      bar: "bg-amber-500" },
  { label: "Living",   icon: Sofa,            accent: "from-stone-100/70 to-stone-50/40 ring-stone-200/60",      bar: "bg-stone-500" },
  { label: "Outdoors", icon: Trees,           accent: "from-lime-100/70 to-lime-50/40 ring-lime-200/60",         bar: "bg-lime-500" },
  { label: "Whole home", icon: TreePine,      accent: "from-teal-100/70 to-teal-50/40 ring-teal-200/60",         bar: "bg-teal-500" },
];

export function ZonesTab() {
  const reset = useResetChecklists({});
  const [newZone, setNewZone] = useState("");
  const [zoneOrder, setZoneOrder] = useState<ZoneDef[]>(DEFAULT_ZONES);
  const [openZone, setOpenZone] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  // Map zone label -> checklist (the first list whose name === "Zone: <label>").
  const zoneListByLabel = useMemo(() => {
    const m = new Map<string, ReturnType<typeof useResetChecklists>["lists"][number]>();
    for (const l of reset.lists) {
      if (l.is_template) continue;
      if (l.name.startsWith(ZONE_PREFIX)) {
        const label = l.name.slice(ZONE_PREFIX.length).trim();
        if (!m.has(label)) m.set(label, l);
      }
    }
    return m;
  }, [reset.lists]);

  // Merge defaults with any user-added zones (lists prefixed with "Zone: ").
  const allZones = useMemo(() => {
    const seen = new Set(zoneOrder.map(z => z.label.toLowerCase()));
    const extras: ZoneDef[] = [];
    for (const label of zoneListByLabel.keys()) {
      if (!seen.has(label.toLowerCase())) {
        extras.push({
          label,
          icon: Sparkles,
          accent: "from-blue-100/70 to-blue-50/40 ring-blue-200/60",
          bar: "bg-blue-500",
        });
      }
    }
    return [...zoneOrder, ...extras];
  }, [zoneOrder, zoneListByLabel]);

  const ensureZoneList = async (label: string) => {
    const existing = zoneListByLabel.get(label);
    if (existing) return existing.id;
    const id = await reset.createList({ name: `${ZONE_PREFIX}${label}`, kind: "custom" });
    return id;
  };

  const openZoneSheet = async (label: string) => {
    await ensureZoneList(label);
    setOpenZone(label);
  };

  const addZone = async () => {
    const label = newZone.trim();
    if (!label) return;
    await ensureZoneList(label);
    setNewZone("");
    toast.success(`Added "${label}"`);
  };

  const generateChecklist = async (zone: string, energy: string) => {
    setAiBusy(zone);
    try {
      const list = zoneListByLabel.get(zone);
      const existing = list ? list.items.filter(i => !i.parent_id).map(i => i.title) : [];
      const { data, error } = await aiInvoke("ai-home-assistant", {
        body: { mode: "zone_checklist", context: { zone, energy, existing } },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const checklist = data as { name: string; items: { title: string; category?: string; est_minutes?: number }[] };
      if (!checklist?.items?.length) throw new Error("No items returned");

      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      const listId = await ensureZoneList(zone);
      if (!listId) throw new Error("Could not create zone checklist");
      const base = (list?.items.filter(i => !i.parent_id).length) ?? 0;
      const rows = checklist.items.map((it, idx) => ({
        user_id: u.user!.id,
        checklist_id: listId,
        title: it.title,
        category: it.category ?? zone,
        est_minutes: it.est_minutes ?? null,
        sort_order: base + idx,
        done: false,
      }));
      const { error: itemsErr } = await supabase.from("reset_items").insert(rows);
      if (itemsErr) throw itemsErr;
      await reset.refresh();

      toast.success(`Added ${rows.length} tasks to ${zone}`, {
        description: "Synced to your Tasks list automatically.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI checklist failed");
    } finally {
      setAiBusy(null);
    }
  };

  const openList = openZone ? zoneListByLabel.get(openZone) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Add a zone (e.g. Garage)"
          value={newZone}
          onChange={(e) => setNewZone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addZone()}
          className="max-w-xs"
        />
        <Button onClick={addZone} variant="outline" size="sm" className="rounded-full">
          <Plus className="mr-1 h-4 w-4" /> Add zone
        </Button>
        <p className="text-xs text-muted-foreground">
          Zone checklists support scheduling, recurrence, and sync to your Tasks list.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {allZones.map((z) => {
          const list = zoneListByLabel.get(z.label);
          const roots = list ? list.items.filter(i => !i.parent_id) : [];
          const total = roots.length;
          const done = roots.filter(i => i.done).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const busy = aiBusy === z.label;
          const Icon = z.icon;
          return (
            <article
              key={z.label}
              className={cn(
                "group relative flex flex-col gap-3 rounded-3xl bg-gradient-to-br p-4 ring-1 shadow-soft transition-all hover:-translate-y-0.5",
                z.accent,
              )}
            >
              <button
                onClick={() => openZoneSheet(z.label)}
                className="flex items-start gap-3 text-left"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-foreground/80 ring-1 ring-white/60 shadow-sm">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-semibold leading-tight">{z.label}</h3>
                  <p className="mt-0.5 text-[11px] text-foreground/60">
                    {total === 0 ? "No tasks yet" : `${done} of ${total} done`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/50">
                <div className={cn("h-full rounded-full transition-all", z.bar)} style={{ width: `${pct}%` }} />
              </div>

              <div className="border-t border-white/40 pt-2">
                <AiChecklistMenu
                  busy={busy}
                  onGenerate={(mode) => generateChecklist(z.label, mode)}
                />
              </div>
            </article>
          );
        })}
      </div>

      <Sheet open={!!openZone} onOpenChange={(o) => !o && setOpenZone(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {openZone && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">{openZone}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                {openList ? (
                  <ChecklistTree
                    list={openList}
                    onAdd={(item) => reset.addItem(openList.id, item)}
                    onUpdate={reset.updateItem}
                    onDelete={reset.deleteItem}
                    onDuplicate={reset.duplicateItem}
                    onReorder={(parentId, ordered) => reset.reorderItems(openList.id, parentId, ordered)}
                    onRenameList={(name) => reset.renameList(openList.id, name)}
                    onDeleteList={() => { reset.deleteList(openList.id); setOpenZone(null); }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const AI_OPTIONS: { id: string; label: string; desc: string; icon: typeof Sparkles }[] = [
  { id: "low",    label: "Quick reset",     desc: "5–10 min surface tidy",       icon: Sparkles },
  { id: "gentle", label: "Low-energy mode", desc: "Gentle, sit-down friendly",   icon: Moon },
  { id: "medium", label: "Weekly reset",    desc: "Your standard rhythm",        icon: ListChecks },
  { id: "deep",   label: "Deep clean",      desc: "Thorough, monthly cadence",   icon: Wand2 },
];

function AiChecklistMenu({
  busy, onGenerate,
}: {
  busy: boolean;
  onGenerate: (mode: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const pick = (id: string) => {
    setOpen(false);
    void onGenerate(id);
  };

  const submitCustom = () => {
    const t = custom.trim();
    if (!t) return;
    setOpen(false);
    setCustom("");
    void onGenerate(t);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-[11px] font-medium text-foreground/80 ring-1 ring-white/60 transition-all hover:bg-white/80 disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Wand2 className="h-3 w-3" />
              AI checklist
              <ChevronDown className="h-3 w-3 opacity-60" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Generate a checklist
        </p>
        <ul className="space-y-0.5">
          {AI_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <li key={opt.id}>
                <button
                  onClick={() => pick(opt.id)}
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/70"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted/60 text-foreground/70">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium leading-tight">{opt.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{opt.desc}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 border-t border-border/50 pt-2">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Custom
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); submitCustom(); }}
            className="flex items-center gap-1 px-1"
          >
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="e.g. before guests arrive"
              className="h-7 text-xs"
            />
            <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={!custom.trim()}>
              Go
            </Button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}