import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MOBILE_NAV } from "@/lib/nav";
import { haptics } from "@/lib/haptics";

const NAV_ORDER_KEY = "careflow:mobile-nav-order";

function loadOrder(): string[] {
  if (typeof window === "undefined") return MOBILE_NAV.map(n => n.to);
  try {
    const raw = window.localStorage.getItem(NAV_ORDER_KEY);
    if (!raw) return MOBILE_NAV.map(n => n.to);
    const ids = JSON.parse(raw);
    return Array.isArray(ids) && ids.length ? ids : MOBILE_NAV.map(n => n.to);
  } catch {
    return MOBILE_NAV.map(n => n.to);
  }
}

/**
 * Enables left/right swipe gestures on the main content area to navigate
 * between top-level tabs (mobile only). Ignored when starting on an
 * interactive element so it never fights with horizontal scrollers, sliders,
 * carousels, or drag handles.
 */
export function SwipeNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const startRef = useRef<{ x: number; y: number; t: number; ignore: boolean } | null>(null);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.innerWidth >= 1024) return; // mobile only
      const t = e.touches[0];
      const target = e.target as HTMLElement | null;
      const ignore = !!target?.closest(
        "input,textarea,select,button,[role='slider'],[role='tablist'],[data-no-swipe],.no-swipe,[contenteditable='true']",
      );
      startRef.current = { x: t.clientX, y: t.clientY, t: Date.now(), ignore };
    };
    const onEnd = (e: TouchEvent) => {
      const s = startRef.current; startRef.current = null;
      if (!s || s.ignore) return;
      const end = e.changedTouches[0];
      const dx = end.clientX - s.x;
      const dy = end.clientY - s.y;
      const dt = Date.now() - s.t;
      if (dt > 600) return;
      if (Math.abs(dx) < 80 || Math.abs(dy) > 60) return;
      // Edge swipes can collide with browser back gestures.
      if (s.x < 24 || s.x > window.innerWidth - 24) return;
      const order = loadOrder();
      const idx = order.indexOf(pathname);
      if (idx < 0) return;
      const nextIdx = dx < 0 ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= order.length) return;
      haptics.swipe();
      navigate(order[nextIdx]);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [navigate, pathname]);

  return null;
}