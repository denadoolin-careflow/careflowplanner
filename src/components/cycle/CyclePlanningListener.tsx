import { useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useCycle } from "@/lib/cycle-store";
import { useStore } from "@/lib/store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import {
  classifyTaskWeight,
  phaseFit,
  suggestBetterDate,
  type ItemWeight,
} from "@/lib/cycle-planning";
import { getCyclePrefs } from "@/lib/cycle-prefs";
import type { ScheduleEventDetail } from "@/lib/cycle-prefs";

/** Listens to schedule events from the store and shows phase-fit toasts. */
export function CyclePlanningListener() {
  const { settings, periods } = useCycle();
  const { updateTask, updateAppointment } = useStore();
  // mute key (per day) -> avoid spamming
  const mutedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<ScheduleEventDetail>).detail;
      if (!detail || !detail.date) return;
      if (!settings.enabled) return;
      const prefs = getCyclePrefs();
      if (!prefs.warnOnSchedule) return;
      if (periods.length === 0) return;

      const date = parseISO(detail.date);
      const info = getPhaseInfo(date, periods, settings);
      if (!info) return;

      let weight: ItemWeight;
      if (detail.kind === "appointment") {
        weight = "commitment";
      } else {
        weight = classifyTaskWeight({
          tags: detail.tags,
          energy: detail.energy,
          priority: detail.priority,
          area: (detail.area ?? "Personal") as any,
          startTime: detail.startTime,
          estMinutes: detail.estMinutes,
          title: detail.title,
        });
      }

      if (prefs.warnScope === "appointments" && weight !== "commitment") return;

      const fit = phaseFit(info.phase, weight);
      if (fit === "ideal" || fit === "ok") return;

      const mutedKey = `${format(new Date(), "yyyy-MM-dd")}:${detail.kind}:${weight}:${info.phase}`;
      if (mutedRef.current.has(mutedKey)) return;

      const suggestion = suggestBetterDate(detail.date, weight, periods, settings);
      const phaseLabel = info.label;
      const dateLabel = format(date, "EEE MMM d");

      const messages: Record<typeof weight, string> = {
        commitment: `${info.glyph} ${phaseLabel} on ${dateLabel} — your body is asking for rest. Heavy commitments now risk burnout.`,
        creative: `${info.glyph} ${phaseLabel} on ${dateLabel} — energy is winding down. New creative work may feel forced.`,
        admin: `${info.glyph} ${phaseLabel} on ${dateLabel} — admin can drain your radiant window.`,
        rest: `${info.glyph} ${phaseLabel} on ${dateLabel} — rest is better honored in slower phases.`,
      };

      const move = async () => {
        if (!suggestion) return;
        if (detail.kind === "task") await updateTask(detail.id, { dueDate: suggestion.iso });
        else await updateAppointment(detail.id, { date: suggestion.iso });
        toast.success(`Moved to ${format(parseISO(suggestion.iso), "EEE MMM d")} · ${suggestion.label}`);
      };

      toast(messages[weight], {
        duration: 9000,
        description: suggestion
          ? `Try ${format(parseISO(suggestion.iso), "EEE MMM d")} (${suggestion.label}) instead.`
          : "Consider a different day this cycle.",
        action: suggestion
          ? { label: "Move", onClick: () => void move() }
          : undefined,
        cancel: {
          label: "Mute today",
          onClick: () => { mutedRef.current.add(mutedKey); },
        },
      });
    };

    window.addEventListener("careflow:schedule-event", handler as EventListener);
    return () => window.removeEventListener("careflow:schedule-event", handler as EventListener);
  }, [settings, periods, updateTask, updateAppointment]);

  return null;
}