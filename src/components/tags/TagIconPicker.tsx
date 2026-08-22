/**
 * Searchable icon picker with a live chip preview.
 *
 * Replaces the plain icon grid: type to filter by icon or group name, see how
 * the chip will actually look in the tag's color, and reach for icons you
 * picked recently first.
 */
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { tagIconFor, TAG_ICON_GROUPS, TAG_ICON_OPTIONS } from "./tag-icon";
import { readableTextOn } from "@/lib/tags";
import { cn } from "@/lib/utils";

const RECENT_KEY = "careflow:tags:recent-icons";
const RECENT_MAX = 8;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter(x => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch { return []; }
}

export function rememberTagIcon(icon: string) {
  try {
    const next = [icon, ...readRecent().filter(i => i !== icon)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* noop */ }
}

interface Props {
  value: string;
  onChange: (icon: string) => void;
  /** Chip color used for the preview — defaults to the app primary. */
  color?: string;
  /** Name shown inside the preview chip. */
  previewName?: string;
  className?: string;
}

export function TagIconPicker({ value, onChange, color = "#6366f1", previewName = "Preview", className }: Props) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(readRecent);

  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    if (!q) return TAG_ICON_GROUPS;
    return TAG_ICON_GROUPS
      .map(g => ({
        label: g.label,
        icons: g.label.toLowerCase().includes(q) ? g.icons : g.icons.filter(i => i.includes(q)),
      }))
      .filter(g => g.icons.length > 0);
  }, [q]);

  const noMatches = q.length > 0 && groups.length === 0;
  const fallback = useMemo(() => TAG_ICON_OPTIONS.filter(i => i.includes(q)), [q]);

  const pick = (icon: string) => {
    onChange(icon);
    rememberTagIcon(icon);
    setRecent(readRecent());
  };

  const Preview = tagIconFor(value);
  const fg = readableTextOn(color);

  const button = (i: string) => {
    const I = tagIconFor(i);
    return (
      <button
        key={i}
        type="button"
        onClick={() => pick(i)}
        aria-label={`Use ${i} icon`}
        aria-pressed={value === i}
        title={i}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground",
          value === i && "bg-primary/15 text-primary ring-1 ring-primary/40",
        )}
      >
        <I className="h-4 w-4" />
      </button>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Icon</span>
        <span
          className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium"
          style={{ backgroundColor: color, color: fg }}
          aria-label="Icon preview"
        >
          <Preview className="h-3 w-3" />
          {previewName}
        </span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search icons…"
          aria-label="Search icons"
          className="h-8 pl-7 text-xs"
        />
      </div>

      <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
        {!q && recent.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] text-muted-foreground/80">Recent</div>
            <div className="grid grid-cols-8 gap-1">{recent.map(button)}</div>
          </div>
        )}
        {groups.map(g => (
          <div key={g.label}>
            <div className="mb-1 text-[10px] text-muted-foreground/80">{g.label}</div>
            <div className="grid grid-cols-8 gap-1">{g.icons.map(button)}</div>
          </div>
        ))}
        {noMatches && (
          fallback.length > 0
            ? <div className="grid grid-cols-8 gap-1">{fallback.map(button)}</div>
            : <p className="px-1 py-2 text-[11px] text-muted-foreground">No icons match “{query}”.</p>
        )}
      </div>
    </div>
  );
}
