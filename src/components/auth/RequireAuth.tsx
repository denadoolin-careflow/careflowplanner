import { Navigate, useLocation } from "react-router-dom";
import { useStore } from "@/lib/store";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useStore();
  const location = useLocation();
  // Only gate on AUTH hydration (one round-trip with Supabase),
  // never on the full data reload. Pages render with their own
  // skeletons so users never see a blank flash between auth states.
  if (authLoading) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 z-[100] grid place-items-center gradient-dawn animate-in fade-in duration-200"
      >
        <div className="h-6 w-6 animate-pulse rounded-full bg-primary/50 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <>{children}</>;
}