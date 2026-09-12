import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { PlannerFeedItem } from "@/lib/planner/feed";

export interface PendingMonthMove {
  item: PlannerFeedItem;
  targetISO: string;
  load: number;
}

export function dayLoad(items: PlannerFeedItem[]): number {
  return items.reduce((sum, item) => {
    if (item.done) return sum;
    if (item.estMinutes) return sum + item.estMinutes;
    if (item.time) return sum + 45;
    if (item.kind === "meal") return sum + 30;
    return sum + 20;
  }, 0);
}

export function loadLevel(minutes: number): { steps: number; label: string } {
  if (minutes <= 90) return { steps: 1, label: "Light" };
  if (minutes <= 210) return { steps: 2, label: "Room to breathe" };
  if (minutes <= 330) return { steps: 3, label: "Steady" };
  if (minutes <= 450) return { steps: 4, label: "Quite full" };
  return { steps: 5, label: "Very full" };
}

export function useMonthMove(byDay: Map<string, PlannerFeedItem[]>) {
  const { state, updateTask, updateAppointment, updateMeal } = useStore();
  const [pending, setPending] = useState<PendingMonthMove | null>(null);

  const locate = useCallback((type: string, id: string): PlannerFeedItem | null => {
    for (const rows of byDay.values()) {
      const item = rows.find(row => row.sourceRef.type === type && row.sourceRef.id === id);
      if (item) return item;
    }
    return null;
  }, [byDay]);

  const commit = useCallback(async (item: PlannerFeedItem, targetISO: string) => {
    const label = format(new Date(`${targetISO}T12:00:00`), "MMM d");
    if (item.sourceRef.type === "task") {
      await updateTask(item.sourceRef.id, { dueDate: targetISO });
      toast.success(`Moved to ${label}`);
      return;
    }
    if (item.sourceRef.type === "appointment") {
      const before = state.appointments.find(row => row.id === item.sourceRef.id)?.date;
      await updateAppointment(item.sourceRef.id, { date: targetISO });
      toast.success(`Moved to ${label}`, before ? {
        action: { label: "Undo", onClick: () => void updateAppointment(item.sourceRef.id, { date: before }) },
      } : undefined);
      return;
    }
    if (item.sourceRef.type === "meal") {
      const before = state.meals.find(row => row.id === item.sourceRef.id)?.date;
      await updateMeal(item.sourceRef.id, { date: targetISO });
      toast.success(`Meal moved to ${label}`, before ? {
        action: { label: "Undo", onClick: () => void updateMeal(item.sourceRef.id, { date: before }) },
      } : undefined);
      return;
    }
    toast.message("Open this item to change its date");
  }, [state.appointments, state.meals, updateAppointment, updateMeal, updateTask]);

  const requestMove = useCallback((type: string, id: string, targetISO: string) => {
    const item = locate(type, id);
    if (!item || item.date === targetISO) return;
    const load = dayLoad(byDay.get(targetISO) ?? []);
    if (load >= 450) {
      setPending({ item, targetISO, load });
      return;
    }
    void commit(item, targetISO);
  }, [byDay, commit, locate]);

  return useMemo(() => ({
    pending,
    cancel: () => setPending(null),
    confirm: () => {
      if (!pending) return;
      void commit(pending.item, pending.targetISO);
      setPending(null);
    },
    requestMove,
  }), [commit, pending, requestMove]);
}
