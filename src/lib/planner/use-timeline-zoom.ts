import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Vertical zoom for the planner timeline: scales how many pixels one hour
 * occupies. Persisted so the grid keeps the density you picked.
 */
const KEY = "careflow.planner.timelineZoom";
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;

const clamp = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function useTimelineZoom() {
  const [zoom, setZoomState] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const v = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? clamp(v) : 1;
  });

  const setZoom = useCallback((next: number | ((z: number) => number)) => {
    setZoomState(prev => {
      const value = clamp(typeof next === "function" ? next(prev) : next);
      try { window.localStorage.setItem(KEY, String(value)); } catch { /* ignore */ }
      return value;
    });
  }, []);

  const zoomBy = useCallback((factor: number) => setZoom(z => z * factor), [setZoom]);
  const reset = useCallback(() => setZoom(1), [setZoom]);

  return { zoom, setZoom, zoomBy, reset };
}

/**
 * Ctrl/⌘ + wheel and trackpad pinch zooming on a scroll container, keeping the
 * time under the pointer anchored. Attaches a non-passive native listener.
 */
export function useTimelineWheelZoom(
  scrollRef: React.RefObject<HTMLElement>,
  zoom: number,
  setZoom: (next: number | ((z: number) => number)) => void,
) {
  const handlerRef = useRef<(e: WheelEvent) => void>(() => {});
  handlerRef.current = (e: WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    const next = clamp(zoom * Math.exp(-dy * 0.0015));
    if (next === zoom) return;
    // Keep the hour under the cursor in place after the scale changes.
    const rect = el.getBoundingClientRect();
    const py = e.clientY - rect.top + el.scrollTop;
    const k = next / zoom;
    setZoom(next);
    requestAnimationFrame(() => {
      el.scrollTop = py * k - (e.clientY - rect.top);
    });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // plain scroll stays scrolling
      e.preventDefault();
      handlerRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollRef]);
}

/** Two-finger pinch zoom on touch devices, anchored on the pinch midpoint. */
export function useTimelinePinchZoom(
  scrollRef: React.RefObject<HTMLElement>,
  zoom: number,
  setZoom: (next: number | ((z: number) => number)) => void,
) {
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const points = new Map<number, { x: number; y: number }>();
    let startDist = 0;
    let startZoom = 1;

    const dist = () => {
      const [a, b] = Array.from(points.values());
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (points.size === 2) { startDist = dist(); startZoom = zoomRef.current; }
    };
    const onMove = (e: PointerEvent) => {
      if (!points.has(e.pointerId)) return;
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (points.size !== 2 || !startDist) return;
      e.preventDefault();
      setZoom(clamp(startZoom * (dist() / startDist)));
    };
    const onUp = (e: PointerEvent) => {
      points.delete(e.pointerId);
      if (points.size < 2) startDist = 0;
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [scrollRef, setZoom]);
}
