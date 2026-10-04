/**
 * Notion-style page properties for a note. Per-note properties live on
 * notes.properties; shared supertag fields (from the note's tags) render below.
 */
import { useState } from "react";
import { Plus, Trash2, Type, Hash, Calendar, ListChecks, Tags, CheckSquare, Link2, User, ChevronDown, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ItemFieldsSection } from "@/components/tags/ItemFieldsSection";
import { PersonPicker } from "@/components/people/PersonPicker";
import type { NoteProperty, NotePropertyType } from "@/lib/notes";
import { cn } from "@/lib/utils";

const TYPES: { type: NotePropertyType; label: string; icon: any }[] = [
  { type: "text", label: "Text", icon: Type },
  { type: "number", label: "Number", icon: Hash },
  { type: "date", label: "Date", icon: Calendar },
  { type: "select", label: "Status / Select", icon: ListChecks },
  { type: "multi", label: "Multi-select", icon: Tags },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
  { type: "url", label: "Link", icon: Link2 },
  { type: "person", label: "Person", icon: User },
];
const iconFor = (t: NotePropertyType) => TYPES.find(x => x.type === t)?.icon ?? Type;

export const OPTION_COLORS = ["#e6d3b3", "#f4c7c3", "#f7d9a8", "#fbeaa0", "#c8e6c9", "#b3dfe0", "#bcd4f6", "#d9c8f2", "#f2c6de", "#d6d3d1"];
export function optionColor(prop: Pick<NoteProperty, "colors">, option: string): string {
  if (prop.colors?.[option]) return prop.colors[option];
  let h = 0; for (const c of option) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return OPTION_COLORS[h % OPTION_COLORS.length];
}
export function OptionChip({ prop, option }: { prop: Pick<NoteProperty, "colors">; option: string }) {
  return <span className="rounded-full px-2 py-0.5 text-[11px] text-foreground" style={{ backgroundColor: optionColor(prop, option) }}>{option}</span>;
}
/** Today-or-created date (yyyy-mm-dd) used as the default for new date properties. */
export const createdDay = (createdAt?: string) => (createdAt ?? new Date().toISOString()).slice(0, 10);
export const PROPERTY_TYPES = TYPES;

export function NotePropertiesSection({ noteId, tags, value, onChange, className, createdAt }: {
  noteId: string;
  createdAt?: string;
  tags?: string[];
  value: NoteProperty[];
  onChange: (next: NoteProperty[]) => void;
  className?: string;
}) {
  const key = `careflow:note-props-open`;
  const [open, setOpen] = useState(() => localStorage.getItem(key) !== "0");
  const toggle = () => { setOpen(o => { try { localStorage.setItem(key, o ? "0" : "1"); } catch {} return !o; }); };
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const patch = (id: string, p: Partial<NoteProperty>) => onChange(value.map(v => v.id === id ? { ...v, ...p } : v));
  const add = (type: NotePropertyType) => {
    const label = name.trim() || TYPES.find(t => t.type === type)!.label;
    onChange([...value, { id: crypto.randomUUID(), name: label, type, value: type === "checkbox" ? false : type === "multi" ? [] : type === "date" ? createdDay(createdAt) : null, options: [] }]);
    setName(""); setAdding(false);
  };

  return (
    <div className={cn("text-sm", className)}>
      <button type="button" onClick={toggle} className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Properties{value.length ? ` · ${value.length}` : ""}
      </button>
      {open && (
        <div className="space-y-0.5">
          {value.map(p => {
            const Icon = iconFor(p.type);
            return (
              <div key={p.id} className="group grid grid-cols-[minmax(110px,160px)_1fr_auto] items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/40">
                <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <input value={p.name} onChange={e => patch(p.id, { name: e.target.value })} aria-label="Property name"
                    className="w-full min-w-0 bg-transparent text-xs outline-none focus:text-foreground" />
                </div>
                <PropValue prop={p} onChange={pp => patch(p.id, pp)} />
                <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(value.filter(v => v.id !== p.id))}
                  className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          <Popover open={adding} onOpenChange={setAdding}>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground">
                <Plus className="h-3.5 w-3.5" /> Add property
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 space-y-1 p-2">
              <Input autoFocus placeholder="Property name" value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs" />
              {TYPES.map(t => (
                <button key={t.type} type="button" onClick={() => add(t.type)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted">
                  <t.icon className="h-3.5 w-3.5 text-muted-foreground" /> {t.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          {tags && tags.length > 0 && (
            <ItemFieldsSection entityType="note" entityId={noteId} tags={tags} className="pt-2" />
          )}
        </div>
      )}
    </div>
  );
}

export function PropValue({ prop, onChange }: { prop: NoteProperty; onChange: (p: Partial<NoteProperty>) => void }) {
  const base = "h-7 w-full rounded bg-transparent px-1 text-xs outline-none hover:bg-muted/50 focus:bg-muted/60";
  switch (prop.type) {
    case "checkbox":
      return <Switch checked={!!prop.value} onCheckedChange={v => onChange({ value: v })} aria-label={prop.name} />;
    case "number":
      return <input type="number" className={base} placeholder="Empty" defaultValue={(prop.value as number) ?? ""}
        onBlur={e => onChange({ value: e.target.value === "" ? null : Number(e.target.value) })} />;
    case "date":
      return <input type="date" className={base} value={(prop.value as string) ?? ""} onChange={e => onChange({ value: e.target.value || null })} />;
    case "url":
      return (
        <div className="flex items-center gap-1">
          <input type="url" className={base} placeholder="Empty" defaultValue={(prop.value as string) ?? ""} onBlur={e => onChange({ value: e.target.value || null })} />
          {prop.value ? <a href={String(prop.value)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><Link2 className="h-3.5 w-3.5" /></a> : null}
        </div>
      );
    case "select":
    case "multi":
      return <OptionPicker prop={prop} onChange={onChange} />;
    case "person":
      return <PersonPicker value={(prop.value as string) ?? null} placeholder="Empty" className="min-h-7 border-0 bg-transparent px-1 text-xs"
        onChange={p => onChange({ value: p ? p.id : null })} />;
    default:
      return <input className={base} placeholder="Empty" defaultValue={(prop.value as string) ?? ""} onBlur={e => onChange({ value: e.target.value || null })} />;
  }
}

/** Rename an option everywhere it appears in this property (options, colors, value). */
function renameOption(prop: NoteProperty, from: string, to: string): Partial<NoteProperty> {
  const options = (prop.options ?? []).map(o => o === from ? to : o).filter((o, i, a) => a.indexOf(o) === i);
  const colors = { ...(prop.colors ?? {}) };
  if (colors[from]) { colors[to] = colors[from]; delete colors[from]; }
  const value = Array.isArray(prop.value) ? (prop.value as string[]).map(v => v === from ? to : v) : prop.value === from ? to : prop.value;
  return { options, colors, value };
}
function removeOption(prop: NoteProperty, o: string): Partial<NoteProperty> {
  const colors = { ...(prop.colors ?? {}) }; delete colors[o];
  const value = Array.isArray(prop.value) ? (prop.value as string[]).filter(v => v !== o) : prop.value === o ? null : prop.value;
  return { options: (prop.options ?? []).filter(x => x !== o), colors, value };
}

function OptionPicker({ prop, onChange }: { prop: NoteProperty; onChange: (p: Partial<NoteProperty>) => void }) {
  const [q, setQ] = useState("");
  const multi = prop.type === "multi";
  const selected: string[] = multi ? (Array.isArray(prop.value) ? prop.value as string[] : []) : prop.value ? [String(prop.value)] : [];
  const options = prop.options ?? [];
  const pick = (o: string) => {
    const opts = options.includes(o) ? options : [...options, o];
    if (multi) onChange({ options: opts, value: selected.includes(o) ? selected.filter(s => s !== o) : [...selected, o] });
    else onChange({ options: opts, value: selected[0] === o ? null : o });
    setQ("");
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="flex min-h-7 w-full flex-wrap items-center gap-1 rounded px-1 text-left text-xs hover:bg-muted/50">
          {selected.length ? selected.map(s => <OptionChip key={s} prop={prop} option={s} />)
            : <span className="text-muted-foreground">Empty</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-1 p-2">
        <Input autoFocus placeholder="Find or create…" value={q} onChange={e => setQ(e.target.value)} className="h-8 text-xs"
          onKeyDown={e => { if (e.key === "Enter" && q.trim()) { e.preventDefault(); pick(q.trim()); } }} />
        {options.filter(o => o.toLowerCase().includes(q.toLowerCase())).map(o => (
          <div key={o} className="flex items-center gap-1">
            <button type="button" onClick={() => pick(o)} className={cn("flex flex-1 items-center justify-between rounded px-2 py-1 text-xs hover:bg-muted", selected.includes(o) && "font-medium")}>
              <OptionChip prop={prop} option={o} />{selected.includes(o) && <CheckSquare className="h-3 w-3" />}
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label={`Color for ${o}`} className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: optionColor(prop, o) }} />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 space-y-2 p-2">
                <Input defaultValue={o} aria-label={`Rename ${o}`} className="h-7 text-xs"
                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  onBlur={e => { const t = e.target.value.trim(); if (t && t !== o) onChange(renameOption(prop, o, t)); }} />
                <div className="grid grid-cols-5 gap-1">
                  {OPTION_COLORS.map(c => (
                    <button key={c} type="button" aria-label={`Use color ${c}`} onClick={() => onChange({ colors: { ...(prop.colors ?? {}), [o]: c } })}
                      className={cn("h-5 w-5 rounded-full border border-border", optionColor(prop, o) === c && "ring-2 ring-primary")} style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button type="button" onClick={() => onChange(removeOption(prop, o))}
                  className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-xs text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3 w-3" /> Delete option
                </button>
              </PopoverContent>
            </Popover>
          </div>
        ))}
        {q.trim() && !options.includes(q.trim()) && (
          <Button size="sm" variant="ghost" className="h-7 w-full justify-start text-xs" onClick={() => pick(q.trim())}>Create "{q.trim()}"</Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
