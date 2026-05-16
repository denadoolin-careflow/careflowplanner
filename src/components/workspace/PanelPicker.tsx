import { useState } from "react";
import { PANELS, type PanelId } from "./PanelRegistry";
import { useWorkspaceLayout } from "./useWorkspaceLayout";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PanelLeft, PanelRight, PanelLeftOpen, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ORDER: PanelId[] = ["inbox", "agenda", "calendar", "projects", "goals", "areas", "notes", "journal", "routines", "meals"];

export function PanelPicker() {
  const { layout, openPanel, closePanel } = useWorkspaceLayout();
  const [side, setSide] = useState<"left" | "right">("right");

  const isOpen = (id: PanelId) => layout.left.includes(id) || layout.right.includes(id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open side panel"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 text-foreground/80 hover:bg-muted"
        >
          <PanelLeftOpen className="h-4 w-4" />
          <span className="hidden text-xs font-medium sm:inline">Panels</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Open panel</span>
          <div className="flex items-center gap-1 rounded-md border border-border/60 p-0.5">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setSide("left"); }}
              className={cn("grid h-6 w-6 place-items-center rounded", side === "left" && "bg-muted text-foreground")}
              aria-label="Dock left"
            >
              <PanelLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setSide("right"); }}
              className={cn("grid h-6 w-6 place-items-center rounded", side === "right" && "bg-muted text-foreground")}
              aria-label="Dock right"
            >
              <PanelRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ORDER.map(id => {
          const p = PANELS[id];
          const Icon = p.icon;
          const open = isOpen(id);
          return (
            <DropdownMenuItem
              key={id}
              onSelect={(e) => { e.preventDefault(); open ? closePanel(id) : openPanel(id, side); }}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4 opacity-80" />
              <span className="flex-1">{p.title}</span>
              {open && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}