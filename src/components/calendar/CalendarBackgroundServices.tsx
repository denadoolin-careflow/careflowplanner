import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import {
  initReminders, scheduleReminders, setReminderHandlers, onReminderReschedule,
} from "@/lib/reminders";
import { initPomodoroTracking } from "@/lib/pomodoro-tracking";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { ShortcutsPopover } from "./ShortcutsPopover";

/**
 * Mounted once inside the authed shell — starts the reminder scheduler,
 * the pomodoro ↔ time-tracker bridge, global keyboard shortcuts, and hosts
 * the ? cheat-sheet dialog.
 */
export function CalendarBackgroundServices() {
  const { state, toggleTask } = useStore();
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [nonce, setNonce] = useState(0);

  useGlobalShortcuts(() => setHelpOpen(true));

  useEffect(() => { initReminders(); initPomodoroTracking(); }, []);

  // Reminder toast actions need store + router access.
  useEffect(() => {
    setReminderHandlers({
      onComplete: (taskId) => { void toggleTask(taskId); },
      onOpen: (taskId) => navigate(`/planner?task=${taskId}`),
    });
  }, [toggleTask, navigate]);

  // Snoozing rewrites the schedule, so re-run the pass immediately.
  useEffect(() => onReminderReschedule(() => setNonce(n => n + 1)), []);

  useEffect(() => {
    const run = () => scheduleReminders(state.appointments ?? [], state.tasks ?? []);
    run();
    // Reschedule every 15 min to pick up items crossing the 24h horizon.
    const iv = setInterval(run, 15 * 60 * 1000);
    return () => clearInterval(iv);
  }, [state.appointments, state.tasks, nonce]);

  return <ShortcutsPopover open={helpOpen} onOpenChange={setHelpOpen} />;
}
