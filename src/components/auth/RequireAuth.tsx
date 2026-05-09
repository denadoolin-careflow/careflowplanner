import { Navigate, useLocation } from "react-router-dom";
import { useStore } from "@/lib/store";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useStore();
  const location = useLocation();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center gradient-dawn">
        <div className="cozy-card p-6 text-sm text-muted-foreground">Loading your planner…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <>{children}</>;
}