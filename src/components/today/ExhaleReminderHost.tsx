import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  getExhaleEnabled,
  getExhaleTime,
  getExhaleLastFired,
  markExhaleFired,
  onExhaleReminderChange,
  parseHHMM,
} from "@/lib/exhale-reminder";

/**
 * Mounts globally. Once per day at the configured time (default 20:00),
 * nudges the user to begin the End-of-Day Exhale.
 */
export function ExhaleReminderHost() {
  const navigate = useNavigate();
  const location = useLocation();
  const firingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const fire = () => {
      if (firingRef.current) return;
      firingRef.current = true;
      markExhaleFired();

      const go = () => {
        navigate("/today?exhale=1");
      };

      // Browser notification if granted
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          const n = new Notification("Time to Exhale", {
            body: "End your day with a gentle wind-down ritual.",
            tag: "careflow-exhale",
          });
          n.onclick = () => { try { window.focus(); } catch {} go(); n.close(); };
        } catch {}
      }

      // In-app toast (always)
      toast("🌙 Time to Exhale", {
        description: "Close the day with a gentle wind-down.",
        duration: 30_000,
        action: { label: "Begin", onClick: go },
      });

      // Allow re-arming for the next day
      setTimeout(() => { firingRef.current = false; }, 60_000);
    };

    const check = () => {
      if (cancelled) return;
      if (!getExhaleEnabled()) return;
      const now = new Date();
      const todayISO = format(now, "yyyy-MM-dd");
      if (getExhaleLastFired() === todayISO) return;
      const minsNow = now.getHours() * 60 + now.getMinutes();
      const minsTarget = parseHHMM(getExhaleTime());
      // Window: from target time until +30 min, so missed fires can still surface
      if (minsNow >= minsTarget && minsNow <= minsTarget + 30) fire();
    };

    check();
    const id = window.setInterval(check, 30_000);
    const offChange = onExhaleReminderChange(check);
    const onVis = () => check();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      offChange();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [navigate, location.pathname]);

  return null;
}