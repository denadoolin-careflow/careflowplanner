import { Navigate, useLocation } from "react-router-dom";
import { useStore } from "@/lib/store";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useStore();
  const location = useLocation();
  if (loading) {
    // The <html> element already paints the active theme's gradient
    // (see index.html), so returning null here avoids mounting +
    // unmounting an extra full-screen wash that would cause a one-frame
    // flicker between the loading screen and the real AppLayout.
    return null;
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <>{children}</>;
}