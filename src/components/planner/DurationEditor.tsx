import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESETS = [15, 30, 45, 60, 90, 120];

export function DurationEditor({
  durMin, label, title, onCommit,
}: {
  durMin: number;
  /** Text shown as the clickable trigger (e.g. "9a–9:30a"). */
  label: string;
  title: string;
  onCommit: (next: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(durMin));
  useEffect(() => { if (open) setDraft(String(durMin)); }, [open, durMin]);

  const commit = (v: number) => {
    const next = Math.max(15, Math.min(720, Math.round(v / 5) * 5));
    if (next !== durMin) onCommit(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Edit duration for ${title}, currently ${durMin} minutes`}
          className="min-w-0 truncate rounded px-0.5 text-left outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-primary"
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-60 space-y-2 p-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Duration</p>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => commit(p)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                p === durMin ? "border-primary bg-primary/15 text-primary" : "border-border/60 hover:bg-muted",
              )}
            >
              {p < 60 ? `${p}m` : p % 60 === 0 ? `${p / 60}h` : `${Math.floor(p / 60)}h${p % 60}`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Decrease by 15 minutes"
            onClick={() => setDraft(String(Math.max(15, (Number(draft) || durMin) - 15)))}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Input
            autoFocus
            type="number"
            min={15}
            step={5}
            value={draft}
            aria-label="Duration in minutes"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(Number(draft) || durMin); }
              if (e.key === "Escape") setOpen(false);
            }}
            className="h-8 text-center text-xs"
          />
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Increase by 15 minutes"
            onClick={() => setDraft(String(Math.min(720, (Number(draft) || durMin) + 15)))}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button size="sm" className="h-8 w-full text-xs" onClick={() => commit(Number(draft) || durMin)}>
          Save duration
        </Button>
      </PopoverContent>
    </Popover>
  );
}
