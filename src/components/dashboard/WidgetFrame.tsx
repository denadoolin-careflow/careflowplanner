import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EyeOff, Trash2, GripVertical } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface Props {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  editing: boolean;
  bare?: boolean;
  onHide: () => void;
  onRemove: () => void;
  children: ReactNode;
}

export function WidgetFrame({ title, icon: Icon, editing, bare, onHide, onRemove, children }: Props) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-2xl transition-shadow",
        !bare && "cozy-card",
        editing && "ring-1 ring-primary/40 shadow-md",
      )}
    >
      {editing && (
        <div className="absolute right-2 top-2 z-20 flex items-center gap-1">
          <span className="drag-handle cursor-grab rounded-full bg-background/80 p-1 text-muted-foreground shadow hover:bg-background active:cursor-grabbing">
            <GripVertical className="h-3.5 w-3.5" />
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full bg-background/80 p-1 text-muted-foreground shadow hover:bg-background">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onHide}>
                <EyeOff className="mr-2 h-3.5 w-3.5" /> Hide widget
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRemove} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {!bare && (
        <header className="flex items-start gap-2 px-4 pt-4">
          {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />}
          <h2 className="font-display text-base font-semibold leading-tight">{title}</h2>
        </header>
      )}
      <div className={cn("min-h-0 flex-1 overflow-auto", !bare && "px-4 pb-4 pt-2")}>{children}</div>
    </div>
  );
}