import { EyeOff, ChevronLeft, ChevronRight, Maximize2, GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SIZE_LABEL, SIZE_TO_COL, useTileEdit, type TileSize } from "@/lib/today-tiles";
import { haptics } from "@/lib/haptics";

/** Chrome wrapper around every Today card. Provides hide/move/resize in edit mode
 *  and enforces the tile's column span in the parent grid. */
export function TileFrame({
  id,
  title,
  defaultSize = "md",
  className,
  children,
}: {
  id: string;
  title: string;
  defaultSize?: TileSize;
  className?: string;
  children: React.ReactNode;
}) {
  const {
    editing, hidden, toggleHidden, sizes, cycleSize, move, registerTile,
    order, moveTo, dragging, setDragging,
  } = useTileEdit();
  useEffect(() => { registerTile(id); }, [id, registerTile]);

  const isHidden = hidden.has(id);
  if (isHidden && !editing) return null;

  const size = sizes[id] ?? defaultSize;
  const span = SIZE_TO_COL[size];

  const [dropSide, setDropSide] = useState<"before" | "after" | "above" | "below" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const onDragStart = (e: React.DragEvent) => {
    if (!editing) { e.preventDefault(); return; }
    setDragging(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("application/x-tile-id", id); } catch { /* */ }
    haptics.tap();
  };
  const onDragEnd = () => { setDragging(null); setDropSide(null); };
  const onDragOver = (e: React.DragEvent) => {
    if (!editing || !dragging || dragging === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    // Prefer vertical (above/below) when the pointer is near the top/bottom edge.
    if (relY > 0.7) setDropSide("below");
    else if (relY < 0.3) setDropSide("above");
    else setDropSide(relX < 0.5 ? "before" : "after");
  };
  const onDragLeave = () => setDropSide(null);
  const onDrop = (e: React.DragEvent) => {
    if (!editing) return;
    const src = e.dataTransfer.getData("application/x-tile-id") || dragging;
    if (!src || src === id) { setDropSide(null); return; }
    e.preventDefault();
    const targetIdx = order.indexOf(id);
    if (targetIdx < 0) { setDropSide(null); return; }
    const insertAfter = dropSide === "after" || dropSide === "below";
    const insertAt = insertAfter ? targetIdx + 1 : targetIdx;
    moveTo(src, insertAt);
    setDropSide(null);
    setDragging(null);
    haptics.success();
  };

  // Mobile long-press to initiate drag: start dragging via pointer.
  // We fall back to marking as dragging + relying on drag handle for touch reorder via move buttons.
  const isBeingDragged = dragging === id;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative",
        span,
        editing && "rounded-3xl outline outline-1 outline-dashed outline-primary/40 outline-offset-4",
        isHidden && editing && "opacity-45",
        editing && "transition-transform",
        isBeingDragged && "opacity-60 scale-[0.98]",
        className,
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {editing && dropSide && dragging && dragging !== id && (
        (dropSide === "above" || dropSide === "below") ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 z-40 h-1 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]",
              dropSide === "above" ? "-top-2" : "-bottom-2",
            )}
          />
        ) : (
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 z-40 w-1 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]",
              dropSide === "before" ? "-left-2" : "-right-2",
            )}
          />
        )
      )}
      {editing && (
        <div
          className="absolute -top-3 left-3 z-30 flex items-center gap-0.5 rounded-full border border-border/60 bg-card/95 px-1 py-0.5 text-[10px] shadow-sm backdrop-blur"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="Drag to reorder"
        >
          <span className="grid h-5 w-5 cursor-grab place-items-center rounded-full text-muted-foreground hover:bg-muted active:cursor-grabbing">
            <GripVertical className="h-3 w-3" />
          </span>
          <span className="px-1 font-medium text-foreground/80">{title}</span>
          <button type="button" onClick={() => move(id, -1)} className="grid h-5 w-5 place-items-center rounded-full hover:bg-muted" aria-label="Move up">
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button type="button" onClick={() => move(id, 1)} className="grid h-5 w-5 place-items-center rounded-full hover:bg-muted" aria-label="Move down">
            <ChevronRight className="h-3 w-3" />
          </button>
          <button type="button" onClick={() => cycleSize(id)} className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10" title="Resize">
            <Maximize2 className="h-3 w-3" /> {SIZE_LABEL[size]}
          </button>
          <button type="button" onClick={() => toggleHidden(id)} className="grid h-5 w-5 place-items-center rounded-full hover:bg-muted" aria-label={isHidden ? "Show tile" : "Hide tile"}>
            <EyeOff className={cn("h-3 w-3", isHidden && "text-destructive")} />
          </button>
        </div>
      )}
      {isHidden && editing ? (
        <div className="grid h-24 place-items-center rounded-3xl border border-dashed border-border/50 bg-muted/20 text-[11px] text-muted-foreground">
          {title} — hidden
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/** Small button that toggles the tile editor. */
export function TileEditToggle() {
  const { editing, setEditing, reset } = useTileEdit();
  return (
    <div className="inline-flex items-center gap-1">
      {editing && (
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-border/60 bg-card/70 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Reset layout
        </button>
      )}
      <button
        type="button"
        onClick={() => setEditing(!editing)}
        className={cn(
          "rounded-full border border-border/60 bg-card/70 px-2 py-1 text-[11px]",
          editing ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {editing ? "Done" : "Edit layout"}
      </button>
    </div>
  );
}

/** Palette of hidden tiles for restoring. Renders only in edit mode. */
export function TilePalette({ tiles }: { tiles: { id: string; title: string }[] }) {
  const { editing, hidden, toggleHidden } = useTileEdit();
  if (!editing) return null;
  const hiddenList = tiles.filter(t => hidden.has(t.id));
  if (hiddenList.length === 0) return null;
  return (
    <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">Hidden tiles — tap to restore</div>
      <div className="flex flex-wrap gap-1.5">
        {hiddenList.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggleHidden(t.id)}
            className="rounded-full border border-border/60 bg-card/80 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-card"
          >
            + {t.title}
          </button>
        ))}
      </div>
    </div>
  );
}