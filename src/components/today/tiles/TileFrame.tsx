import { EyeOff, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { SIZE_LABEL, SIZE_TO_COL, useTileEdit, type TileSize } from "@/lib/today-tiles";

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
  const { editing, hidden, toggleHidden, sizes, cycleSize, move, registerTile } = useTileEdit();
  useEffect(() => { registerTile(id); }, [id, registerTile]);

  const isHidden = hidden.has(id);
  if (isHidden && !editing) return null;

  const size = sizes[id] ?? defaultSize;
  const span = SIZE_TO_COL[size];

  return (
    <div
      className={cn(
        "relative",
        span,
        editing && "rounded-3xl outline outline-1 outline-dashed outline-primary/40 outline-offset-4",
        isHidden && editing && "opacity-45",
        className,
      )}
    >
      {editing && (
        <div className="absolute -top-3 left-3 z-30 flex items-center gap-0.5 rounded-full border border-border/60 bg-card/95 px-1 py-0.5 text-[10px] shadow-sm backdrop-blur">
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