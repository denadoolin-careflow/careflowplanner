import { useEffect, useRef, useState } from "react";
import { Plus, X, Zap } from "lucide-react";
import { useDraggableFab } from "@/hooks/use-draggable-fab";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { CareyAvatar } from "@/components/carey/CareyAvatar";

/**
 * One floating action button that expands into two actions:
 *  • Quick add (Plus)  → dispatches `careflow:quick-add`
 *  • AI assistant      → dispatches `careflow:open-ai-assistant`
 */
export function CombinedFab() {
  const [expanded, setExpanded] = useState(false);
  const drag = useDraggableFab("careflow:fab:combined", { right: 16, bottom: 88 });
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside.
  useEffect(() => {
    if (!expanded) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [expanded]);

  const openQuickAdd = () => {
    setExpanded(false);
    window.dispatchEvent(new CustomEvent("careflow:quick-add", { detail: { tab: "command" } }));
    haptics.tap();
  };
  const openCarey = () => {
    setExpanded(false);
    window.dispatchEvent(new Event("careflow:carey:open"));
    haptics.tap();
  };

  return (
    <div
      ref={wrapRef}
      className={cn("fixed z-40 hidden flex-col items-end gap-2 lg:flex")}
      style={drag.style}
    >
      {/* Expanded actions row: Quick add + AI */}
      <div
        className={cn(
          "flex items-center gap-2 transition-all duration-200 ease-out",
          expanded
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-75 opacity-0",
        )}
      >
        <button
          type="button"
          onClick={openQuickAdd}
          aria-label="Quick add"
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground shadow-cozy",
            "bg-gradient-to-br from-secondary-foreground to-primary",
            "transition-transform hover:scale-105 active:scale-95",
          )}
        >
          <Zap className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={openCarey}
          aria-label="Ask Carey"
          title="Ask Carey"
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-[var(--shadow-glow)] ring-1 ring-border/60",
            "transition-transform hover:scale-105 active:scale-95",
          )}
        >
          <CareyAvatar size={36} />
        </button>
      </div>

      {/* Main FAB */}
      <button
        type="button"
        ref={drag.ref as React.RefObject<HTMLButtonElement>}
        {...drag.handlers}
        onClick={(e) => {
          if (drag.dragging) { e.preventDefault(); return; }
          haptics.pickup();
          setExpanded((v) => !v);
        }}
        aria-label={expanded ? "Close quick actions" : "Open quick actions"}
        className={cn(
          "grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-cozy",
          "transition-transform hover:scale-105 active:scale-95",
          drag.dragging && "scale-110 ring-2 ring-primary/40",
          expanded && "rotate-45",
        )}
      >
        {expanded ? <X className="h-6 w-6 -rotate-45" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}