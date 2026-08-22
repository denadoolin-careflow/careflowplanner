/**
 * One tag-field value inside a planner table cell.
 *
 * Each field type gets the control it deserves: choice fields open a real
 * dropdown (with "clear"), dates open a calendar, checkboxes toggle in place,
 * and number/text stay as inline inputs.
 */
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, Check, ChevronDown, X } from "lucide-react";
import type { TagField } from "@/lib/tag-fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const TRIGGER =
  "-mx-1 flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50";

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
  const shown = draft || "—";

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

  if (disabled) {
    return <span className="text-muted-foreground">{shown}</span>;
  }

  /* ---------------- Choice: real dropdown ---------------- */
  if (field.type === "select") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={e => e.stopPropagation()}
            aria-label={`Choose ${label}`}
            className={cn(TRIGGER, !draft && "text-muted-foreground")}
          >
            <span className="min-w-0 flex-1 truncate">{shown}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44" onClick={e => e.stopPropagation()}>
          {field.options.length === 0 && (
            <DropdownMenuItem disabled className="text-[11px]">No choices defined yet</DropdownMenuItem>
          )}
          {field.options.map(o => (
            <DropdownMenuItem key={o} onClick={() => onSave(o)} className="text-xs">
              <Check className={cn("mr-2 h-3 w-3", draft === o ? "opacity-100" : "opacity-0")} />
              {o}
            </DropdownMenuItem>
          ))}
          {draft && (
            <DropdownMenuItem onClick={() => onSave(null)} className="text-xs text-muted-foreground">
              <X className="mr-2 h-3 w-3" /> Clear
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  /* ---------------- Date: calendar popover ---------------- */
  if (field.type === "date") {
    let pretty = shown;
    try { if (draft) pretty = format(parseISO(draft), "MMM d, yyyy"); } catch { /* raw */ }
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={e => e.stopPropagation()}
            aria-label={`Pick ${label}`}
            className={cn(TRIGGER, !draft && "text-muted-foreground")}
          >
            <CalendarDays className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{pretty}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0" onClick={e => e.stopPropagation()}>
          <Calendar
            mode="single"
            selected={draft ? new Date(`${draft}T12:00:00`) : undefined}
            onSelect={d => onSave(d ? format(d, "yyyy-MM-dd") : null)}
            initialFocus
          />
          {draft && (
            <button
              type="button"
              onClick={() => onSave(null)}
              className="w-full border-t border-border/60 px-3 py-2 text-left text-[11px] text-muted-foreground hover:bg-muted/60"
            >
              Clear date
            </button>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  /* ---------------- Text / number / url ---------------- */
  const commit = () => {
    setEditing(false);
    const next = field.type === "number"
      ? (draft.trim() === "" ? null : Number(draft))
      : draft.trim() === "" ? null : draft.trim();
    if (next !== value) onSave(next);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setEditing(true); }}
        className={cn(TRIGGER, !draft && "text-muted-foreground")}
        aria-label={`Edit ${label}`}
      >
        {field.type === "url" && draft ? (
          <span className="truncate text-primary underline underline-offset-2">{shown}</span>
        ) : <span className="truncate">{shown}</span>}
      </button>
    );
  }

  return (
    <input
      autoFocus
      aria-label={label}
      type={field.type === "number" ? "number" : "text"}
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
