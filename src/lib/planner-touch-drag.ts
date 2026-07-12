import { useEffect, useRef } from "react";
import { haptics } from "./haptics";

const LONG_PRESS_MS = 250;
const MOVE_CANCEL_PX = 6;

export type PlannerDragPayload = { taskId: string; label: string };
export type PlannerDropDetail = PlannerDragPayload & { clientX: number; clientY: number };

/**
 * Long-press pointer drag for planner task rows.
 * On touch/mouse long-press, floats a ghost that follows the pointer and
 * dispatches a `careflow:planner-drop` window event at the drop point.
 * Falls back to `onClick` when the user releases without pressing long.
 */
export function usePlannerPointerDrag(
  payload: () => PlannerDragPayload | null,
  opts?: { onClick?: () => void; onDragStart?: () => void; onDragEnd?: () => void },
) {
  const stateRef = useRef({
    timer: 0 as number,
    active: false,
    ghost: null as HTMLElement | null,
    startX: 0,
    startY: 0,
    pointerId: -1,
    moved: false,
  });

  function cleanup() {
    const s = stateRef.current;
    if (s.timer) { window.clearTimeout(s.timer); s.timer = 0; }
    if (s.ghost) { s.ghost.remove(); s.ghost = null; }
    if (s.active) opts?.onDragEnd?.();
    s.active = false;
    s.pointerId = -1;
    document.querySelectorAll("[data-planner-drop-active]").forEach(n => n.removeAttribute("data-planner-drop-active"));
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
  }

  function highlightAt(x: number, y: number) {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const grid = el?.closest("[data-planner-grid]") as HTMLElement | null;
    document.querySelectorAll("[data-planner-drop-active]").forEach(n => {
      if (n !== grid) n.removeAttribute("data-planner-drop-active");
    });
    if (grid && !grid.hasAttribute("data-planner-drop-active")) {
      grid.setAttribute("data-planner-drop-active", "true");
      haptics.magnet();
    }
  }

  function onMove(e: PointerEvent) {
    const s = stateRef.current;
    if (e.pointerId !== s.pointerId) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.active) {
      if (Math.abs(dx) > MOVE_CANCEL_PX || Math.abs(dy) > MOVE_CANCEL_PX) {
        s.moved = true;
        if (s.timer) { window.clearTimeout(s.timer); s.timer = 0; }
      }
      return;
    }
    e.preventDefault?.();
    if (s.ghost) {
      s.ghost.style.transform = `translate(${e.clientX + 10}px, ${e.clientY + 10}px)`;
    }
    highlightAt(e.clientX, e.clientY);
  }

  function onUp(e: PointerEvent) {
    const s = stateRef.current;
    if (e.pointerId !== s.pointerId) return;
    if (s.active) {
      const p = payload();
      if (p) {
        const detail: PlannerDropDetail = { ...p, clientX: e.clientX, clientY: e.clientY };
        window.dispatchEvent(new CustomEvent("careflow:planner-drop", { detail }));
        haptics.drop();
      }
    } else if (!s.moved) {
      opts?.onClick?.();
    }
    cleanup();
  }

  function onCancel() { cleanup(); }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== undefined && e.button !== 0) return;
    const s = stateRef.current;
    s.pointerId = e.pointerId;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.moved = false;
    s.active = false;
    s.timer = window.setTimeout(() => {
      const p = payload();
      if (!p || s.moved) return;
      s.active = true;
      haptics.pickup();
      opts?.onDragStart?.();
      const ghost = document.createElement("div");
      ghost.textContent = p.label;
      ghost.style.cssText = [
        "position:fixed", "left:0", "top:0", "z-index:9999",
        "pointer-events:none",
        "padding:6px 12px",
        "border-radius:9999px",
        "background:hsl(var(--primary))",
        "color:hsl(var(--primary-foreground))",
        "font-size:12px", "font-weight:500",
        "box-shadow:0 10px 30px hsl(var(--foreground) / 0.25)",
        `transform:translate(${s.startX + 10}px, ${s.startY + 10}px)`,
        "max-width:240px", "white-space:nowrap",
        "overflow:hidden", "text-overflow:ellipsis",
      ].join(";");
      document.body.appendChild(ghost);
      s.ghost = ghost;
      highlightAt(s.startX, s.startY);
    }, LONG_PRESS_MS);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  }

  useEffect(() => () => cleanup(), []);

  return { onPointerDown };
}

export function usePlannerDropListener(handler: (d: PlannerDropDetail) => void) {
  useEffect(() => {
    const fn = (e: Event) => handler((e as CustomEvent<PlannerDropDetail>).detail);
    window.addEventListener("careflow:planner-drop", fn as EventListener);
    return () => window.removeEventListener("careflow:planner-drop", fn as EventListener);
  }, [handler]);
}