import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { MealTheme } from "@/lib/meal-themes";

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function ThemeChip({ theme, onClick, compact = false }: {
  theme: MealTheme;
  onClick?: () => void;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `theme-${theme.id}`,
    data: { themeId: theme.id },
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      onClick={onClick}
      className={cn(
        "group inline-flex shrink-0 cursor-grab items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200 transition hover:bg-amber-400/20",
        compact && "px-2 py-0.5 text-[11px]",
        isDragging && "opacity-50",
      )}>
      <span>{theme.emoji ?? "🍽️"}</span>
      <span className="truncate">{theme.name}</span>
      {theme.weekday != null && (
        <span className="rounded-full bg-amber-400/20 px-1.5 text-[9px] uppercase">{WEEKDAYS[theme.weekday]}</span>
      )}
      <span className="text-[9px] text-amber-300/70">{theme.meal_ids.length}</span>
    </div>
  );
}