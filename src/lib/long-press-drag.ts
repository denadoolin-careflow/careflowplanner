import { useEffect, useRef } from "react";
import { haptics } from "./haptics";

const LONG_PRESS_MS = 320;
const MOVE_CANCEL_PX = 8;

export type DragPayload = { type: "task"; id: string; label: string };
export type LongDropDetail = {
  payload: DragPayload;
  iso?: string;
  part?: "morning" | "afternoon" | "evening";
  clientX: number;
  clientY: number;
};

/**
 * Long-press to start a custom pointer-driven drag (works on touch & mouse).
 * Drop targets in the DOM should expose `data-droppart` and optionally
 * `data-dropdate`. On drop, fires a `careflow:longdrop` window event with
 * the LongDropDetail payload. If the user releases without long-pressing
 * (and didn't move), `onClick` fires instead.
 */
export function useLongPressDrag(
  payload: () => DragPayload | null,
  opts?: { onClick?: () => void },
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

  function clearHighlights() {
    document
      .querySelectorAll("[data-droppart-active]")
      .forEach(n => n.removeAttribute("data-droppart-active"));
  }

  function cleanup() {
    const s = stateRef.current;
    if (s.timer) { window.clearTimeout(s.timer); s.timer = 0; }
    if (s.ghost) { s.ghost.remove(); s.ghost = null; }
    s.active = false;
    s.pointerId = -1;
    clearHighlights();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
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
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const dropEl = el?.closest("[data-droppart]") as HTMLElement | null;
    clearHighlights();
    if (dropEl) {
      dropEl.setAttribute("data-droppart-active", "true");
      haptics.magnet();
    }
  }

  function onUp(e: PointerEvent) {
    const s = stateRef.current;
    if (e.pointerId !== s.pointerId) return;
    const wasActive = s.active;
    if (wasActive) {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const dropEl = el?.closest("[data-droppart]") as HTMLElement | null;
      const p = payload();
      if (dropEl && p) {
        const part = dropEl.getAttribute("data-droppart") as LongDropDetail["part"] | null;
        const iso = dropEl.getAttribute("data-dropdate") ?? undefined;
        const detail: LongDropDetail = { payload: p, part: part ?? undefined, iso, clientX: e.clientX, clientY: e.clientY };
        window.dispatchEvent(new CustomEvent("careflow:longdrop", { detail }));
        haptics.pickup();
      }
    } else if (!s.moved) {
      opts?.onClick?.();
    }
    cleanup();
  }

  function onCancel() { cleanup(); }

  function onPointerDown(e: React.PointerEvent) {
    // Ignore right-clicks
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
    }, LONG_PRESS_MS);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  }

  useEffect(() => () => cleanup(), []);

  return { onPointerDown };
}

export function useLongDropListener(handler: (d: LongDropDetail) => void) {
  useEffect(() => {
    const fn = (e: Event) => handler((e as CustomEvent<LongDropDetail>).detail);
    window.addEventListener("careflow:longdrop", fn as EventListener);
    return () => window.removeEventListener("careflow:longdrop", fn as EventListener);
  }, [handler]);
}

/** Default hour for each day-part bucket (matches DayPartsView). */
export function partDropHour(part: "morning" | "afternoon" | "evening"): number {
  return part === "morning" ? 8 : part === "afternoon" ? 13 : 19;
}

/** Reverse: derive a day-part from an hour (5-12 = morning, etc.). */
export function hourToDayPart(h: number): "morning" | "afternoon" | "evening" | null {
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 24) return "evening";
  return null;
}