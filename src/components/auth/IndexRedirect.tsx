import { Navigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useCareProfile } from "@/lib/care-methodology";
import Landing from "@/pages/Landing";

const FALLBACK_ROUTE = "/home-reset";
const ONBOARDING_DONE_KEY = "careflow.onboarding.completed";

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

function cachedOnboardingDone(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(ONBOARDING_DONE_KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch { return null; }
}

export function IndexRedirect() {
  const { state, loading, user, authLoading } = useStore();
  const { profile, loading: careLoading } = useCareProfile();

  // Wait for auth to hydrate before deciding where to send the visitor.
  // Otherwise a brief Navigate→/today happens, RequireAuth catches it,
  // and the user lands on /auth before our Landing check can run.
  if (authLoading) {
    return (
      <div aria-hidden className="fixed inset-0 z-[100] grid place-items-center gradient-dawn">
        <div className="h-6 w-6 animate-pulse rounded-full bg-primary/50" />
      </div>
    );
  }

  // Public landing page for signed-out visitors.
  if (!user) return <Landing />;

  const cached = readCachedDefaultRoute();
  const liveRaw = state.settings.defaultRoute;
  const live = liveRaw && liveRaw !== "/" ? liveRaw : FALLBACK_ROUTE;
  const target = !loading ? live : cached;

  // Persist onboarding state to localStorage so the very first render after
  // login knows where to go — no flash from /today → /onboarding.
  if (!careLoading) {
    try {
      window.localStorage.setItem(
        ONBOARDING_DONE_KEY,
        profile.completed_at ? "1" : "0",
      );
    } catch { /* noop */ }
    if (!profile.completed_at) return <Navigate to="/onboarding" replace />;
    return <Navigate to={target} replace />;
  }

  // Care profile still loading — use cached signal to avoid a wrong jump.
  const cachedDone = cachedOnboardingDone();
  if (cachedDone === false) return <Navigate to="/onboarding" replace />;
  return <Navigate to={target} replace />;
}