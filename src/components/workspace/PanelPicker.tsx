import { useState } from "react";
import { PANELS, type PanelId } from "./PanelRegistry";
import { useWorkspaceLayout } from "./useWorkspaceLayout";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PanelLeft, PanelRight, PanelLeftOpen, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

const ORDER: PanelId[] = ["inbox", "agenda", "calendar", "projects", "goals", "areas", "notes", "journal", "routines", "meals", "focus"];

export function PanelPicker() {
  const { layout, openPanel, closePanel } = useWorkspaceLayout();
  const [side, setSide] = useState<"left" | "right">("right");
  const [q, setQ] = useState("");

  const isOpen = (id: PanelId) => layout.left.includes(id) || layout.right.includes(id);
  const filtered = ORDER.filter(id => PANELS[id].title.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open side panel"
              className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card text-foreground/80 hover:bg-muted"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Side panels</TooltipContent>
      </Tooltip>
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
        <div className="px-2 pb-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search panels…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">No panels match.</div>
        )}
        {filtered.map(id => {
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