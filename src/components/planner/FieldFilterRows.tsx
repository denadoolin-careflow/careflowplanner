/**
 * Filter rows for the custom fields of whichever tags are currently filtered.
 *
 * Only shows up once a tag filter is on — that's what makes its fields
 * meaningful ("#appointment where Provider contains Lin").
 */
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWeekFilters } from "@/lib/planner/week-filters";
import {
  useFilterableFields, opsForType, FIELD_OP_LABEL, type FieldFilter, type FieldFilterOp,
} from "@/lib/planner/field-filters";

const NEEDS_VALUE: FieldFilterOp[] = ["is", "contains", "gte", "lte"];

export function FieldFilterRows() {
  const { filters, patch } = useWeekFilters();
  const { fields, tagNameById } = useFilterableFields(filters.tags);
  const active = filters.fieldFilters ?? [];

  if (filters.tags.length === 0 || fields.length === 0) return null;

  const setAt = (i: number, next: Partial<FieldFilter>) =>
    patch({ fieldFilters: active.map((f, idx) => (idx === i ? { ...f, ...next } : f)) });

  const removeAt = (i: number) =>
    patch({ fieldFilters: active.filter((_, idx) => idx !== i) });

  const add = () => {
    const f = fields[0];
    patch({
      fieldFilters: [...active, { tagId: f.tagId, fieldKey: f.key, op: opsForType(f.type)[0] }],
    });
  };

  const fieldOf = (f: FieldFilter) =>
    fields.find(x => x.tagId === f.tagId && x.key === f.fieldKey);

  return (
    <div>
      <p className="mb-1 text-[11px] font-medium">Tag fields</p>
      <div className="space-y-1.5">
        {active.map((f, i) => {
          const def = fieldOf(f);
          const ops = def ? opsForType(def.type) : (["is"] as FieldFilterOp[]);
          return (
            <div key={`${f.tagId}:${f.fieldKey}:${i}`} className="flex items-center gap-1">
              <Select
                value={`${f.tagId}:${f.fieldKey}`}
                onValueChange={v => {
                  const [tagId, ...rest] = v.split(":");
                  const key = rest.join(":");
                  const next = fields.find(x => x.tagId === tagId && x.key === key);
                  setAt(i, { tagId, fieldKey: key, op: next ? opsForType(next.type)[0] : "is", value: "" });
                }}
              >
                <SelectTrigger className="h-7 flex-1 text-[11px]" aria-label="Field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fields.map(x => (
                    <SelectItem key={`${x.tagId}:${x.key}`} value={`${x.tagId}:${x.key}`} className="text-xs">
                      {tagNameById.get(x.tagId) ? `#${tagNameById.get(x.tagId)} · ` : ""}{x.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={f.op} onValueChange={v => setAt(i, { op: v as FieldFilterOp })}>
                <SelectTrigger className="h-7 w-24 text-[11px]" aria-label="Condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ops.map(o => (
                    <SelectItem key={o} value={o} className="text-xs">{FIELD_OP_LABEL[o]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {NEEDS_VALUE.includes(f.op) && (
                def?.type === "select" && def.options.length ? (
                  <Select value={f.value ?? ""} onValueChange={v => setAt(i, { value: v })}>
                    <SelectTrigger className="h-7 w-24 text-[11px]" aria-label="Value"><SelectValue placeholder="Value" /></SelectTrigger>
                    <SelectContent>
                      {def.options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    aria-label="Value"
                    value={f.value ?? ""}
                    onChange={e => setAt(i, { value: e.target.value })}
                    type={def?.type === "number" ? "number" : def?.type === "date" ? "date" : "text"}
                    className="h-7 w-24 text-[11px]"
                  />
                )
              )}

              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove field filter"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-1 inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/60"
      >
        <Plus className="h-3 w-3" /> Field filter
      </button>
    </div>
  );
}
