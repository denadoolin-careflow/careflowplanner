import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LayoutGrid, Plus, Sparkle, ListChecks, Sofa, BedDouble, Home as HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResetKind } from "@/lib/reset-checklists";

const KINDS: { id: ResetKind; label: string; icon: typeof Sparkle; desc: string }[] = [
  { id: "custom", label: "Zone",       icon: LayoutGrid,  desc: "A room or area." },
  { id: "quick",  label: "Quick",      icon: Sparkle,     desc: "A 5-min tidy." },
  { id: "weekly", label: "Routine",    icon: ListChecks,  desc: "Regular ritual." },
  { id: "deep",   label: "Deep clean", icon: Sofa,        desc: "Longer reset." },
  { id: "low_energy", label: "Low energy", icon: BedDouble, desc: "Gentle steps." },
];

export function AddZonePopover({
  onCreate, trigger,
}: {
  onCreate: (name: string, kind: ResetKind) => Promise<void> | void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ResetKind>("custom");

  const submit = async () => {
    if (!name.trim()) return;
    await onCreate(name.trim(), kind);
    setName("");
    setKind("custom");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-72 rounded-2xl border-[hsl(var(--reset-line))] bg-[hsl(var(--reset-cream))]/95 p-3 shadow-xl backdrop-blur"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--reset-ink))]/55">
          New zone
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="e.g. Kitchen, Guest room"
          className="mt-1.5 w-full rounded-xl border border-[hsl(var(--reset-line))] bg-white/60 px-3 py-2 text-sm text-[hsl(var(--reset-charcoal))] outline-none placeholder:text-[hsl(var(--reset-ink))]/45 focus:border-[hsl(var(--reset-sage))]"
        />
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--reset-ink))]/55">Type</p>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {KINDS.map(k => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs transition-colors",
                kind === k.id
                  ? "bg-[hsl(var(--reset-sage))] text-white"
                  : "bg-[hsl(var(--reset-cream-deep))] text-[hsl(var(--reset-ink))]/80 hover:bg-[hsl(var(--reset-sage-soft))]",
              )}
            >
              <k.icon className="h-3.5 w-3.5" />
              <span className="flex-1">{k.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className={cn(
            "mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-sm transition-transform",
            name.trim()
              ? "bg-gradient-to-r from-[hsl(var(--reset-sage))] to-[hsl(var(--reset-sage-deep))] text-white hover:-translate-y-0.5"
              : "bg-[hsl(var(--reset-cream-deep))] text-[hsl(var(--reset-ink))]/50",
          )}
        >
          <Plus className="h-3.5 w-3.5" /> Create zone
        </button>
      </PopoverContent>
    </Popover>
  );
}