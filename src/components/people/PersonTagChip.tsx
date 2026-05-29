import { peopleTags, fallbackPersonColor } from "@/lib/people-tags";
import { TaskIconView } from "@/components/common/LucideIconPicker";
import { cn } from "@/lib/utils";

function readableTextOn(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 165 ? "#1a1a1a" : "#ffffff";
}

export function PersonTagChip({
  name, onClick, className, size = "sm",
}: {
  name: string;
  onClick?: () => void;
  className?: string;
  size?: "xs" | "sm";
}) {
  const color = peopleTags.colorFor(name) || fallbackPersonColor(name);
  const icon = peopleTags.iconFor(name);
  const fg = readableTextOn(color);
  const Tag: any = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{ background: color, color: fg }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "xs" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-[11px]",
        onClick && "hover:opacity-90",
        className,
      )}
    >
      {icon && <TaskIconView value={icon} className="h-3 w-3" />}
      <span className="truncate">{name}</span>
    </Tag>
  );
}

export function PersonColorDot({ name, className }: { name: string; className?: string }) {
  const color = peopleTags.colorFor(name) || fallbackPersonColor(name);
  return (
    <span
      aria-hidden
      style={{ background: color }}
      className={cn("inline-block h-2 w-2 rounded-full", className)}
    />
  );
}