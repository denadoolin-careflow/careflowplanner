import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { initReminders, scheduleReminders } from "@/lib/reminders";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { ShortcutsPopover } from "./ShortcutsPopover";

/**
 * Mounted once inside the authed shell — starts the reminder scheduler,
 * global keyboard shortcuts, and hosts the ? cheat-sheet dialog.
 */
export function CalendarBackgroundServices() {
  const { state } = useStore();
  const [helpOpen, setHelpOpen] = useState(false);

  useGlobalShortcuts(() => setHelpOpen(true));

  useEffect(() => { initReminders(); }, []);
  useEffect(() => {
    const run = () => scheduleReminders(state.appointments ?? [], state.tasks ?? []);
    run();
    // Reschedule every 15 min to pick up items crossing the 24h horizon.
    const iv = setInterval(run, 15 * 60 * 1000);
    return () => clearInterval(iv);
  }, [state.appointments, state.tasks]);

  return <ShortcutsPopover open={helpOpen} onOpenChange={setHelpOpen} />;
}