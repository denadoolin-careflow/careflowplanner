import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fallbackColorFor, readableTextOn } from "@/lib/tags";
import { useTags } from "@/hooks/use-tags";
import { tagIconFor } from "./tag-icon";
import { TagPreviewHover } from "./TagPreview";

interface Props {
  name: string;
  /** Render as a Link to the tag-detail page. */
  linkable?: boolean;
  onRemove?: () => void;
  className?: string;
  size?: "xs" | "sm" | "md";
  /** Use the muted/outline style instead of a saturated chip. */
  subtle?: boolean;
}

export function TagChip({ name, linkable, onRemove, className, size = "sm", subtle }: Props) {
  const { resolve } = useTags();
  const meta = resolve(name);
  const Icon = tagIconFor(meta.icon);
  const color = meta.color || fallbackColorFor(name);
  const fg = readableTextOn(color);

  const sizeCls =
    size === "xs" ? "h-5 px-1.5 text-[10px] gap-1" :
    size === "md" ? "h-7 px-2.5 text-xs gap-1.5" :
    "h-6 px-2 text-[11px] gap-1";
  const iconCls = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  const inner = (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-all",
        sizeCls,
        subtle && "border",
        className,
      )}
      style={
        subtle
          ? { borderColor: color + "66", color, backgroundColor: color + "1f" }
          : { backgroundColor: color, color: fg }
      }
    >
      <Icon className={iconCls} />
      <span className="truncate">{meta.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className="ml-0.5 grid h-4 w-4 place-items-center rounded-full hover:bg-black/15"
          aria-label={`Remove ${meta.name}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );

  if (linkable) {
    return (
      <TagPreviewHover name={meta.name}>
        <Link
          to={`/tags/${encodeURIComponent(meta.name)}`}
          className="inline-flex hover:-translate-y-px"
          onClick={(e) => e.stopPropagation()}
        >
          {inner}
        </Link>
      </TagPreviewHover>
    );
  }
  return inner;
}