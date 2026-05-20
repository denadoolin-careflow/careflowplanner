import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import Dashboard from "@/pages/Dashboard";

/**
 * Renders at "/" — if the user has chosen a different default landing
 * page, redirect them there once per session. Otherwise render the
 * Dashboard normally. Only redirects on the very first hit so a manual
 * navigation to "/" still works.
 */
export function IndexRedirect() {
  const { state, loading } = useStore();
  const target = state.settings.defaultRoute ?? "/";

  // The <html> element paints the gradient before React mounts, so we
  // can return null while loading without showing a blank flash.
  if (loading) return null;
  if (target && target !== "/") return <Navigate to={target} replace />;
  return <Dashboard />;
}