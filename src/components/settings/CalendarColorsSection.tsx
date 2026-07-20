import { useState } from "react";
import { Check, Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useKindColors, CALENDAR_PALETTE, KIND_LABEL, DEFAULT_KIND_HEX,
  kindStyleFromHex, type KindKey,
} from "@/lib/calendar-colors";
import { KIND_META } from "@/components/calendar/CalendarItemCard";
import { toast } from "sonner";

const KINDS: KindKey[] = ["task", "appt", "care", "meal", "bday", "hol", "gcal", "season", "cosmic"];

function isValidHex(v: string): boolean {
  return /^#([0-9a-f]{6})$/i.test(v.trim());
}

function Swatch({ hex, selected, onClick }: { hex: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={hex}
      className={cn(
        "relative h-7 w-7 rounded-full border transition-transform hover:scale-110",
        selected ? "border-foreground ring-2 ring-primary/40" : "border-border/60",
      )}
      style={{ backgroundColor: hex }}
    >
      {selected && <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" />}
    </button>
  );
}

function KindRow({ kind }: { kind: KindKey }) {
  const { colorOf, setColor, resetOne, overrides } = useKindColors();
  const current = colorOf(kind);
  const custom = overrides[kind];
  const [hex, setHex] = useState<string>(current);
  const meta = KIND_META[kind];
  const Icon = meta.Icon;
  const preview = kindStyleFromHex(current);

  const apply = (v: string) => {
    if (!isValidHex(v)) { toast.error("Enter a valid hex like #a855f7"); return; }
    setColor(kind, v.toLowerCase());
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card/60 p-3 sm:flex-row sm:items-center">
      {/* Label + live preview chip */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border"
          style={preview.card}
        >
          <Icon className="h-4 w-4 text-foreground" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium">{KIND_LABEL[kind]}</div>
          <div
            className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[10.5px] text-foreground"
            style={preview.card}
          >
            <Icon className="h-2.5 w-2.5" /> Sample event
          </div>
        </div>
      </div>

      {/* Palette + custom hex + reset */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CALENDAR_PALETTE.map(hex => (
          <Swatch
            key={hex}
            hex={hex}
            selected={current.toLowerCase() === hex.toLowerCase()}
            onClick={() => setColor(kind, hex)}
          />
        ))}
        <Popover onOpenChange={(o) => { if (o) setHex(current); }}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-full px-2 text-[11px]"
              title="Custom hex"
            >
              <Palette className="h-3 w-3" /> Custom
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 space-y-2 p-3">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={isValidHex(hex) ? hex : current}
                onChange={(e) => setHex(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border/60 bg-transparent p-0"
                aria-label="Color picker"
              />
              <Input
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                placeholder="#a855f7"
                className="h-8 text-xs uppercase"
              />
            </div>
            <Button size="sm" className="w-full" onClick={() => apply(hex)}>Apply</Button>
          </PopoverContent>
        </Popover>
        {custom && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
            onClick={() => resetOne(kind)}
            title={`Reset to default (${DEFAULT_KIND_HEX[kind]})`}
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        )}
      </div>
    </div>
  );
}

export function CalendarColorsSection() {
  const { overrides, resetAll } = useKindColors();
  const hasAny = Object.keys(overrides).length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Colors update everywhere the category appears — filter pills, day-cell blocks, the day detail sheet, and the list under the calendar.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => { resetAll(); toast.success("Calendar colors restored to defaults"); }}
          disabled={!hasAny}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset all to defaults
        </Button>
      </div>
      <div className="grid gap-2">
        {KINDS.map(k => <KindRow key={k} kind={k} />)}
      </div>
    </div>
  );
}