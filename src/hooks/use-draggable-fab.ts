import { useEffect, useRef, useState, useCallback } from "react";
import { haptics } from "@/lib/haptics";

export interface FabPosition {
  /** distance from right edge (px) */
  right: number;
  /** distance from bottom edge (px) */
  bottom: number;
  /** which side it snapped to */
  side: "left" | "right";
}

const MARGIN = 12;
const SNAP_THRESHOLD = 56;
const FAB_SIZE = 56;

function loadPos(key: string, fallback: FabPosition): FabPosition {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const p = JSON.parse(raw);
    if (typeof p?.right === "number" && typeof p?.bottom === "number") {
      return { right: p.right, bottom: p.bottom, side: p.side === "left" ? "left" : "right" };
    }
  } catch {}
  return fallback;
}

function savePos(key: string, pos: FabPosition) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(pos)); } catch {}
}

function clampToViewport(left: number, top: number) {
  if (typeof window === "undefined") return { left, top };
  const W = window.innerWidth;
  const H = window.innerHeight;
  return {
    left: Math.max(MARGIN, Math.min(W - FAB_SIZE - MARGIN, left)),
    top: Math.max(MARGIN, Math.min(H - FAB_SIZE - MARGIN, top)),
  };
}

/**
 * Draggable floating button with magnetic edge snapping and per-device persistence.
 * Returns a ref to attach to the button and the inline style describing its position.
 */
export function useDraggableFab(
  storageKey: string,
  defaults: { right: number; bottom: number },
) {
  const initial: FabPosition = { right: defaults.right, bottom: defaults.bottom, side: "right" };
  const [pos, setPos] = useState<FabPosition>(() => loadPos(storageKey, initial));
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    moved: boolean;
    nearEdge: "left" | "right" | null;
  } | null>(null);

  // Re-clamp on window resize so the button stays on-screen.
  useEffect(() => {
    const onResize = () => {
      setPos((p) => {
        if (typeof window === "undefined") return p;
        const W = window.innerWidth;
        const H = window.innerHeight;
        const right = Math.min(p.right, W - FAB_SIZE - MARGIN);
        const bottom = Math.min(p.bottom, H - FAB_SIZE - MARGIN);
        return { ...p, right: Math.max(MARGIN, right), bottom: Math.max(MARGIN, bottom) };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      moved: false,
      nearEdge: null,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 6) return; // tap threshold
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      haptics.pickup();
    }
    const { left, top } = clampToViewport(d.originLeft + dx, d.originTop + dy);
    if (typeof window === "undefined") return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const right = Math.max(MARGIN, W - left - FAB_SIZE);
    const bottom = Math.max(MARGIN, H - top - FAB_SIZE);
    // magnet hint
    const distLeft = left;
    const distRight = W - left - FAB_SIZE;
    const nextNear = distLeft < SNAP_THRESHOLD ? "left" : distRight < SNAP_THRESHOLD ? "right" : null;
    if (nextNear && nextNear !== d.nearEdge) haptics.magnet();
    d.nearEdge = nextNear;
    setPos({ right, bottom, side: distLeft < distRight ? "left" : "right" });
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.moved) {
      setPos((p) => {
        if (typeof window === "undefined") return p;
        const W = window.innerWidth;
        // edge magnet snap to nearest side
        const leftDist = W - p.right - FAB_SIZE; // current "left" coord
        const snapToLeft = leftDist < W / 2;
        const next: FabPosition = snapToLeft
          ? { ...p, right: W - FAB_SIZE - MARGIN, side: "left" }
          : { ...p, right: MARGIN, side: "right" };
        savePos(storageKey, next);
        haptics.snap();
        return next;
      });
    }
    setDragging(false);
    dragRef.current = null;
    try { ref.current?.releasePointerCapture(e.pointerId); } catch {}
  }, [storageKey]);

  // Did the user actually drag? (consumers can suppress the click)
  const wasDragged = useCallback(() => {
    // dragRef is cleared by endDrag; check `dragging` flag right after pointerup.
    return false;
  }, []);

  const style: React.CSSProperties = {
    right: pos.right,
    bottom: pos.bottom,
    transition: dragging ? "none" : "right 240ms cubic-bezier(.2,.8,.2,1), bottom 240ms cubic-bezier(.2,.8,.2,1), transform 180ms",
    touchAction: "none",
  };

  return {
    ref,
    style,
    dragging,
    side: pos.side,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
    wasDragged,
  };
}