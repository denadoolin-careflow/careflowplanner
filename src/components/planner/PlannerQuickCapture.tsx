/**
 * One quick-add flow for every planner view.
 *
 * Type naturally ("Refill meds tomorrow at 3pm #meds p1"): the parser pulls out
 * date, time, priority and tags, and any supertag in the text immediately
 * contributes its defaults (area, priority, energy, duration, repeat), its
 * checklist template, and its typed fields — all editable right here, so a
 * capture never needs a second trip through the task editor.
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { parseTaskInput } from "@/lib/nlp-task";
import { toast } from "sonner";
import { format } from "date-fns";
import { X } from "lucide-react";
import { RecurrencePicker, type RecurrenceValue } from "@/components/tasks/RecurrencePicker";
import { useTags } from "@/hooks/use-tags";
import { matchTags, supertagPatch, supertagChecklist } from "@/lib/supertag";
import { listTagFields, setItemFieldValue, type TagField } from "@/lib/tag-fields";
import { FieldCell } from "@/components/planner/FieldCell";
import { TagChip } from "@/components/tags/TagChip";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultDate?: Date;
  /** Optional pre-fill, e.g. from a clicked time slot. */
  defaultTime?: string;
  defaultTags?: string[];
}

/** Fire-and-forget opener so any surface can raise the shared sheet. */
export const PLANNER_QUICK_ADD_EVENT = "careflow:planner-quick-add";
export function openPlannerQuickAdd(detail?: { time?: string; tags?: string[]; text?: string }) {
  window.dispatchEvent(new CustomEvent(PLANNER_QUICK_ADD_EVENT, { detail: detail ?? {} }));
}

const DEFAULT_LABEL: Record<string, string> = {
  area: "Area", priority: "Priority", energy: "Energy",
  estMinutes: "Duration", recurrenceType: "Repeats",
};

export function PlannerQuickCapture({ open, onOpenChange, defaultDate, defaultTime, defaultTags }: Props) {
  const { addTask } = useStore();
  const { tags: allTags } = useTags();
  const [text, setText] = useState("");
  const [repeat, setRepeat] = useState<RecurrenceValue>({});
  const [fields, setFields] = useState<TagField[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [dropped, setDropped] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText(defaultTags?.length ? defaultTags.map(t => `#${t}`).join(" ") + " " : "");
    setRepeat({});
    setValues({});
    setDropped([]);
  }, [open, defaultTags]);

  const parsed = text ? parseTaskInput(text) : null;
  const tagNames = useMemo(() => {
    const fromText = parsed?.tags ?? [];
    return Array.from(new Set([...(defaultTags ?? []), ...fromText].map(t => String(t))));
  }, [parsed?.tags, defaultTags]);

  const supertags = useMemo(() => matchTags(allTags, tagNames), [allTags, tagNames]);

  // Defaults this capture will inherit, shown as chips before saving.
  const inherited = useMemo(() => {
    const current: Record<string, unknown> = {
      area: parsed?.area, priority: parsed?.priority, energy: parsed?.energy,
      estMinutes: parsed?.estMinutes, recurrenceType: repeat.recurrenceType ?? parsed?.recurrenceType,
    };
    const patch = supertagPatch(allTags, tagNames, current) as Record<string, unknown>;
    return Object.entries(patch).filter(([k, v]) => v !== undefined && k !== "recurrenceInterval");
  }, [allTags, tagNames, parsed, repeat.recurrenceType]);

  const checklist = useMemo(
    () => supertagChecklist(allTags, tagNames).filter(l => !dropped.includes(l)),
    [allTags, tagNames, dropped],
  );

  // Typed fields for whichever supertags are on the draft.
  useEffect(() => {
    const ids = supertags.map(t => t.id);
    if (!open || !ids.length) { setFields([]); return; }
    let alive = true;
    void listTagFields(ids).then(f => { if (alive) setFields(f); }).catch(() => {});
    return () => { alive = false; };
  }, [open, supertags.map(t => t.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const p = parseTaskInput(text);
      const id = await addTask({
        title: p.title || text,
        area: p.area ?? "Personal",
        priority: p.priority ?? "medium",
        done: false,
        dueDate: p.dueDate ?? (defaultDate ? format(defaultDate, "yyyy-MM-dd") : undefined),
        startTime: p.time ?? defaultTime,
        estMinutes: p.estMinutes,
        tags: tagNames.length ? tagNames : p.tags,
        energy: p.energy,
        recurrenceType: repeat.recurrenceType ?? p.recurrenceType,
        recurrenceInterval: repeat.recurrenceInterval ?? p.recurrenceInterval,
        recurrenceDays: repeat.recurrenceDays ?? p.recurrenceDays,
        inbox: !p.dueDate && !defaultDate,
        // The sheet owns the checklist so removed lines stay removed.
        skipChecklist: true,
      } as any);

      if (id) {
        // Typed field values captured in the same flow.
        await Promise.all(
          Object.entries(values).map(([key, v]) => {
            const [tagId, fieldKey] = key.split("::");
            if (v === undefined || v === null || v === "") return Promise.resolve();
            return setItemFieldValue("task", id, tagId, fieldKey, v).catch(() => {});
          }),
        );
        // Checklist template → child tasks.
        for (const line of checklist) {
          await addTask({ title: line, parentTaskId: id, skipChecklist: true } as any);
        }
      }
      toast.success(checklist.length ? `Captured with ${checklist.length} step${checklist.length === 1 ? "" : "s"}` : "Captured");
      setText("");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save that. Try again?");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg gap-3 overflow-y-auto p-4">
        <DialogTitle className="text-xs uppercase tracking-wider text-muted-foreground">Quick add</DialogTitle>
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }}
          placeholder="Try: Doctor tomorrow at 3pm #health p1 for 30m"
          className="h-11 text-base"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <RecurrencePicker value={repeat} onChange={setRepeat} />
        </div>

        {parsed && parsed.chips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {parsed.chips.map((c, i) => (
              <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                {c.label}
              </span>
            ))}
          </div>
        )}

        {supertags.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {supertags.map(t => <TagChip key={t.id} name={t.name} size="xs" />)}
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">supertag</span>
            </div>

            {inherited.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {inherited.map(([k, v]) => (
                  <span key={k} className="rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px]">
                    {DEFAULT_LABEL[k] ?? k}: <strong className="font-medium">{String(v)}</strong>
                  </span>
                ))}
              </div>
            )}

            {fields.length > 0 && (
              <div className="space-y-1.5">
                {fields.map(f => (
                  <div key={f.id} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 truncate text-muted-foreground">{f.label}</span>
                    <div className="min-w-0 flex-1">
                      <FieldCell
                        field={f}
                        value={values[`${f.tagId}::${f.key}`]}
                        onSave={v => setValues(prev => ({ ...prev, [`${f.tagId}::${f.key}`]: v }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {checklist.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Checklist</span>
                <ul className="flex flex-wrap gap-1">
                  {checklist.map(line => (
                    <li key={line}>
                      <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[11px] ring-1 ring-border/60">
                        {line}
                        <button
                          type="button"
                          aria-label={`Remove ${line} from checklist`}
                          onClick={() => setDropped(d => [...d, line])}
                          className="grid h-3.5 w-3.5 place-items-center rounded-full hover:bg-muted"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">Enter to save · #tag @area p1-4 for 30m</p>
          <Button size="sm" onClick={() => void submit()} disabled={!text.trim() || saving}>
            {saving ? "Saving…" : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
