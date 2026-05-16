import { Suspense, useState, type ReactNode } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useWorkspaceLayout } from "./useWorkspaceLayout";
import { PANELS, type PanelId } from "./PanelRegistry";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function PanelDock({ ids, side }: { ids: PanelId[]; side: "left" | "right" }) {
  const { closePanel } = useWorkspaceLayout();
  const [active, setActive] = useState<PanelId>(ids[0]);
  const current = ids.includes(active) ? active : ids[0];
  const Def = PANELS[current];
  if (!Def) return null;
  const Body = Def.component;
  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-background/40 backdrop-blur-sm", side === "left" ? "border-r" : "border-l", "border-border/50")}>
      <div className="flex items-center gap-1 border-b border-border/40 bg-card/40 px-2 py-1.5">
        {ids.map(id => {
          const D = PANELS[id];
          const Icon = D.icon;
          const isActive = id === current;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn(
                "group flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{D.title}</span>
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => { e.stopPropagation(); closePanel(id); }}
                className="ml-1 grid h-3.5 w-3.5 place-items-center rounded text-muted-foreground/60 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                aria-label={`Close ${D.title}`}
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <Suspense fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">Loading…</div>}>
          <Body />
        </Suspense>
      </div>
    </div>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { layout, setSize } = useWorkspaceLayout();
  const hasLeft = layout.left.length > 0;
  const hasRight = layout.right.length > 0;

  if (!hasLeft && !hasRight) {
    return <div className="min-h-[60vh]">{children}</div>;
  }

  return (
    <div className="h-[calc(100vh-9rem)] min-h-[600px] rounded-2xl border border-border/40 bg-card/30 overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        {hasLeft && (
          <>
            <ResizablePanel
              defaultSize={layout.leftSize}
              minSize={15}
              maxSize={45}
              onResize={(s) => setSize("left", s)}
            >
              <PanelDock ids={layout.left} side="left" />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}
        <ResizablePanel defaultSize={100 - (hasLeft ? layout.leftSize : 0) - (hasRight ? layout.rightSize : 0)} minSize={30}>
          <div className="h-full overflow-auto p-4">{children}</div>
        </ResizablePanel>
        {hasRight && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={layout.rightSize}
              minSize={18}
              maxSize={50}
              onResize={(s) => setSize("right", s)}
            >
              <PanelDock ids={layout.right} side="right" />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}