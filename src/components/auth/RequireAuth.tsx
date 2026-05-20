import { Navigate, useLocation } from "react-router-dom";
import { useStore } from "@/lib/store";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useStore();
  const location = useLocation();
  if (loading) {
    // Silent full-screen wash that matches the app shell background so the
    // hand-off into the real layout never flashes — especially on Android,
    // where slower paints made the previous loader card visibly pop in.
    return <div aria-hidden className="min-h-screen w-full gradient-dawn" />;
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <>{children}</>;
}