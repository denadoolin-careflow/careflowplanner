import { addDays, format } from "date-fns";
import type { Project, ProjectMilestone, ProjectSection } from "@/lib/types";

export type ProjectTemplateKey = "home" | "caregiving" | "event" | "creative" | "blank";

export interface ProjectTemplate {
  key: ProjectTemplateKey;
  label: string;
  emoji: string;
  blurb: string;
  area: string;
  lanes: { name: string; color: string }[];
  milestones: { title: string; inDays: number }[];
  starterTasks: { title: string; lane: number }[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    key: "home", label: "Home & Living", emoji: "🏡", area: "Home",
    blurb: "Room refreshes, repairs and big home jobs.",
    lanes: [
      { name: "Ideas & Sourcing", color: "#c9a96e" },
      { name: "Prep & Clean", color: "#9bb59a" },
      { name: "In Progress", color: "#b88aa3" },
      { name: "Done", color: "#8aa1b8" },
    ],
    milestones: [{ title: "Plan & budget set", inDays: 7 }, { title: "Project finished", inDays: 30 }],
    starterTasks: [{ title: "Measure the space", lane: 0 }, { title: "Set a budget", lane: 0 }, { title: "Clear the area", lane: 1 }],
  },
  {
    key: "caregiving", label: "Family & Caregiving", emoji: "💛", area: "Caregiving",
    blurb: "Appointments, paperwork and coordinating care.",
    lanes: [
      { name: "To Schedule", color: "#c9a96e" },
      { name: "Coordinating", color: "#b88aa3" },
      { name: "This Week", color: "#9bb59a" },
      { name: "Complete", color: "#8aa1b8" },
    ],
    milestones: [{ title: "Care plan agreed", inDays: 14 }],
    starterTasks: [{ title: "List who needs to be involved", lane: 0 }, { title: "Gather key documents", lane: 1 }],
  },
  {
    key: "event", label: "Events & Celebrations", emoji: "🎉", area: "Family",
    blurb: "Birthdays, holidays, gatherings and trips.",
    lanes: [
      { name: "Inspiration", color: "#e0a5a0" },
      { name: "Bookings", color: "#c9a96e" },
      { name: "Week-of Prep", color: "#9bb59a" },
      { name: "Day-of", color: "#b88aa3" },
    ],
    milestones: [{ title: "Invitations sent", inDays: 14 }, { title: "Event day", inDays: 30 }],
    starterTasks: [{ title: "Pick a date", lane: 0 }, { title: "Draft guest list", lane: 0 }, { title: "Book the venue", lane: 1 }],
  },
  {
    key: "creative", label: "Creative & Work", emoji: "✨", area: "Work",
    blurb: "Writing, launches, side projects and work goals.",
    lanes: [
      { name: "Backlog", color: "#8aa1b8" },
      { name: "Drafting", color: "#c9a96e" },
      { name: "Review", color: "#b88aa3" },
      { name: "Launched", color: "#9bb59a" },
    ],
    milestones: [{ title: "First draft", inDays: 14 }, { title: "Launch", inDays: 45 }],
    starterTasks: [{ title: "Write a one-line goal", lane: 0 }, { title: "Outline the first draft", lane: 1 }],
  },
  {
    key: "blank", label: "Blank Canvas", emoji: "🌿", area: "Personal",
    blurb: "Three simple lanes to shape however you like.",
    lanes: [
      { name: "To Do", color: "#8aa1b8" },
      { name: "Doing", color: "#c9a96e" },
      { name: "Done", color: "#9bb59a" },
    ],
    milestones: [],
    starterTasks: [],
  },
];

type Store = {
  addSection: (s: { projectId: string; name: string; color?: string; sortOrder?: number }) => Promise<ProjectSection | null>;
  addTask: (t: any) => Promise<string | undefined>;
  updateProject: (id: string, p: Partial<Project>) => Promise<void> | void;
};

/** Adds a template's lanes, milestones and starter tasks to an existing project. */
export async function applyProjectTemplate(project: Project, key: ProjectTemplateKey, store: Store) {
  const tpl = PROJECT_TEMPLATES.find(t => t.key === key);
  if (!tpl) return;
  const lanes: (ProjectSection | null)[] = [];
  for (let i = 0; i < tpl.lanes.length; i++) {
    lanes.push(await store.addSection({ projectId: project.id, name: tpl.lanes[i].name, color: tpl.lanes[i].color, sortOrder: i }));
  }
  const today = new Date();
  const milestones: ProjectMilestone[] = [
    ...(project.milestones ?? []),
    ...tpl.milestones.map(m => ({
      id: globalThis.crypto?.randomUUID?.() ?? `m-${Date.now()}-${Math.random()}`,
      title: m.title, done: false, date: format(addDays(today, m.inDays), "yyyy-MM-dd"),
    })),
  ];
  await store.updateProject(project.id, { milestones, ...(project.areaName ? {} : { areaName: tpl.area }) });
  for (const t of tpl.starterTasks) {
    await store.addTask({ title: t.title, projectId: project.id, sectionId: lanes[t.lane]?.id, area: project.areaName ?? tpl.area });
  }
}
