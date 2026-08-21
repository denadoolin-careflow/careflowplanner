/**
 * Supertag schema editor — defaults stamped onto new items with this tag,
 * a checklist template, and custom typed fields (Tana-style).
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Tag, TagDefaults } from "@/lib/tags";
import {
  FIELD_TYPE_LABEL, createTagField, deleteTagField, updateTagField, useTagFields,
  type FieldType,
} from "@/lib/tag-fields";

const NONE = "__none__";
const AREAS = [
  "Family", "Kids", "Caregiving", "Home", "Meals",
  "Appointments", "Holidays & Birthdays", "Personal", "Creative Projects", "Money",
];
const LEVELS = ["high", "medium", "low"];
const REPEATS = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

interface Props {
  tag: Tag;
  defaults: TagDefaults;
  onDefaultsChange: (d: TagDefaults) => void;
  checklist: string[];
  onChecklistChange: (c: string[]) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="w-40">{children}</div>
    </div>
  );
}

export function SupertagEditor({ tag, defaults, onDefaultsChange, checklist, onChecklistChange }: Props) {
  const { fields, reload } = useTagFields(tag.id);
  const [newField, setNewField] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newLine, setNewLine] = useState("");

  const set = (p: Partial<TagDefaults>) => onDefaultsChange({ ...defaults, ...p });
  const pick = (v: string) => (v === NONE ? null : v);

  const addField = async () => {
    if (!newField.trim()) return;
    try {
      await createTagField(tag.id, { label: newField, type: newType, sortOrder: fields.length });
      setNewField("");
      setNewType("text");
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't add field");
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-3">
      <section className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Applied to new items</p>

        <Row label="Area">
          <Select value={defaults.area ?? NONE} onValueChange={v => set({ area: pick(v) })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>

        <Row label="Priority">
          <Select value={defaults.priority ?? NONE} onValueChange={v => set({ priority: pick(v) })}>
            <SelectTrigger className="h-8 text-xs capitalize"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {LEVELS.map(l => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>

        <Row label="Energy">
          <Select value={defaults.energy ?? NONE} onValueChange={v => set({ energy: pick(v) })}>
            <SelectTrigger className="h-8 text-xs capitalize"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {LEVELS.map(l => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>

        <Row label="Duration (min)">
          <Input
            type="number"
            min={0}
            className="h-8 text-xs"
            value={defaults.estMinutes ?? ""}
            onChange={e => set({ estMinutes: e.target.value ? Number(e.target.value) : null })}
            placeholder="—"
          />
        </Row>

        <Row label="Repeats">
          <Select
            value={defaults.recurrenceType ?? NONE}
            onValueChange={v => set({ recurrenceType: pick(v), recurrenceInterval: v === NONE ? null : (defaults.recurrenceInterval ?? 1) })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Never" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Never</SelectItem>
              {REPEATS.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Checklist template</p>
        {checklist.map((line, i) => (
          <div key={`${line}-${i}`} className="flex items-center gap-2">
            <Input
              className="h-8 flex-1 text-xs"
              value={line}
              onChange={e => onChecklistChange(checklist.map((l, idx) => (idx === i ? e.target.value : l)))}
            />
            <Button
              size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10"
              aria-label={`Remove checklist step ${line}`}
              onClick={() => onChecklistChange(checklist.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Input
            className="h-8 flex-1 text-xs"
            placeholder="Add a step…"
            value={newLine}
            onChange={e => setNewLine(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && newLine.trim()) {
                e.preventDefault();
                onChecklistChange([...checklist, newLine.trim()]);
                setNewLine("");
              }
            }}
          />
          <Button
            size="icon" variant="ghost" className="h-7 w-7" aria-label="Add checklist step"
            onClick={() => { if (newLine.trim()) { onChecklistChange([...checklist, newLine.trim()]); setNewLine(""); } }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fields</p>
        {fields.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No fields yet — add one to capture extra details on tagged items.</p>
        )}
        {fields.map(f => (
          <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 p-2">
            <span className="flex-1 truncate text-xs font-medium">{f.label}</span>
            <span className="text-[10px] text-muted-foreground">{FIELD_TYPE_LABEL[f.type]}</span>
            <div className="flex items-center gap-1">
              <Switch
                checked={f.required}
                aria-label={`Require ${f.label}`}
                onCheckedChange={async v => { await updateTagField(f.id, { required: v }); await reload(); }}
              />
              <Button
                size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                aria-label={`Delete field ${f.label}`}
                onClick={async () => { await deleteTagField(f.id); await reload(); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {fields.some(f => f.type === "select") && (
          <p className="text-[10px] text-muted-foreground">Choice fields accept free text until options are added.</p>
        )}
        <div className="flex items-center gap-2">
          <Input
            className="h-8 flex-1 text-xs"
            placeholder="Field name (e.g. Dose)"
            value={newField}
            onChange={e => setNewField(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void addField(); } }}
          />
          <Select value={newType} onValueChange={v => setNewType(v as FieldType)}>
            <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(FIELD_TYPE_LABEL) as FieldType[]).map(t => (
                <SelectItem key={t} value={t}>{FIELD_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Add field" onClick={addField}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </section>
    </div>
  );
}
