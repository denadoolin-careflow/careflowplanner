import { Navigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import Dashboard from "@/pages/Dashboard";

/**
 * Renders at "/" and honours the user's chosen default landing page.
 *
 * To eliminate the dashboard ↔ today flash on cold boot, we read the
 * cached defaultRoute synchronously from localStorage BEFORE the store
 * has finished loading. This way we know where to send the user on the
 * very first paint instead of mounting Dashboard, then redirecting once
 * settings arrive from the server.
 */
function readCachedDefaultRoute(): string {
  if (typeof window === "undefined") return "/";
  try {
    const v = window.localStorage.getItem("careflow.defaultRoute");
    return v && v !== "/" ? v : "/";
  } catch {
    return "/";
  }
}

export function IndexRedirect() {
  const { state, loading } = useStore();
  const cached = readCachedDefaultRoute();
  const live = state.settings.defaultRoute ?? "/";
  // Prefer live value once loaded, otherwise the synchronously-cached one.
  const target = !loading ? live : cached;

  if (target && target !== "/") return <Navigate to={target} replace />;
  // While the store is still loading and there is no cached redirect,
  // render nothing rather than flashing Dashboard.
  if (loading) return null;
  return <Dashboard />;
}