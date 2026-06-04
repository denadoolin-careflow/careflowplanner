import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FolderKanban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Props = {
  /** Called instead of navigation when a project is selected. */
  onPick?: (projectId: string) => void;
  /** Hide the heading row — useful inside compact popovers. */
  compact?: boolean;
  /** Auto-focus the search input on mount. */
  autoFocus?: boolean;
  className?: string;
};

/**
 * Searchable project jumper. Used in the Inbox side panel empty state
 * and inside the "Move" hover action on tasks.
 */
export function ProjectQuickJump({ onPick, compact = false, autoFocus = false, className }: Props) {
  const { state } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const projects = useMemo(() => {
    const all = (state.projects ?? []).filter((p: any) => !p.archivedAt);
    const term = q.trim().toLowerCase();
    const filtered = term
      ? all.filter((p: any) =>
          p.name?.toLowerCase().includes(term) ||
          (p.area ?? "").toLowerCase().includes(term))
      : all;
    return filtered.slice(0, 40);
  }, [state.projects, q]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of state.tasks) {
      if (t.done || t.parentTaskId) continue;
      if (!t.projectId) continue;
      m.set(t.projectId, (m.get(t.projectId) ?? 0) + 1);
    }
    return m;
  }, [state.tasks]);

  const handlePick = (id: string) => {
    if (onPick) onPick(id);
    else navigate(`/projects/${id}`);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {!compact && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <FolderKanban className="h-3 w-3" /> Jump to project
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a project…"
          autoFocus={autoFocus}
          className="h-7 pl-7 text-xs"
        />
      </div>
      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          {q ? "No matches." : "No projects yet."}
        </p>
      ) : (
        <ul className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
          {projects.map((p: any) => {
            const count = counts.get(p.id) ?? 0;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => handlePick(p.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color || "hsl(var(--muted-foreground) / 0.5)" }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground">{p.name}</span>
                  {count > 0 && (
                    <span className="shrink-0 rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}