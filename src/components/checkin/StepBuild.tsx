import { useMemo } from "react";
import { X, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskPicker } from "@/components/checkin/TaskPicker";
import { useStore } from "@/lib/store";
import { pickTopThree } from "@/lib/top-three";
import type { CheckInAiPayload } from "@/lib/daily-checkin-store";

interface Props {
  payload: CheckInAiPayload;
  iso: string;
  intention: string;
  onIntention: (v: string) => void;
  onPayload: (next: CheckInAiPayload) => void;
  onBack: () => void;
  onContinue: () => void;
}

/** Convert AI block labels like "8:30a" / "14:00" into a 24h "HH:MM" string. */
export function parseBlockTime(raw: string): string | null {
  const m = raw.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(a|p|am|pm)?/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const mer = m[3]?.[0];
  if (Number.isNaN(h) || h > 23 || min > 59) return null;
  if (mer === "p" && h < 12) h += 12;
  if (mer === "a" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function StepBuild({ payload, iso, intention, onIntention, onPayload, onBack, onContinue }: Props) {
  const { anchor, rhythm } = payload.method;
  const { state, addTask, updateTask } = useStore();
  const tasks = state.tasks ?? [];
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const aiPriorities = rhythm.priorities.slice(0, 3);
  const storedIds = rhythm.priorityTaskIds ?? [];
  const storedTexts = rhythm.priorityTexts ?? [];
  const pinned = useMemo(() => pickTopThree(tasks, iso), [tasks, iso]);

  const patchRhythm = (patch: Partial<CheckInAiPayload["method"]["rhythm"]>) =>
    onPayload({ ...payload, method: { ...payload.method, rhythm: { ...rhythm, ...patch } } });

  const setPriority = (i: number, taskId: string | null, text: string | null) => {
    const ids = [0, 1, 2].map((n) => (n === i ? taskId : storedIds[n] ?? null));
    const texts = [0, 1, 2].map((n) => (n === i ? text : storedTexts[n] ?? null));
    patchRhythm({ priorityTaskIds: ids, priorityTexts: texts });
  };

  const slotTask = (i: number) => {
    const id = storedIds[i];
    if (id) return byId.get(id) ?? null;
    if (storedIds.length) return null;
    return pinned[i] ?? null;
  };

  async function pickPriorityTask(i: number, taskId: string) {
    const prev = slotTask(i);
    if (prev && prev.id !== taskId) await updateTask(prev.id, { isTopThree: false });
    await updateTask(taskId, { isTopThree: true, dueDate: iso });
    setPriority(i, taskId, null);
  }

  async function createPriority(i: number, title: string) {
    const prev = slotTask(i);
    if (prev) await updateTask(prev.id, { isTopThree: false });
    const id = await addTask({
      title, area: "Personal", priority: "high", done: false,
      isTopThree: true, dueDate: iso,
    } as never);
    if (typeof id === "string") setPriority(i, id, null);
    else setPriority(i, null, title);
  }

  async function clearPriority(i: number) {
    const t = slotTask(i);
    if (t) await updateTask(t.id, { isTopThree: false });
    setPriority(i, null, null);
  }

  const setBlockTask = (i: number, taskId: string | null) => {
    const blocks = rhythm.blocks.map((b, n) => (n === i ? { ...b, taskId } : b));
    patchRhythm({ blocks });
  };

  async function linkBlockTask(i: number, taskId: string) {
    const time = parseBlockTime(rhythm.blocks[i].time);
    await updateTask(taskId, { dueDate: iso, ...(time ? { startTime: time } : {}) });
    setBlockTask(i, taskId);
  }

  async function createBlockTask(i: number, title: string) {
    const time = parseBlockTime(rhythm.blocks[i].time);
    const id = await addTask({
      title, area: "Personal", priority: "medium", done: false,
      dueDate: iso, ...(time ? { startTime: time } : {}),
    } as never);
    if (typeof id === "string") setBlockTask(i, id);
  }

  async function unlinkBlock(i: number) {
    const id = rhythm.blocks[i].taskId;
    if (id && byId.has(id)) await updateTask(id, { startTime: null as unknown as undefined });
    setBlockTask(i, null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-lg font-semibold sm:text-xl">Build your day</h2>
        <label htmlFor="checkin-intention" className="mt-4 block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Today's intention
        </label>
        <Input
          id="checkin-intention"
          value={intention}
          onChange={(e) => onIntention(e.target.value)}
          placeholder={anchor.intention}
          className="mt-2 h-11 text-[15px]"
        />
        <p className="mt-2 text-[14px] text-muted-foreground">{anchor.why}</p>
      </div>

      <div className="border-t border-border/40 pt-6">
        <h3 className="font-display text-lg font-semibold">Top 3 priorities</h3>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Type a priority or pick one of your existing tasks.
        </p>
        <ol className="mt-3 space-y-1">
          {[0, 1, 2].map((i) => {
            const task = slotTask(i);
            const text = storedTexts[i];
            return (
              <li key={i} className="flex items-center gap-2">
                <span className="w-4 shrink-0 text-[15px] text-primary">{i + 1}.</span>
                {task ? (
                  <>
                    <Checkbox
                      checked={task.done}
                      onCheckedChange={(v) => void updateTask(task.id, { done: !!v })}
                      aria-label={`Complete ${task.title}`}
                    />
                    <TaskPicker
                      tasks={tasks}
                      className={task.done ? "flex-1 line-through opacity-60" : "flex-1"}
                      label={task.title}
                      selectedId={task.id}
                      onSelectTask={(id) => void pickPriorityTask(i, id)}
                      onCreate={(title) => void createPriority(i, title)}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Clear priority"
                      onClick={() => void clearPriority(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <TaskPicker
                    tasks={tasks}
                    muted={!text}
                    label={text || aiPriorities[i] || "Choose a priority…"}
                    onSelectTask={(id) => void pickPriorityTask(i, id)}
                    onCreate={(title) => void createPriority(i, title)}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="border-t border-border/40 pt-6">
        <h3 className="font-display text-lg font-semibold">Your rhythm</h3>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Assign a real task to any block and it lands on your planner grid.
        </p>
        <ul className="mt-3 divide-y divide-border/40">
          {rhythm.blocks.map((b, i) => {
            const linked = b.taskId ? byId.get(b.taskId) ?? null : null;
            return (
              <li key={i} className="flex items-center gap-2 py-2 text-[15px]">
                <span className="w-16 shrink-0 tabular-nums text-muted-foreground">{b.time}</span>
                {linked ? (
                  <>
                    <Checkbox
                      checked={linked.done}
                      onCheckedChange={(v) => void updateTask(linked.id, { done: !!v })}
                      aria-label={`Complete ${linked.title}`}
                    />
                    <span className={linked.done ? "flex-1 line-through opacity-60" : "flex-1"}>{linked.title}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Unlink task"
                      onClick={() => void unlinkBlock(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <TaskPicker
                      tasks={tasks}
                      muted
                      className="flex-1"
                      label={b.label}
                      onSelectTask={(id) => void linkBlockTask(i, id)}
                      onCreate={(title) => void createBlockTask(i, title)}
                    />
                    <Link2 className="h-3.5 w-3.5 shrink-0 opacity-40" />
                  </>
                )}
                <Badge variant="outline" className="shrink-0 font-normal opacity-70">{b.kind}</Badge>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button size="lg" className="rounded-full" onClick={onContinue}>Continue</Button>
      </div>
    </div>
  );
}