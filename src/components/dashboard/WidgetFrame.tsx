import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EyeOff, Trash2, GripVertical, ChevronDown, ChevronUp, Palette } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { resolveTheme, themeStyle, type WidgetTheme } from "@/lib/widget-themes";
import { WidgetThemePicker } from "./WidgetThemePicker";

interface Props {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  editing: boolean;
  bare?: boolean;
  onHide: () => void;
  onRemove: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  pageTheme?: WidgetTheme | null;
  widgetTheme?: WidgetTheme | null;
  onThemeChange?: (next: WidgetTheme | null) => void;
  children: ReactNode;
}

export function WidgetFrame({
  title, icon: Icon, editing, bare, onHide, onRemove,
  collapsed, onToggleCollapse, pageTheme, widgetTheme, onThemeChange,
  children,
}: Props) {
  const resolved = resolveTheme(pageTheme, widgetTheme);
  const themed = !bare && resolved.preset !== "default";
  const surfaceStyle = themed ? themeStyle(resolved) : undefined;

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden transition-all",
        !bare && !themed && "cozy-card",
        themed && "widget-surface",
        editing && "ring-1 ring-primary/40 shadow-md",
      )}
      style={surfaceStyle}
    >
      {editing && (
        <div className="absolute right-2 top-2 z-20 flex items-center gap-1">
          {onThemeChange && (
            <WidgetThemePicker
              value={widgetTheme}
              onChange={onThemeChange}
              allowClear
              trigger={
                <button
                  type="button"
                  aria-label="Theme"
                  className="rounded-full bg-background/80 p-1 text-muted-foreground shadow hover:bg-background"
                >
                  <Palette className="h-3.5 w-3.5" />
                </button>
              }
            />
          )}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand" : "Collapse"}
              className="rounded-full bg-background/80 p-1 text-muted-foreground shadow hover:bg-background"
            >
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          )}
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
        <header
          className={cn(
            "flex items-start gap-2 px-4 pt-4",
            onToggleCollapse && "cursor-pointer select-none",
          )}
          onClick={() => { if (!editing && onToggleCollapse) onToggleCollapse(); }}
        >
          {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 opacity-70" />}
          <h2 className="flex-1 font-display text-base font-semibold leading-tight">{title}</h2>
          {!editing && onToggleCollapse && (
            <span className="opacity-60">
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </span>
          )}
        </header>
      )}
      {!collapsed && (
        <div className={cn("min-h-0 flex-1 overflow-auto", !bare && "px-4 pb-4 pt-2")}>
          {children}
        </div>
      )}
    </div>
  );
}