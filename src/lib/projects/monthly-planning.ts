import { useCallback, useMemo, useState } from "react";
import { endOfMonth, format } from "date-fns";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";

/** YYYY-MM key tagging a project as that month's Monthly Planning project. */
export const monthKeyOf = (date: Date) => format(date, "yyyy-MM");

export const monthlyProjectName = (date: Date) => `${format(date, "MMMM yyyy")} · Monthly Planning`;

/** True when a project is a Monthly Planning project (tagged in projects.details). */
export function isMonthlyProject(p: Project): boolean {
  return typeof p.details?.monthKey === "string" && /^\d{4}-\d{2}$/.test(p.details.monthKey);
}

/** Finds (or creates on demand) the Monthly Planning project for a month. */
export function useMonthlyProject(month: Date) {
  const { state, addProject, updateProject } = useStore();
  const key = monthKeyOf(month);
  const [creating, setCreating] = useState(false);
  const project = useMemo(
    () => (state.projects ?? []).find(p => p.details?.monthKey === key) ?? null,
    [state.projects, key],
  );

  const ensure = useCallback(async (): Promise<Project | null> => {
    if (project) return project;
    if (creating) return null;
    setCreating(true);
    try {
      const created = await addProject({
        name: monthlyProjectName(month),
        icon: "🌙",
        color: "sage",
        deadline: format(endOfMonth(month), "yyyy-MM-dd"),
        notes: "A gentle workspace for this month: intentions, plans and small steps.",
      });
      if (!created) return null;
      await updateProject(created.id, { details: { ...(created.details ?? {}), monthKey: key } as any });
      return { ...created, details: { ...(created.details ?? {}), monthKey: key } };
    } finally {
      setCreating(false);
    }
  }, [project, creating, addProject, updateProject, month, key]);

  return { project, creating, ensure };
}
