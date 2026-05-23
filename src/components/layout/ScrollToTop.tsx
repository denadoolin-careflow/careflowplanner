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
    const reduce = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: reduce ? "auto" : "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
    // Also reset the main element in case scroll is owned by a container.
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, [pathname]);
  return null;
}