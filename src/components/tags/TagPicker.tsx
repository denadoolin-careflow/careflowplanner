import { useMemo, useState } from "react";
import { Plus, Search, Check, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTags } from "@/hooks/use-tags";
import {
  TAG_COLORS, fallbackColorFor, readableTextOn, normalizeTagName,
  DEFAULT_ICON,
} from "@/lib/tags";
import { TagChip } from "./TagChip";
import { tagIconFor, TAG_ICON_OPTIONS } from "./tag-icon";
import { toast } from "sonner";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  triggerLabel?: string;
  triggerClassName?: string;
  /** Render the picker as inline chips + add button (default true).
   *  When false, the parent renders chips and this only shows a trigger. */
  inline?: boolean;
}

export function TagPicker({ value, onChange, triggerLabel = "Add tag", triggerClassName, inline = true }: Props) {
  const { tags, ensure, recolor } = useTags();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creatingColor, setCreatingColor] = useState<string>(TAG_COLORS[6].hex);
  const [creatingIcon, setCreatingIcon] = useState<string>(DEFAULT_ICON);

  const selectedSet = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, query]);

  const exactExists = !!tags.find((t) => t.name.toLowerCase() === query.trim().toLowerCase());
  const canCreate = query.trim().length > 0 && !exactExists;

  const toggle = async (name: string) => {
    const norm = normalizeTagName(name);
    if (!norm) return;
    if (selectedSet.has(norm.toLowerCase())) {
      onChange(value.filter((v) => v.toLowerCase() !== norm.toLowerCase()));
    } else {
      onChange([...value, norm]);
    }
  };

  const create = async () => {
    const name = normalizeTagName(query);
    if (!name) return;
    try {
      const t = await ensure(name, { color: creatingColor, icon: creatingIcon });
      onChange(value.includes(t.name) ? value : [...value, t.name]);
      setQuery("");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create tag");
    }
  };

  return (
    <div className={cn(inline && "flex flex-wrap items-center gap-1.5")}>
      {inline && value.map((name) => (
        <TagChip
          key={name}
          name={name}
          size="sm"
          onRemove={() => onChange(value.filter((v) => v !== name))}
        />
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-6 gap-1 rounded-full border-dashed px-2 text-[11px]", triggerClassName)}
          >
            <Plus className="h-3 w-3" />
            {triggerLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-72 rounded-2xl border-border/60 bg-card/95 p-2 shadow-xl backdrop-blur"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or create tag…"
              className="h-8 pl-7 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) { e.preventDefault(); create(); }
              }}
            />
          </div>

          <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto">
            {filtered.map((t) => {
              const Icon = tagIconFor(t.icon);
              const selected = selectedSet.has(t.name.toLowerCase());
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.name)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition",
                    "hover:bg-muted",
                  )}
                >
                  <span
                    className="grid h-5 w-5 place-items-center rounded-full"
                    style={{ backgroundColor: t.color, color: readableTextOn(t.color) }}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="flex-1 truncate">{t.name}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
            {filtered.length === 0 && !canCreate && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">No tags yet.</p>
            )}
          </div>

          {canCreate && (
            <div className="mt-2 space-y-2 rounded-xl border border-dashed border-border/70 bg-muted/30 p-2">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-6 w-6 place-items-center rounded-full"
                  style={{ backgroundColor: creatingColor, color: readableTextOn(creatingColor) }}
                >
                  {(() => { const I = tagIconFor(creatingIcon); return <I className="h-3 w-3" />; })()}
                </span>
                <span className="flex-1 truncate text-xs font-medium">Create “{query.trim()}”</span>
                <Button size="sm" className="h-7 px-2 text-xs" onClick={create}>
                  <Plus className="mr-1 h-3 w-3" /> Create
                </Button>
              </div>
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Color</div>
                <div className="flex flex-wrap gap-1">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setCreatingColor(c.hex)}
                      className={cn(
                        "h-5 w-5 rounded-full ring-1 ring-border/40 transition",
                        creatingColor === c.hex && "ring-2 ring-foreground/70 scale-110",
                      )}
                      style={{ backgroundColor: c.hex }}
                      aria-label={c.name}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Icon</div>
                <div className="grid grid-cols-8 gap-1">
                  {TAG_ICON_OPTIONS.map((i) => {
                    const I = tagIconFor(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCreatingIcon(i)}
                        className={cn(
                          "grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                          creatingIcon === i && "bg-primary/15 text-primary",
                        )}
                        title={i}
                      >
                        <I className="h-3 w-3" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}