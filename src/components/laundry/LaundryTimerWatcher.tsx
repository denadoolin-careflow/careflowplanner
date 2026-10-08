import { useEffect } from "react";
import { toast } from "sonner";
import { readLoads, updateLoad } from "@/lib/laundry";
import { playPomodoroChime } from "@/lib/pomodoro-chime";

/** App-wide: chimes + notifies when a washer or dryer timer finishes. */
export function LaundryTimerWatcher() {
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      for (const l of readLoads()) {
        if (!l.endsAt || l.notified || l.endsAt > now) continue;
        if (l.stage !== "washer" && l.stage !== "dryer") continue;
        updateLoad(l.id, { notified: true });
        const msg = l.stage === "dryer"
          ? `${l.owner}'s load is dry — time to take it out!`
          : `${l.owner}'s load is washed — move it to the dryer.`;
        playPomodoroChime("focus");
        toast.success(msg, { duration: 15000 });
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Laundry", { body: msg });
          }
        } catch { /* ignore */ }
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);
  return null;
}
