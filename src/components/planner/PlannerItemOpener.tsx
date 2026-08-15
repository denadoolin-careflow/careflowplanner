import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseISO } from "date-fns";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { openTaskEditor } from "@/lib/open-task-editor";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { TransitDetailSheet } from "@/components/cosmic/TransitDetailSheet";
import { eventsOnDay, type CosmicEvent } from "@/lib/cosmic/events";
import type { PlannerFeedItem } from "@/lib/planner/feed";

/**
 * Single place that decides what "opening" a planner feed item means:
 * tasks / caregiving tasks and appointments open their real editors, meals,
 * birthdays and holidays jump to their record, and cosmic events open the
 * transit detail sheet (energy, what to expect, link into Cosmic Flow).
 */
export function usePlannerItemOpener() {
  const { state } = useStore() as any;
  const navigate = useNavigate();
  const [apptId, setApptId] = useState<string | null>(null);
  const [cosmic, setCosmic] = useState<CosmicEvent | null>(null);

  const open = useCallback((item: PlannerFeedItem) => {
    const { type, id } = item.sourceRef;
    switch (type) {
      case "task":
        openTaskEditor(id);
        return;
      case "appointment":
        setApptId(id);
        return;
      case "cosmic": {
        const day = parseISO(item.date);
        const ev = eventsOnDay(day).find(e => e.id === id) ?? null;
        if (ev) setCosmic(ev);
        else navigate(`/cosmic-flow/event/${encodeURIComponent(id)}`);
        return;
      }
      case "meal":
        navigate(`/meals?date=${item.date}`);
        return;
      case "birthday":
        navigate("/seasons");
        return;
      case "holiday":
        navigate("/seasons/holidays");
        return;
      case "gcal":
        toast(item.title, { description: "Google Calendar event — edit it in Google Calendar." });
        return;
      default:
        return;
    }
  }, [navigate]);

  const appointment = useMemo(
    () => (apptId ? (state.appointments ?? []).find((a: any) => a.id === apptId) ?? null : null),
    [apptId, state.appointments],
  );

  const dialogs = (
    <>
      <AppointmentEditor
        appointment={appointment}
        open={!!appointment}
        onOpenChange={(o) => !o && setApptId(null)}
      />
      <TransitDetailSheet
        event={cosmic}
        open={!!cosmic}
        onOpenChange={(o) => !o && setCosmic(null)}
      />
    </>
  );

  return { open, dialogs };
}
