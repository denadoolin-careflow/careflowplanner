import { haptics } from "@/lib/haptics";

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      haptics.tap?.();
      return true;
    }
  } catch {
    // fall through to fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) haptics.tap?.();
    return ok;
  } catch {
    return false;
  }
}

export function formatTaskForCopy(t: {
  title: string;
  done?: boolean;
  area?: string;
  projectName?: string;
  dueDate?: string;
  priority?: string;
  tags?: string[];
  notes?: string;
  subtasks?: { title: string; done?: boolean }[];
}): string {
  const lines: string[] = [];
  lines.push(t.title);
  lines.push(`Status: ${t.done ? "Complete" : "Open"}`);
  if (t.area) lines.push(`Area: ${t.area}`);
  lines.push(`Project: ${t.projectName ?? "None"}`);
  lines.push(`Due: ${t.dueDate ?? "None"}`);
  lines.push(`Priority: ${t.priority ?? "Low"}`);
  lines.push(`Tags: ${t.tags && t.tags.length ? t.tags.join(", ") : "None"}`);
  lines.push("");
  lines.push("Notes:");
  lines.push(t.notes?.trim() ? t.notes.trim() : "(none)");
  if (t.subtasks && t.subtasks.length) {
    lines.push("");
    lines.push("Subtasks:");
    for (const s of t.subtasks) {
      lines.push(`- [${s.done ? "x" : " "}] ${s.title}`);
    }
  }
  return lines.join("\n");
}