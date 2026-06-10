import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import {
  NOTE_ICONS, NOTE_ICON_CATEGORIES, searchNoteIcons,
  getLucideIcon, getRecentNoteIcons, pushRecentNoteIcon,
  type IconCategory,
} from "@/lib/note-icons";

export function NoteIconPicker({
  value,           // user override (null = auto)
  resolved,        // resolved icon to display in trigger
  onChange,
  align = "end",
  size = "default",
}: {
  value: string | null;
  resolved: string;
  onChange: (next: string | null) => void;
  align?: "start" | "center" | "end";
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (open) setRecent(getRecentNoteIcons());
  }, [open]);

  const filtered = useMemo(() => searchNoteIcons(q), [q]);
  const byCategory = useMemo(() => {
    const m: Record<IconCategory, typeof NOTE_ICONS> = {} as any;
    for (const e of filtered) {
      (m[e.category] ??= []).push(e);
    }
    return m;
  }, [filtered]);

  const Trigger = getLucideIcon(resolved);
  const isAuto = !value;

  const pick = (name: string) => {
    onChange(name);
    pushRecentNoteIcon(name);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={size === "sm" ? "sm" : "icon"}
          className={cn(
            "gap-1.5 text-muted-foreground hover:text-foreground",
            size === "sm" && "h-8 rounded-full px-2",
          )}
          aria-label="Choose note icon"
          title={isAuto ? "Auto icon (click to choose)" : "Change icon"}
        >
          <Trigger className="h-4 w-4" />
          {size === "sm" && <span className="text-xs">Icon</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-80 p-0">
        <div className="border-b border-border/60 p-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search icons…"
            className="h-8 text-sm"
            autoFocus
          />
          <div className="mt-2 flex items-center gap-1">
            <Button
              variant={isAuto ? "default" : "outline"}
              size="sm"
              className="h-7 gap-1 rounded-full text-[11px]"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              <Sparkles className="h-3 w-3" /> Auto
            </Button>
            {value && (
              <span className="text-[11px] text-muted-foreground">Override: {value}</span>
            )}
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {recent.length > 0 && !q && (
            <Section title="Recent">
              <Grid
                items={recent.map((n) => ({ name: n, label: n, category: "Symbols" as IconCategory, tags: [] }))}
                active={value}
                onPick={pick}
              />
            </Section>
          )}
          {NOTE_ICON_CATEGORIES.map((cat) => {
            const items = byCategory[cat];
            if (!items?.length) return null;
            return (
              <Section key={cat} title={cat}>
                <Grid items={items} active={value} onPick={pick} />
              </Section>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No icons match “{q}”.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Grid({
  items, active, onPick,
}: {
  items: { name: string; label: string }[];
  active: string | null;
  onPick: (name: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {items.map((it) => {
        const Icon = getLucideIcon(it.name);
        const isActive = active === it.name;
        return (
          <button
            key={it.name}
            type="button"
            onClick={() => onPick(it.name)}
            title={it.label}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-md text-foreground transition-colors hover:bg-muted/70",
              isActive && "bg-primary/15 text-primary ring-1 ring-primary/40",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}