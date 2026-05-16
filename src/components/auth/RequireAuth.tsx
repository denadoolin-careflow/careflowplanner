import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useStore();
  const location = useLocation();
  // Delay showing the loading screen briefly so fast session checks
  // don't cause a visible flash/blink on initial render.
  const [showLoader, setShowLoader] = useState(false);
  useEffect(() => {
    if (!loading) { setShowLoader(false); return; }
    const t = window.setTimeout(() => setShowLoader(true), 250);
    return () => window.clearTimeout(t);
  }, [loading]);
  if (loading && showLoader) {
    return (
      <div className="grid min-h-screen place-items-center gradient-dawn">
        <div className="cozy-card p-6 text-sm text-muted-foreground">Loading your planner…</div>
      </div>
    );
  }
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <>{children}</>;
}