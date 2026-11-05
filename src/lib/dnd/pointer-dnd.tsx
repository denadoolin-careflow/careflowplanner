/**
 * Tiny shared drag-and-drop layer that works with mouse (drag after a small
 * move) and touch (press and hold, then drag). Drop zones are found under the
 * pointer via data-dropzone, so nested zones (a task row inside a phase group)
 * resolve to the innermost one that accepts the dragged item.
 */
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";

export interface DragPayload { type: "project" | "task" | "item" | "milestone"; id: string; projectId?: string; field?: string }
interface Zone { accept: DragPayload["type"][]; onDrop: (p: DragPayload) => void }

const zones = new Map<string, Zone>();
let snap: { active: DragPayload | null; over: string | null } = { active: null, over: null };
const subs = new Set<() => void>();
const emit = (next: typeof snap) => { snap = next; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
const useSnap = () => useSyncExternalStore(subscribe, () => snap, () => snap);

function zoneAt(x: number, y: number, p: DragPayload): string | null {
  let el = document.elementFromPoint(x, y) as HTMLElement | null;
  while (el) {
    const id = el.dataset?.dropzone;
    if (id && zones.get(id)?.accept.includes(p.type)) return id;
    el = el.parentElement;
  }
  return null;
}

function begin(source: HTMLElement, payload: DragPayload, x: number, y: number) {
  const r = source.getBoundingClientRect();
  const ghost = source.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, margin: "0",
    pointerEvents: "none", zIndex: "9999", opacity: "0.92", transform: "rotate(1.5deg) scale(1.02)",
    boxShadow: "0 18px 40px -12px hsl(var(--foreground) / 0.35)", borderRadius: "20px",
  });
  document.body.appendChild(ghost);
  source.style.opacity = "0.35";
  document.body.style.userSelect = "none";
  const dx = x - r.left, dy = y - r.top;
  emit({ active: payload, over: null });
  navigator.vibrate?.(10);
  return {
    move(nx: number, ny: number) {
      ghost.style.left = `${nx - dx}px`; ghost.style.top = `${ny - dy}px`;
      const over = zoneAt(nx, ny, payload);
      if (over !== snap.over) emit({ active: payload, over });
      // Auto-scroll near the viewport edges.
      const edge = 60;
      if (ny < edge) window.scrollBy(0, -12); else if (ny > window.innerHeight - edge) window.scrollBy(0, 12);
    },
    end(drop: boolean) {
      ghost.remove(); source.style.opacity = ""; document.body.style.userSelect = "";
      const over = snap.over; emit({ active: null, over: null });
      if (drop && over) zones.get(over)?.onDrop(payload);
      // Swallow the click that follows a drag so links/buttons don't fire.
      const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
      window.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", stop, { capture: true } as any), 50);
    },
  };
}

/** Make an element draggable. Spread the returned props onto it. */
export function useDraggable(payload: DragPayload, enabled = true) {
  const ref = useRef(payload); ref.current = payload;
  const s = useSnap();
  const dragging = s.active?.id === payload.id && s.active?.type === payload.type;
  if (!enabled) return { dragging: false, props: {} };
  return {
    dragging,
    props: {
      "data-draggable": "true",
      style: { WebkitTouchCallout: "none", touchAction: "manipulation" } as React.CSSProperties,
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        if ((e.target as HTMLElement).closest("input,textarea,select,[data-no-drag]")) return;
        const el = e.currentTarget; const sx = e.clientX, sy = e.clientY;
        let d: ReturnType<typeof begin> | null = null;
        const mv = (ev: PointerEvent) => {
          if (!d && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) d = begin(el, ref.current, sx, sy);
          d?.move(ev.clientX, ev.clientY);
        };
        const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); d?.end(true); };
        window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
      },
      onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).closest("input,textarea,select,[data-no-drag]")) return;
        const el = e.currentTarget; const t0 = e.touches[0]; const sx = t0.clientX, sy = t0.clientY;
        let lx = sx, ly = sy;
        let d: ReturnType<typeof begin> | null = null;
        const timer = window.setTimeout(() => { d = begin(el, ref.current, sx, sy); d.move(lx, ly); }, 380);
        const mv = (ev: TouchEvent) => {
          const t = ev.touches[0]; lx = t.clientX; ly = t.clientY;
          if (!d) { if (Math.hypot(lx - sx, ly - sy) > 8) cleanup(false); return; }
          ev.preventDefault(); d.move(lx, ly);
        };
        const endT = () => cleanup(true);
        const cancel = () => cleanup(false);
        const ctx = (ev: Event) => { if (d) ev.preventDefault(); };
        function cleanup(drop: boolean) {
          clearTimeout(timer);
          window.removeEventListener("touchmove", mv); window.removeEventListener("touchend", endT);
          window.removeEventListener("touchcancel", cancel); window.removeEventListener("contextmenu", ctx);
          d?.end(drop); d = null;
        }
        window.addEventListener("touchmove", mv, { passive: false });
        window.addEventListener("touchend", endT); window.addEventListener("touchcancel", cancel);
        window.addEventListener("contextmenu", ctx);
      },
    },
  };
}

/** Register a drop zone. Spread `props` onto the container. */
export function useDropZone(accept: DragPayload["type"][], onDrop: (p: DragPayload) => void) {
  const id = useId();
  const cb = useRef(onDrop); cb.current = onDrop;
  const key = accept.join(",");
  useEffect(() => {
    zones.set(id, { accept: key.split(",") as DragPayload["type"][], onDrop: p => cb.current(p) });
    return () => { zones.delete(id); };
  }, [id, key]);
  const s = useSnap();
  const active = !!s.active && accept.includes(s.active.type);
  return { isOver: s.over === id, isActive: active, props: { "data-dropzone": id } };
}

/** Confirmation toast with an Undo action. */
export function toastWithUndo(message: string, undo: () => void | Promise<void>) {
  toast.success(message, { action: { label: "Undo", onClick: () => void undo() } });
}
