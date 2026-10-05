export type NotebookCover = "primary" | "accent" | "sage" | "rose" | "neutral";
export type NotebookSeasonIcon = "flower" | "sun" | "leaf" | "snowflake" | "sparkles";

export type NotebookPreference = {
  title?: string;
  cover: NotebookCover;
  icon: NotebookSeasonIcon;
};

export type NotebookPreferences = Record<string, NotebookPreference>;

const STORAGE_KEY = "careflow:notes:notebook-customization:v1";

export const NOTEBOOK_COVERS: { id: NotebookCover; label: string }[] = [
  { id: "primary", label: "Atmosphere" },
  { id: "accent", label: "Golden" },
  { id: "sage", label: "Botanical" },
  { id: "rose", label: "Rose" },
  { id: "neutral", label: "Quiet" },
];

export const NOTEBOOK_ICONS: { id: NotebookSeasonIcon; label: string }[] = [
  { id: "flower", label: "Bloom" },
  { id: "sun", label: "Sun" },
  { id: "leaf", label: "Leaf" },
  { id: "snowflake", label: "Snow" },
  { id: "sparkles", label: "Stars" },
];

export function readNotebookPreferences(): NotebookPreferences {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as NotebookPreferences;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveNotebookPreference(monthKey: string, preference: NotebookPreference): NotebookPreferences {
  const next = { ...readNotebookPreferences(), [monthKey]: preference };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}