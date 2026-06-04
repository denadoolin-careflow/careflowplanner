import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Auto-scrolls the window (and the main scroll container) to the top whenever
 * the route pathname changes. Skips hash-only navigations and respects
 * `prefers-reduced-motion`.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Instant scroll avoids the visual "blink" of a smooth animation
    // racing with the route transition fade.
    try { window.scrollTo(0, 0); } catch {}
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, [pathname]);
  return null;
}