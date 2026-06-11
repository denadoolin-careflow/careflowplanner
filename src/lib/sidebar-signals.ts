/**
 * Per-flow "something for today" counts for the collapsed sidebar rail.
 * Each entry is a small number (or 0) that drives a dot indicator next to
 * the flow icon. Pure read of useStore + cheap helpers — no network.
 */
import { useMemo } from "react";
import { useStore, todayISO } from "@/lib/store";
import { getActiveAspects } from "@/lib/cosmic/active-aspects";

export interface FlowSignal {
  count: number;
  tone: "info" | "urgent";
}

export type FlowSignals = Record<string, FlowSignal>;

const EMPTY: FlowSignal = { count: 0, tone: "info" };

export function useFlowSignals(): FlowSignals {
  const { state } = useStore();
  const iso = todayISO();

  return useMemo<FlowSignals>(() => {
    const tasksToday = (state.tasks ?? []).filter(
      (t: any) => t.dueDate === iso && !t.done && t.status !== "parked",
    ).length;

    const habitsToday = (state.habits ?? []).filter(
      (h: any) => !h.log?.[iso],
    ).length;

    let aspectsToday = 0;
    try { aspectsToday = getActiveAspects(new Date(), 5).length; } catch { aspectsToday = 0; }

    return {
      planflow:    { count: tasksToday,   tone: tasksToday >= 8 ? "urgent" : "info" },
      wellflow:    { count: habitsToday,  tone: "info" },
      lunarflow:   { count: aspectsToday, tone: "info" },
      cosmicflow:  { count: aspectsToday, tone: "info" },
      careflow:    EMPTY,
      homeflow:    EMPTY,
      growthflow:  EMPTY,
      moneyflow:   EMPTY,
      seasonsflow: EMPTY,
      settings:    EMPTY,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso, state.tasks, state.habits]);
}