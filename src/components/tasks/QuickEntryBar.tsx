import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { parseTaskInput } from "@/lib/nlp-task";
import { detectAreaAndProject } from "@/lib/task-auto-detect";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import type { Task } from "@/lib/types";

/**
 * Persistent quick-entry bar — type and hit Enter to instantly add a task.
 * Supports natural language: "Call Alex tomorrow 5pm #home !"
 */
export function QuickEntryBar({
  defaults,
  placeholder = "Add a task… try \"Call Alex tomorrow 5pm\"",
}: {
  defaults?: Partial<Task>;
  placeholder?: string;
}) {
  const { addTask, state } = useStore();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const raw = text.trim();
    if (!raw) return;
    const p = parseTaskInput(raw);
    const projectId = p.projectName
      ? state.projects?.find(pr => pr.name.toLowerCase() === p.projectName!.toLowerCase())?.id
      : undefined;
    // Fallback auto-detection when the user didn't tag an explicit @area / +project.
    const guess = (!p.area || !projectId)
      ? detectAreaAndProject({
          title: p.title || raw,
          areas: state.areas,
          projects: state.projects,
          recipients: state.recipients,
        })
      : { area: undefined, projectId: undefined, recipientId: undefined, matchedOn: [] as string[] };
    await addTask({
      title: p.title || raw,
      dueDate: p.dueDate ?? defaults?.dueDate,
      area: (p.area as any) ?? (guess.area as any) ?? defaults?.area,
      energy: p.energy ?? defaults?.energy,
      tags: p.tags,
      estMinutes: p.estMinutes ?? defaults?.estMinutes,
      projectId: projectId ?? guess.projectId,
      recipientId: guess.recipientId,
      ...(defaults?.status ? { status: defaults.status } : {}),
      ...(defaults?.inbox ? { inbox: defaults.inbox } : {}),
    });
    setText("");
    inputRef.current?.focus();
  };

  return (
    <div className="group relative">
      <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70 transition-colors group-focus-within:text-primary" />
      <Input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submit(); } }}
        placeholder={placeholder}
        className="h-11 rounded-2xl border-border/40 bg-card/60 pl-10 pr-4 text-sm shadow-sm backdrop-blur-sm placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
      />
    </div>
  );
}