/** Inline editor for one tag-field value inside a planner table cell. */
import { useEffect, useState } from "react";
import type { TagField } from "@/lib/tag-fields";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function FieldCell({ field, value, onSave, disabled }: {
  field: TagField;
  value: unknown;
  onSave: (v: unknown) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value === null || value === undefined ? "" : String(value));

  useEffect(() => {
    setDraft(value === null || value === undefined ? "" : String(value));
  }, [value]);

  const label = `${field.label} value`;

  if (field.type === "checkbox") {
    return (
      <Checkbox
        aria-label={label}
        disabled={disabled}
        checked={value === true}
        onCheckedChange={on => onSave(!!on)}
      />
    );
  }

  const commit = () => {
    setEditing(false);
    const next = field.type === "number"
      ? (draft.trim() === "" ? null : Number(draft))
      : draft.trim() === "" ? null : draft.trim();
    if (next !== value) onSave(next);
  };

  if (disabled) {
    return <span className="text-muted-foreground">{draft || "—"}</span>;
  }

  if (!editing) {
    const shown = draft || "—";
    return (
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setEditing(true); }}
        className={cn(
          "-mx-1 w-full rounded px-1 py-0.5 text-left hover:bg-muted/70",
          !draft && "text-muted-foreground",
        )}
        aria-label={`Edit ${label}`}
      >
        {field.type === "url" && draft ? (
          <span className="truncate text-primary underline underline-offset-2">{shown}</span>
        ) : shown}
      </button>
    );
  }

  if (field.type === "select") {
    return (
      <select
        autoFocus
        aria-label={label}
        value={draft}
        onClick={e => e.stopPropagation()}
        onChange={e => { setDraft(e.target.value); onSave(e.target.value || null); setEditing(false); }}
        onBlur={() => setEditing(false)}
        className="w-full rounded border border-border/60 bg-background px-1 py-0.5 text-[12px]"
      >
        <option value="">—</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  return (
    <input
      autoFocus
      aria-label={label}
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={draft}
      onClick={e => e.stopPropagation()}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { setDraft(value == null ? "" : String(value)); setEditing(false); }
      }}
      className="w-full rounded border border-border/60 bg-background px-1 py-0.5 text-[12px]"
    />
  );
}
