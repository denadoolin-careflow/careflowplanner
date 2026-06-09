import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/** Lightweight chevron overlay that lets a sidebar widget collapse in-place. */
export function CollapsibleWidget({ id, title, collapsed, onToggle, children }: Props) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="relative group"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
        className={cn(
          "absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm ring-1 ring-border/60 backdrop-blur transition-opacity hover:text-foreground",
          collapsed || hover ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100",
        )}
        title={collapsed ? `Expand ${title}` : `Collapse ${title}`}
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", collapsed && "-rotate-90")} />
      </button>
      {collapsed ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border/40 bg-card/60 px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-card/80"
        >
          <span className="min-w-0 break-words">{title}</span>
          <span className="shrink-0 text-[10px] uppercase tracking-wider">Show</span>
        </button>
      ) : (
        <div className="min-w-0 [overflow-wrap:anywhere]">{children}</div>
      )}
    </div>
  );
}