import type { Task, Appointment } from "@/lib/types";
import { format, parseISO } from "date-fns";

export type DayPulseStatus = "soft" | "balanced" | "full" | "overloaded";

export interface DayPulse {
  status: DayPulseStatus;
  label: string;
  message: string;
  scheduledCount: number;
  completedCount: number;
  freeMinutes: number;
  overlaps: number;
  unscheduledPriorities: number;
  carey?: string;
}

const START_H = 5;
const END_H = 22;

function hmToMin(hm?: string | null): number | null {
  if (!hm || !/^\d{2}:\d{2}/.test(hm)) return null;
  const [h, m] = hm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function computeDayPulse(
  date: Date,
  tasks: Task[],
  appointments: Appointment[] = [],
  blocks: { startTime: string; endTime: string; taskId?: string | null }[] = [],
): DayPulse {
  const iso = format(date, "yyyy-MM-dd");
  const dayTasks = tasks.filter(t => t.dueDate === iso);
  const scheduled = dayTasks.filter(t => !!t.startTime);
  const done = dayTasks.filter(t => t.done);
  const priorities = tasks.filter(t => t.isTopThree && !t.done);
  const unschedPri = priorities.filter(t => !t.dueDate || t.dueDate !== iso || !t.startTime).length;

  // Build interval list to detect overlaps + free time within the 5a–10p window.
  const intervals: { s: number; e: number }[] = [];
  const push = (s: number | null, e: number | null) => {
    if (s == null || e == null) return;
    if (e <= START_H * 60 || s >= END_H * 60) return;
    intervals.push({ s: Math.max(s, START_H * 60), e: Math.min(e, END_H * 60) });
  };
  for (const t of scheduled) {
    const s = hmToMin(t.startTime); if (s == null) continue;
    push(s, s + (t.estMinutes ?? 30));
  }
  for (const b of blocks) push(hmToMin(b.startTime), hmToMin(b.endTime));
  for (const a of appointments) if (a.date === iso) push(hmToMin(a.time ?? undefined), hmToMin(a.endTime ?? undefined) ?? (hmToMin(a.time ?? undefined) ?? 0) + 30);

  intervals.sort((a, b) => a.s - b.s);
  let overlaps = 0;
  let busy = 0;
  let cursor = START_H * 60;
  for (let i = 0; i < intervals.length; i++) {
    const iv = intervals[i];
    if (i > 0 && iv.s < intervals[i - 1].e) overlaps++;
    if (iv.s > cursor) cursor = iv.s;
    if (iv.e > cursor) { busy += iv.e - cursor; cursor = iv.e; }
  }
  const total = (END_H - START_H) * 60;
  const free = Math.max(0, total - busy);

  // Score: derive status.
  const count = intervals.length;
  let status: DayPulseStatus = "balanced";
  if (overlaps >= 2 || count >= 10) status = "overloaded";
  else if (count >= 7) status = "full";
  else if (count <= 2 && free > total * 0.6) status = "soft";

  const labels: Record<DayPulseStatus, string> = {
    soft: "Soft day",
    balanced: "Balanced",
    full: "Full day",
    overloaded: "Overloaded",
  };
  const messages: Record<DayPulseStatus, string> = {
    soft: "Plenty of breathing room. Move gently.",
    balanced: "A steady rhythm — you have room to flex.",
    full: "A packed day. Protect small pauses between tasks.",
    overloaded: "Your day is heavy. Consider softening a few things.",
  };

  // Carey micro-insight — one line max.
  let carey: string | undefined;
  if (overlaps > 0) carey = `${overlaps} overlapping block${overlaps === 1 ? "" : "s"} — worth reviewing.`;
  else if (unschedPri > 0) carey = `${unschedPri} priorit${unschedPri === 1 ? "y" : "ies"} still unscheduled.`;
  else if (free >= 120 && status !== "overloaded") carey = `You still have ${Math.round(free / 60)}h of open time today.`;

  return {
    status,
    label: labels[status],
    message: messages[status],
    scheduledCount: count,
    completedCount: done.length,
    freeMinutes: free,
    overlaps,
    unscheduledPriorities: unschedPri,
    carey,
  };
}

export function moonIllumination(date: Date): { phaseName: string; pct: number; fraction: number; mood: string } {
  const SYNODIC = 29.530588853;
  const REF = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const d = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12) / 86400000;
  let f = ((d - REF) % SYNODIC) / SYNODIC;
  if (f < 0) f += 1;
  const pct = Math.round((1 - Math.cos(2 * Math.PI * f)) / 2 * 100);
  const name = phaseName(f);
  const mood = phaseMood(f);
  return { phaseName: name, pct, fraction: f, mood };
}

function phaseName(f: number): string {
  if (f < 0.03 || f > 0.97) return "New moon";
  if (f < 0.22) return "Waxing crescent";
  if (f < 0.28) return "First quarter";
  if (f < 0.47) return "Waxing gibbous";
  if (f < 0.53) return "Full moon";
  if (f < 0.72) return "Waning gibbous";
  if (f < 0.78) return "Last quarter";
  return "Waning crescent";
}

function phaseMood(f: number): string {
  if (f < 0.25) return "Seed · Set · Begin";
  if (f < 0.5) return "Build · Tend · Grow";
  if (f < 0.75) return "Reflect · Release · Realign";
  return "Rest · Compost · Root";
}