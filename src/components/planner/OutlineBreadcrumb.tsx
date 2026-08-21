/** Breadcrumb shown while a planner view is zoomed into one task's subtree. */
import { ChevronRight, X } from "lucide-react";
import { useOutline, ancestorChain, type OutlineTask } from "@/lib/planner/outline";

export function OutlineBreadcrumb({ tasks, className }: { tasks: OutlineTask[]; className?: string }) {
  const { zoomRoot, zoomTo } = useOutline();
  if (!zoomRoot) return null;
  const chain = ancestorChain(tasks, zoomRoot);
  if (!chain.length) return null;

  return (
    <nav
      aria-label="Zoomed task"
      className={`flex flex-wrap items-center gap-1 border-b border-border/60 bg-primary/5 px-3 py-1.5 text-[11px] ${className ?? ""}`}
    >
      <button type="button" onClick={() => zoomTo(null)} className="text-muted-foreground hover:text-foreground hover:underline">
        All items
      </button>
      {chain.map((t, i) => (
        <span key={t.id} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground/60" aria-hidden />
          <button
            type="button"
            onClick={() => zoomTo(t.id)}
            className={i === chain.length - 1 ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground hover:underline"}
          >
            {t.title || "Untitled"}
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => zoomTo(null)}
        aria-label="Exit zoom"
        className="ml-auto inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
      >
        <X className="h-3 w-3" /> Exit zoom
      </button>
    </nav>
  );
}
