import { useEffect, useState } from "react";
import {
  Sun, Moon, CalendarDays, Slash, Flag, Zap, Bookmark, Plus, X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskListPrefs } from "@/lib/task-grouping";
import {
  BUILTIN_FILTERS, addSavedFilter, loadSavedFilters, removeSavedFilter,
  filterFingerprint, type SavedFilter,
} from "@/lib/saved-filters";

const ICONS: Record<string, LucideIcon> = {
  Sun, Moon, CalendarDays, Slash, Flag, Zap, Bookmark,
};

interface Props {
  pageId: string;
  prefs: TaskListPrefs;
  onApply: (next: Partial<TaskListPrefs>) => void;
  className?: string;
}

export function SavedFiltersBar({ pageId, prefs, onApply, className }: Props) {
  const [custom, setCustom] = useState<SavedFilter[]>(() => loadSavedFilters(pageId));
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => { setCustom(loadSavedFilters(pageId)); }, [pageId]);

  const activeFp = filterFingerprint(prefs.filter);
  const all: SavedFilter[] = [...BUILTIN_FILTERS, ...custom];

  const apply = (f: SavedFilter) => {
    onApply({
      filter: { areas: [], projectIds: [], priorities: [], tags: [], goalIds: [], dueRange: "any", matchEnergy: false, ...f.filter },
      ...(f.sort ? { sort: f.sort } : {}),
      ...(f.sortDir ? { sortDir: f.sortDir } : {}),
      ...(f.group ? { group: f.group } : {}),
    });
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Name your filter first"); return; }
    const created = addSavedFilter(pageId, {
      name: trimmed,
      icon: "Bookmark",
      filter: prefs.filter,
      sort: prefs.sort,
      sortDir: prefs.sortDir,
      group: prefs.group,
    });
    setCustom(loadSavedFilters(pageId));
    setName("");
    setSaveOpen(false);
    toast.success(`Saved "${created.name}"`);
  };

  const removeOne = (id: string) => {
    removeSavedFilter(pageId, id);
    setCustom(loadSavedFilters(pageId));
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {all.map(f => {
        const Icon = ICONS[f.icon ?? "Bookmark"] ?? Bookmark;
        const isActive = filterFingerprint(f.filter) === activeFp;
        return (
          <div key={f.id} className="group/sf relative inline-flex items-center">
            <button
              type="button"
              onClick={() => apply(f)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors",
                isActive
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/60 bg-background/70 text-muted-foreground hover:text-foreground hover:border-primary/30",
              )}
              title={`Apply: ${f.name}`}
            >
              <Icon className="h-3 w-3" />
              {f.name}
            </button>
            {!f.builtin && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeOne(f.id); }}
                aria-label={`Remove ${f.name}`}
                className="ml-0.5 hidden h-5 w-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground group-hover/sf:grid"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}

      <Popover open={saveOpen} onOpenChange={setSaveOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-full px-2 text-[12px] text-muted-foreground hover:text-foreground">
            <Plus className="h-3 w-3" /> Save view
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[280px] p-3 pointer-events-auto">
          <div className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
            Save current filter
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mornings · Family"
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
            className="h-8 text-sm"
            autoFocus
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={save}>Save</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}