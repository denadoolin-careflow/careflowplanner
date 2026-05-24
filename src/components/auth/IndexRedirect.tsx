import { Navigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useCareProfile } from "@/lib/care-methodology";

const FALLBACK_ROUTE = "/today";

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
  if (typeof window === "undefined") return FALLBACK_ROUTE;
  try {
    const v = window.localStorage.getItem("careflow.defaultRoute");
    return v && v !== "/" ? v : FALLBACK_ROUTE;
  } catch {
    return FALLBACK_ROUTE;
  }
}

export function IndexRedirect() {
  const { state, loading } = useStore();
  const { profile, loading: careLoading } = useCareProfile();
  const cached = readCachedDefaultRoute();
  const liveRaw = state.settings.defaultRoute;
  const live = liveRaw && liveRaw !== "/" ? liveRaw : FALLBACK_ROUTE;
  // Prefer live value once loaded, otherwise the synchronously-cached one.
  const target = !loading ? live : cached;
  if (!careLoading && !profile.completed_at) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Navigate to={target} replace />;
}