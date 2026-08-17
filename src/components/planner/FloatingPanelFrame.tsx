import { useCallback, useEffect, useRef, useState } from "react";
import { PanelLeftOpen, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Box { x: number; y: number; w: number; h: number }

const clampBox = (b: Box): Box => {
  const vw = typeof window === "undefined" ? 1200 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const w = Math.min(Math.max(b.w, 260), Math.max(280, vw - 24));
  const h = Math.min(Math.max(b.h, 220), Math.max(240, vh - 24));
  return {
    w, h,
    x: Math.min(Math.max(b.x, 8), Math.max(8, vw - w - 8)),
    y: Math.min(Math.max(b.y, 8), Math.max(8, vh - h - 8)),
  };
};

/**
 * Floating, draggable + resizable window frame. Position and size persist
 * in local storage so the panel reopens exactly where the user left it.
 */
export function FloatingPanelFrame({
  storageKey,
  title,
  onDock,
  children,
}: {
  storageKey: string;
  title: string;
  onDock: () => void;
  children: React.ReactNode;
}) {
  const [box, setBox] = useState<Box>(() => {
    const fallback: Box = { x: 24, y: 96, w: 320, h: 520 };
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) return clampBox({ ...fallback, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    return clampBox(fallback);
  });

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(box)); } catch { /* ignore */ }
  }, [box, storageKey]);

  useEffect(() => {
    const onResize = () => setBox(b => clampBox(b));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const drag = useRef<{ mode: "move" | "e" | "s" | "se"; x: number; y: number; box: Box } | null>(null);

  const start = useCallback((mode: "move" | "e" | "s" | "se") => (e: React.PointerEvent) => {
    e.preventDefault();
    drag.current = { mode, x: e.clientX, y: e.clientY, box };
    const onMove = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.x;
      const dy = ev.clientY - d.y;
      if (d.mode === "move") setBox(clampBox({ ...d.box, x: d.box.x + dx, y: d.box.y + dy }));
      else setBox(clampBox({
        ...d.box,
        w: d.mode === "s" ? d.box.w : d.box.w + dx,
        h: d.mode === "e" ? d.box.h : d.box.h + dy,
      }));
    };
    const onUp = () => {
      drag.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [box]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const s = e.shiftKey ? 40 : 12;
    const map: Record<string, Partial<Box>> = {
      ArrowLeft: { x: box.x - s }, ArrowRight: { x: box.x + s },
      ArrowUp: { y: box.y - s }, ArrowDown: { y: box.y + s },
    };
    const next = map[e.key];
    if (next) { e.preventDefault(); setBox(clampBox({ ...box, ...next })); }
  };

  return (
    <div
      role="dialog"
      aria-label={title}
      className="fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
    >
      <div
        role="toolbar"
        aria-label={`Move ${title} panel`}
        tabIndex={0}
        onPointerDown={start("move")}
        onKeyDown={onKeyDown}
        onDoubleClick={onDock}
        className="flex cursor-grab items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-2 py-1 outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <GripHorizontal className="h-3.5 w-3.5" /> {title}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDock}
          aria-label={`Dock ${title} panel`}
        >
          <PanelLeftOpen className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

      <div onPointerDown={start("e")} className="absolute inset-y-8 right-0 w-1.5 cursor-col-resize hover:bg-primary/40" aria-hidden />
      <div onPointerDown={start("s")} className="absolute inset-x-8 bottom-0 h-1.5 cursor-row-resize hover:bg-primary/40" aria-hidden />
      <div onPointerDown={start("se")} className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize rounded-tl-md bg-border/60 hover:bg-primary/60" aria-hidden />
    </div>
  );
}
