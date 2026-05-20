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

  // While the profile is still loading, render a neutral full-bleed wash
  // (matches AppLayout background) so we never paint Dashboard for a frame
  // and then jump to the user's preferred route — that swap was the
  // visible "flash" some Android users were seeing on cold load.
  if (loading) return <div aria-hidden className="min-h-screen w-full" />;
  if (target && target !== "/") return <Navigate to={target} replace />;
  return <Dashboard />;
}