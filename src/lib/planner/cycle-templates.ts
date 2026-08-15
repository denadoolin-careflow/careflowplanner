/**
 * Cycle-aware planning templates.
 *
 * Instead of a fixed day shape, these suggest a *rhythm* for the day and week
 * based on the current cycle phase, tuned in tone by the day's moon element.
 */
import { useMemo } from "react";
import type { CyclePhase } from "@/lib/cycle";
import type { PlannerTemplate, TemplateItem } from "@/lib/planner-templates";
import type { CosmicElement } from "@/lib/planner/cosmic-link";
import { useCycleDot } from "@/lib/planner/day-rhythm";
import { getDayTheme } from "@/lib/planner/day-theme";
import { useNudgePrefs, type NudgeTone } from "@/lib/planner/nudge-prefs";

export interface CycleShape {
  phase: CyclePhase;
  label: string;
  /** How many "big" priorities feel realistic in this phase. */
  priorities: number;
  /** Suggested focus block length in minutes. */
  blockMinutes: number;
  /** Windows to keep clear, "HH:MM"–"HH:MM". */
  protect: { from: string; to: string; why: string }[];
  areas: string[];
  weekFocus: string;
  items: TemplateItem[];
}

const SHAPES: Record<CyclePhase, CycleShape> = {
  menstrual: {
    phase: "menstrual",
    label: "Menstrual",
    priorities: 1,
    blockMinutes: 30,
    protect: [{ from: "13:00", to: "14:30", why: "Rest window" }],
    areas: ["Health", "Personal", "Home"],
    weekFocus: "Close loops and rest. One meaningful thing a day is a full week.",
    items: [
      { title: "Slow start", startTime: "08:30", durMin: 30, dayPart: "morning", area: "Personal", energy: "low" },
      { title: "One anchor task", startTime: "10:00", durMin: 30, dayPart: "morning", area: "Personal", energy: "low" },
      { title: "Easy lunch", startTime: "12:30", durMin: 30, dayPart: "afternoon", area: "Meals" },
      { title: "Rest window (protected)", startTime: "13:00", durMin: 90, dayPart: "afternoon", area: "Health", energy: "low" },
      { title: "Gentle admin", startTime: "15:30", durMin: 30, dayPart: "afternoon", area: "Home", energy: "low" },
      { title: "Simple dinner", startTime: "18:00", durMin: 45, dayPart: "evening", area: "Meals" },
      { title: "Wind-down ritual", startTime: "20:30", durMin: 45, dayPart: "evening", area: "Personal", energy: "low" },
    ],
  },
  follicular: {
    phase: "follicular",
    label: "Follicular",
    priorities: 3,
    blockMinutes: 60,
    protect: [],
    areas: ["Creative Projects", "Personal", "Home"],
    weekFocus: "Start things. Sketch, plan and open new doors while energy is climbing.",
    items: [
      { title: "Morning routine", startTime: "07:00", durMin: 30, dayPart: "morning", area: "Personal", energy: "medium" },
      { title: "New-idea block", startTime: "09:00", durMin: 60, dayPart: "morning", area: "Creative Projects", energy: "high" },
      { title: "Outreach & messages", startTime: "10:30", durMin: 30, dayPart: "morning", area: "Personal", energy: "medium" },
      { title: "Lunch", startTime: "12:00", durMin: 30, dayPart: "afternoon", area: "Meals" },
      { title: "Build block", startTime: "13:30", durMin: 60, dayPart: "afternoon", area: "Creative Projects", energy: "high" },
      { title: "Errands", startTime: "15:30", durMin: 45, dayPart: "afternoon", area: "Home", energy: "medium" },
      { title: "Dinner", startTime: "17:30", durMin: 60, dayPart: "evening", area: "Meals" },
    ],
  },
  ovulatory: {
    phase: "ovulatory",
    label: "Ovulatory",
    priorities: 3,
    blockMinutes: 90,
    protect: [],
    areas: ["Appointments", "Family", "Creative Projects"],
    weekFocus: "Front-load the hard conversations and the big commitments.",
    items: [
      { title: "Morning routine", startTime: "06:45", durMin: 30, dayPart: "morning", area: "Personal", energy: "high" },
      { title: "Big commitment / meeting", startTime: "09:00", durMin: 90, dayPart: "morning", area: "Appointments", energy: "high" },
      { title: "Follow-ups", startTime: "11:00", durMin: 30, dayPart: "morning", area: "Personal", energy: "medium" },
      { title: "Lunch", startTime: "12:00", durMin: 30, dayPart: "afternoon", area: "Meals" },
      { title: "Deep work", startTime: "13:00", durMin: 90, dayPart: "afternoon", area: "Creative Projects", energy: "high" },
      { title: "People time", startTime: "16:00", durMin: 60, dayPart: "afternoon", area: "Family", energy: "medium" },
      { title: "Dinner", startTime: "17:30", durMin: 60, dayPart: "evening", area: "Meals" },
    ],
  },
  luteal: {
    phase: "luteal",
    label: "Luteal",
    priorities: 2,
    blockMinutes: 45,
    protect: [{ from: "20:00", to: "22:00", why: "Wind-down" }],
    areas: ["Home", "Money", "Caregiving"],
    weekFocus: "Finish and tidy. Detail work lands better than new beginnings.",
    items: [
      { title: "Morning routine", startTime: "07:00", durMin: 30, dayPart: "morning", area: "Personal", energy: "medium" },
      { title: "Finish an open loop", startTime: "09:00", durMin: 45, dayPart: "morning", area: "Home", energy: "medium" },
      { title: "Admin & paperwork", startTime: "10:15", durMin: 45, dayPart: "morning", area: "Money", energy: "medium" },
      { title: "Lunch", startTime: "12:00", durMin: 30, dayPart: "afternoon", area: "Meals" },
      { title: "Tidy one zone", startTime: "14:00", durMin: 45, dayPart: "afternoon", area: "Home", energy: "low" },
      { title: "Dinner", startTime: "17:30", durMin: 60, dayPart: "evening", area: "Meals" },
      { title: "Wind-down (protected)", startTime: "20:00", durMin: 60, dayPart: "evening", area: "Personal", energy: "low" },
    ],
  },
};

export const CYCLE_SHAPES = SHAPES;

/** Element tunes the *flavour* of the nudge, not the shape of the day. */
const ELEMENT_NOTE: Record<CosmicElement, string> = {
  Fire: "Move first, think after — short bursts suit today's sky.",
  Earth: "Something tangible will feel best: one finished, physical thing.",
  Air: "Words and connections flow — messages, notes, planning.",
  Water: "Feelings run close to the surface. Keep it soft and unhurried.",
};

const TONE_PREFIX: Record<NudgeTone, string> = {
  gentle: "If it feels right — ",
  neutral: "",
  direct: "Do this: ",
};

export interface CycleSuggestion {
  shape: CycleShape;
  element: CosmicElement;
  /** Ready-to-render planner template built from the phase shape. */
  template: PlannerTemplate;
  /** One-line day nudge, tone- and element-aware. */
  dayNudge: string;
  /** One-line week nudge. */
  weekNudge: string;
  /** Suggested priority titles for the day/week header. */
  priorityHints: string[];
}

const PRIORITY_HINTS: Record<CyclePhase, string[]> = {
  menstrual: ["Pick one anchor and let the rest slide", "Say no to one thing", "Rest on purpose"],
  follicular: ["Start the thing you keep circling", "Sketch the next month", "Reach out to one person"],
  ovulatory: ["Have the conversation", "Take the biggest block first", "Show up for someone"],
  luteal: ["Finish an open loop", "Clear the paperwork pile", "Tidy one zone"],
};

export function buildCycleSuggestion(
  phase: CyclePhase,
  element: CosmicElement,
  tone: NudgeTone = "gentle",
): CycleSuggestion {
  const shape = SHAPES[phase];
  const p = TONE_PREFIX[tone];
  return {
    shape,
    element,
    template: {
      id: `cycle-${phase}`,
      name: `${shape.label} day`,
      icon: "🌗",
      sortOrder: -1,
      builtIn: true,
      items: shape.items,
    },
    dayNudge: `${p}${shape.priorities} ${shape.priorities === 1 ? "priority" : "priorities"}, ${shape.blockMinutes}-minute blocks. ${ELEMENT_NOTE[element]}`,
    weekNudge: `${p}${shape.weekFocus}`,
    priorityHints: PRIORITY_HINTS[phase].slice(0, Math.max(1, shape.priorities)),
  };
}

/** Suggestion for a date, or null when cycle tracking is off. */
export function useCycleSuggestion(date: Date): CycleSuggestion | null {
  const cycle = useCycleDot(date);
  const { prefs } = useNudgePrefs();
  const element = useMemo(() => getDayTheme(date).element as CosmicElement, [date]);
  return useMemo(() => {
    if (!cycle) return null;
    return buildCycleSuggestion(cycle.phase, element, prefs.tone);
  }, [cycle, element, prefs.tone]);
}
