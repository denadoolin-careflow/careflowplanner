import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BedDouble, UtensilsCrossed, Bath, WashingMachine, DoorOpen, Sofa,
  Trees, TreePine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useResetChecklists } from "@/lib/reset-checklists";

type ZoneDef = {
  label: string;
  icon: typeof BedDouble;
  gradient: string;
  ring: string;
  bar: string;
  iconTone: string;
};

const ZONES: ZoneDef[] = [
  { label: "Bedroom",  icon: BedDouble,       gradient: "from-rose-100/80 to-rose-50/40",         ring: "ring-rose-200/60",    bar: "bg-rose-400",    iconTone: "text-rose-700" },
  { label: "Kitchen",  icon: UtensilsCrossed, gradient: "from-emerald-100/80 to-emerald-50/40",   ring: "ring-emerald-200/60", bar: "bg-emerald-500", iconTone: "text-emerald-700" },
  { label: "Bathroom", icon: Bath,            gradient: "from-violet-100/80 to-violet-50/40",     ring: "ring-violet-200/60",  bar: "bg-violet-500",  iconTone: "text-violet-700" },
  { label: "Laundry",  icon: WashingMachine,  gradient: "from-sky-100/80 to-sky-50/40",           ring: "ring-sky-200/60",     bar: "bg-sky-500",     iconTone: "text-sky-700" },
  { label: "Entryway", icon: DoorOpen,        gradient: "from-amber-100/80 to-amber-50/40",       ring: "ring-amber-200/60",   bar: "bg-amber-500",   iconTone: "text-amber-700" },
  { label: "Living",   icon: Sofa,            gradient: "from-stone-100/80 to-stone-50/40",       ring: "ring-stone-200/60",   bar: "bg-stone-500",   iconTone: "text-stone-700" },
  { label: "Outdoors", icon: Trees,           gradient: "from-lime-100/80 to-lime-50/40",         ring: "ring-lime-200/60",    bar: "bg-lime-500",    iconTone: "text-lime-700" },
  { label: "Whole home", icon: TreePine,      gradient: "from-teal-100/80 to-teal-50/40",         ring: "ring-teal-200/60",    bar: "bg-teal-500",    iconTone: "text-teal-700" },
];

const ZONE_PREFIX = "Zone: ";

export function ZoneTiles({ onOpenZonesTab }: { onOpenZonesTab?: () => void }) {
  const reset = useResetChecklists({});

  const progressByZone = useMemo(() => {
    const m = new Map<string, { done: number; total: number }>();
    for (const l of reset.lists) {
      if (l.is_template) continue;
      if (!l.name.startsWith(ZONE_PREFIX)) continue;
      const label = l.name.slice(ZONE_PREFIX.length).trim().toLowerCase();
      const roots = l.items.filter(i => !i.parent_id);
      const done = roots.filter(i => i.done).length;
      const existing = m.get(label);
      if (existing) {
        existing.done += done;
        existing.total += roots.length;
      } else {
        m.set(label, { done, total: roots.length });
      }
    }
    return m;
  }, [reset.lists]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ZONES.map(z => {
        const prog = progressByZone.get(z.label.toLowerCase());
        const pct = prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
        const hint = prog && prog.total > 0
          ? `${prog.done}/${prog.total} done`
          : "Tap to set up";
        const tile = (
          <div
            className={cn(
              "group relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-gradient-to-br p-3 ring-1 shadow-soft backdrop-blur-sm transition-all",
              "hover:-translate-y-0.5 hover:shadow-lg",
              z.gradient, z.ring,
            )}
          >
            <div className="flex items-start justify-between">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 ring-1 ring-white/60 shadow-sm", z.iconTone)}>
                <z.icon className="h-5 w-5" />
              </span>
              {prog && prog.total > 0 && (
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-foreground/70 ring-1 ring-white/60">
                  {pct}%
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-foreground/90">{z.label}</p>
              <p className="mt-0.5 text-[11px] text-foreground/60">{hint}</p>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/50">
              <div className={cn("h-full rounded-full transition-all", z.bar)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
        return onOpenZonesTab ? (
          <button key={z.label} type="button" onClick={onOpenZonesTab} className="text-left">
            {tile}
          </button>
        ) : (
          <Link key={z.label} to="/home-areas">{tile}</Link>
        );
      })}
    </div>
  );
}