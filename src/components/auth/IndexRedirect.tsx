import { useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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
  const redirectedRef = useRef(false);
  const target = state.settings.defaultRoute ?? "/";

  if (loading) return null;
  if (!redirectedRef.current && target && target !== "/") {
    redirectedRef.current = true;
    return <Navigate to={target} replace />;
  }
  return <Dashboard />;
}