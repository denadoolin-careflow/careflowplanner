import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { EyeOff, Trash2, GripVertical, ChevronDown, ChevronUp, Palette, Plus, ExternalLink } from "lucide-react";
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
  /** Optional link to the widget's source page (shows an "open" button). */
  pageHref?: string;
  /** Optional inline quick add. When set, a "+" button shows in the header. */
  onQuickAdd?: () => void;
  quickAddLabel?: string;
  children: ReactNode;
}

export function WidgetFrame({
  title, icon: Icon, editing, bare, onHide, onRemove,
  collapsed, onToggleCollapse, pageTheme, widgetTheme, onThemeChange,
  pageHref, onQuickAdd, quickAddLabel,
  children,
}: Props) {
  const resolved = resolveTheme(pageTheme, widgetTheme);
  const themed = !bare && resolved.preset !== "default";
  const surfaceStyle = themed ? themeStyle(resolved) : undefined;

  return (
    <div
      className={cn(
        "group/widget relative flex h-full w-full flex-col overflow-hidden transition-all duration-300",
        !bare && !themed && "cozy-card",
        themed && "widget-surface",
        editing && "ring-1 ring-primary/40 shadow-md scale-[1.005]",
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
            "flex items-start gap-1.5 px-4 pt-4",
            onToggleCollapse && "cursor-pointer select-none",
          )}
          onClick={() => { if (!editing && onToggleCollapse) onToggleCollapse(); }}
        >
          {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 opacity-70" />}
          <h2 className="flex-1 font-display text-base font-semibold leading-tight">{title}</h2>
          {!editing && (
            <div className="flex items-center gap-0.5 opacity-70 transition-opacity group-hover/widget:opacity-100">
              {onQuickAdd && (
                <button
                  type="button"
                  aria-label={quickAddLabel ?? `Add to ${title}`}
                  onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
                  className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
              {pageHref && (
                <Link
                  to={pageHref}
                  aria-label={`Open ${title}`}
                  onClick={(e) => e.stopPropagation()}
                  className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent/15 hover:text-accent-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
          {!editing && onToggleCollapse && (
            <span className="ml-1 opacity-60">
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </span>
          )}
        </header>
      )}
      <div
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden transition-[grid-template-rows] duration-300 ease-out",
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        )}
      >
        <div className={cn("min-h-0 overflow-auto", !bare && "px-4 pb-4 pt-2")}>
          {children}
        </div>
      </div>
    </div>
  );
}