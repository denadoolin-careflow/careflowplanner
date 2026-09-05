/**
 * Touch-friendly drag for planner grids.
 *
 * HTML5 drag-and-drop doesn't fire on touch, so this adds a long-press
 * "pick up" gesture that follows the finger and drops on whichever element
 * carries `data-drop-day="YYYY-MM-DD"` under the release point.
 */
import { useCallback, useRef, useState } from "react";

const LONG_PRESS_MS = 320;
const MOVE_TOLERANCE = 8;

export interface TouchDragPayload {
  type: string;
  id: string;
  label: string;
}

export function useTouchDrag(onDrop: (payload: TouchDragPayload, dayISO: string) => void) {
  const [dragging, setDragging] = useState<TouchDragPayload | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const start = useRef<{ x: number; y: number } | null>(null);
  const active = useRef(false);

  const dayAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    return el?.closest<HTMLElement>("[data-drop-day]")?.dataset.dropDay ?? null;
  };

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    active.current = false;
    start.current = null;
    setDragging(null);
    setOverDay(null);
    setPoint(null);
  }, []);

  /** Spread onto a draggable chip: `{...handlers(payload)}`. */
  const handlers = useCallback((payload: TouchDragPayload) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return;
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        active.current = true;
        setDragging(payload);
        setPoint({ x: e.clientX, y: e.clientY });
        if (navigator.vibrate) navigator.vibrate(8);
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!active.current) {
        const s = start.current;
        if (s && (Math.abs(e.clientX - s.x) > MOVE_TOLERANCE || Math.abs(e.clientY - s.y) > MOVE_TOLERANCE)) {
          if (timer.current) clearTimeout(timer.current);
          start.current = null;
        }
        return;
      }
      e.preventDefault();
      setPoint({ x: e.clientX, y: e.clientY });
      setOverDay(dayAt(e.clientX, e.clientY));
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (timer.current) clearTimeout(timer.current);
      if (active.current && dragging) {
        const day = dayAt(e.clientX, e.clientY);
        if (day) onDrop(dragging, day);
      }
      cancel();
    },
    onPointerCancel: cancel,
    style: { touchAction: active.current ? "none" as const : undefined },
  }), [cancel, dragging, onDrop]);

  /** Floating label that follows the finger while dragging. */
  const ghost = dragging && point ? (
    {
      label: dragging.label,
      x: point.x,
      y: point.y,
    }
  ) : null;

  return { handlers, dragging, overDay, ghost, cancel };
}
