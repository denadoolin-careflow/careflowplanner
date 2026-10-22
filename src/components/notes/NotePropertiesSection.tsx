/**
 * Notion-style page properties for a note. Per-note properties live on
 * notes.properties; shared supertag fields (from the note's tags) render below.
 */
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Type, Hash, Calendar, ListChecks, Tags, CheckSquare, Link2, User, ChevronDown, ChevronRight, FolderKanban, ListFilter, Settings2 } from "lucide-react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ItemFieldsSection } from "@/components/tags/ItemFieldsSection";
import { PersonPicker } from "@/components/people/PersonPicker";
import type { NoteProperty, NotePropertyType } from "@/lib/notes";
import { cn } from "@/lib/utils";
import { SmartPropertyActions } from "./SmartPropertyActions";
import { PROPERTY_ICONS, usePropertyStyles, resolveOption, resolveProp, setOptionStyle, setPropStyle } from "@/lib/notes/property-styles";
import { OPTION_COLORS, optionColor, OptionChip } from "./PropertyStyleDisplay";
import { propertyColorStyle } from "@/lib/notes/property-colors";
import { IconGrid, PropertyColorGrid } from "./PropertyStylePicker";
export { OPTION_COLORS, optionColor, OptionChip } from "./PropertyStyleDisplay";

const TYPES: { type: NotePropertyType; label: string; icon: any }[] = [
  { type: "text", label: "Text", icon: Type },
  { type: "number", label: "Number", icon: Hash },
  { type: "date", label: "Date", icon: Calendar },
  { type: "select", label: "Status / Select", icon: ListChecks },
  { type: "multi", label: "Multi-select", icon: Tags },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
  { type: "url", label: "Link", icon: Link2 },
  { type: "person", label: "Person", icon: User },
  { type: "project", label: "Project", icon: FolderKanban },
];
const iconFor = (t: NotePropertyType) => TYPES.find(x => x.type === t)?.icon ?? Type;

function PropertyIcon({ prop }: { prop: NoteProperty }) {
  const map = usePropertyStyles();
  const st = resolveProp(map, prop.name);
  const Icon = (st.icon && PROPERTY_ICONS[st.icon]) || iconFor(prop.type);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Icon and color for ${prop.name}`} className={cn("h-8 w-8 shrink-0 rounded", st.color && "note-property-color")}
          style={propertyColorStyle(st.color)}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[75dvh] w-[min(92vw,280px)] space-y-2 overflow-y-auto p-2">
        <p className="text-[11px] font-medium text-muted-foreground">Icon</p>
        <IconGrid value={st.icon} onPick={k => setPropStyle(prop.name, { icon: k })} />
        <p className="text-[11px] font-medium text-muted-foreground">Color</p>
        <PropertyColorGrid value={st.color} allowClear onPick={color => setPropStyle(prop.name, { color })} />
        <p className="text-[10px] text-muted-foreground">Applies to "{prop.name}" on every note.</p>
      </PopoverContent>
    </Popover>
  );
}
/** Today-or-created date (yyyy-mm-dd) used as the default for new date properties. */
export const createdDay = (createdAt?: string) => (createdAt ?? new Date().toISOString()).slice(0, 10);
export const PROPERTY_TYPES = TYPES;

export function NotePropertiesSection({ noteId, tags, value, onChange, className, createdAt, projectId, noteDate, noteTitle, noteBody }: {
  noteId: string;
  /** The note's current project link; seeds a newly added Project property. */
  projectId?: string | null;
  createdAt?: string;
  tags?: string[];
  value: NoteProperty[];
  onChange: (next: NoteProperty[]) => void;
  className?: string;
  /** Used for rhythm details and the AI summary. */
  noteDate?: string | null;
  noteTitle?: string;
  noteBody?: string;
}) {
  const key = `careflow:note-props-open`;
  const [open, setOpen] = useState(() => localStorage.getItem(key) !== "0");
  const toggle = () => { setOpen(o => { try { localStorage.setItem(key, o ? "0" : "1"); } catch {} return !o; }); };
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const patch = (id: string, p: Partial<NoteProperty>) => onChange(value.map(v => v.id === id ? { ...v, ...p } : v));
  const add = (type: NotePropertyType) => {
    const label = name.trim() || TYPES.find(t => t.type === type)?.label || "Property";
    onChange([...value, { id: crypto.randomUUID(), name: label, type, value: type === "checkbox" ? false : type === "multi" ? [] : type === "date" ? createdDay(createdAt) : type === "project" ? (projectId ?? null) : null, options: [] }]);
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
            return (
              <div key={p.id} className={cn("group grid items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/40", p.type === "text" ? "grid-cols-[1fr_auto]" : "grid-cols-[minmax(90px,140px)_minmax(0,1fr)_auto]")}>
                <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                  <PropertyIcon prop={p} />
                  <input value={p.name} onChange={e => patch(p.id, { name: e.target.value })} aria-label="Property name"
                    className="w-full min-w-0 bg-transparent text-xs outline-none focus:text-foreground" />
                </div>
                <div className={cn("min-w-0", p.type === "text" && "order-last col-span-full")}><PropValue prop={p} onChange={pp => patch(p.id, pp)} /></div>
                <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(value.filter(v => v.id !== p.id))}
                  className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          <SmartPropertyActions value={value} onChange={onChange} noteDate={noteDate} createdAt={createdAt} title={noteTitle} body={noteBody} />
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
    case "text":
      return <TextPropertyValue prop={prop} onChange={onChange} />;
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
    case "project":
      return <ProjectValue prop={prop} onChange={onChange} />;
    case "person":
      return <PersonPicker value={(prop.value as string) ?? null} placeholder="Empty" className="min-h-7 border-0 bg-transparent px-1 text-xs"
        onChange={p => onChange({ value: p ? p.id : null })} />;
    default:
      return <input className={base} placeholder="Empty" defaultValue={(prop.value as string) ?? ""} onBlur={e => onChange({ value: e.target.value || null })} />;
  }
}

function TextPropertyValue({ prop, onChange }: { prop: NoteProperty; onChange: (p: Partial<NoteProperty>) => void }) {
  const [draft, setDraft] = useState(String(prop.value ?? ""));
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setDraft(String(prop.value ?? "")); }, [prop.value]);
  useEffect(() => {
    const field = ref.current;
    if (!field) return;
    const resize = () => { field.style.height = "0px"; field.style.height = `${field.scrollHeight}px`; };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(field);
    return () => observer.disconnect();
  }, [draft]);
  return <textarea ref={ref} rows={1} aria-label={prop.name} placeholder="Empty" value={draft}
    onChange={e => setDraft(e.target.value)} onBlur={() => { if (draft !== String(prop.value ?? "")) onChange({ value: draft || null }); }}
    className="block min-h-8 w-full resize-none overflow-hidden whitespace-pre-wrap break-words rounded bg-transparent px-1 py-1 text-xs leading-relaxed outline-none hover:bg-muted/50 focus:bg-muted/60" />;
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
  const navigate = useNavigate();
  const map = usePropertyStyles();
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
  const seeAll = () => {
    const v = selected[0];
    if (v) navigate(`/notes?view=grid&prop=${encodeURIComponent(prop.name.trim() || prop.name)}&value=${encodeURIComponent(v)}`);
  };
  return (
    <Popover>
      <div className="flex w-full items-center gap-1">
        <PopoverTrigger asChild>
          <button type="button" className="flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-1 rounded px-1 text-left text-xs hover:bg-muted/50">
            {selected.length ? selected.map(s => <OptionChip key={s} prop={prop} option={s} />)
              : <span className="text-muted-foreground">Empty</span>}
          </button>
        </PopoverTrigger>
        {selected.length > 0 && (
          <button type="button" onClick={seeAll} title={`See all notes with ${selected[0]}`}
            aria-label={`See all notes with ${selected[0]}`}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ListFilter className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="max-h-[75dvh] w-[min(92vw,300px)] space-y-1 overflow-y-auto p-2">
        {selected.length > 0 && (
          <Button size="sm" variant="ghost" className="h-7 w-full justify-start text-xs" onClick={seeAll}>
            <ListFilter className="mr-1.5 h-3 w-3 shrink-0" /> See all notes with "{selected[0]}"
          </Button>
        )}
        <Input autoFocus placeholder="Find or create…" value={q} onChange={e => setQ(e.target.value)} className="h-8 text-xs"
          onKeyDown={e => { if (e.key === "Enter" && q.trim()) { e.preventDefault(); pick(q.trim()); } }} />
        {options.filter(o => o.toLowerCase().includes(q.toLowerCase())).map(o => (
          <div key={o} className="flex items-center gap-1">
            <Button variant="ghost" onClick={() => pick(o)} className={cn("min-h-10 h-auto min-w-0 flex-1 justify-between whitespace-normal rounded px-2 py-1 text-xs", selected.includes(o) && "font-medium")}>
              <OptionChip prop={prop} option={o} />{selected.includes(o) && <CheckSquare className="h-3 w-3" />}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Settings for ${o}`} title={`Colors and icons for ${o}`} className="h-10 w-10 shrink-0"><Settings2 className="h-4 w-4" /></Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="max-h-[75dvh] w-[min(92vw,280px)] space-y-2 overflow-y-auto p-2">
                <Input defaultValue={o} aria-label={`Rename ${o}`} className="h-7 text-xs"
                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  onBlur={e => { const t = e.target.value.trim(); if (t && t !== o) onChange(renameOption(prop, o, t)); }} />
                <p className="text-[11px] font-medium text-muted-foreground">Color</p>
                <PropertyColorGrid value={optionColor(prop, o, map)} onPick={color => { if (!color) return; onChange({ colors: { ...(prop.colors ?? {}), [o]: color } }); setOptionStyle(prop.name, o, { color }); }} />
                <p className="text-[11px] font-medium text-muted-foreground">Icon</p>
                <IconGrid value={resolveOption(map, prop.name, o).icon} onPick={k => setOptionStyle(prop.name, o, { icon: k })} />
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

function ProjectValue({ prop, onChange }: { prop: NoteProperty; onChange: (p: Partial<NoteProperty>) => void }) {
  const { state } = useStore();
  const projects = (state.projects ?? []).filter((p: any) => !p.archivedAt);
  const current = prop.value ? String(prop.value) : "";
  return (
    <div className="flex items-center gap-1">
      <select value={current} onChange={e => onChange({ value: e.target.value || null })} aria-label={prop.name}
        className="h-7 w-full rounded bg-transparent px-1 text-xs outline-none hover:bg-muted/50 focus:bg-muted/60">
        <option value="">No project</option>
        {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {current && <RouterLink to={`/projects/${current}`} aria-label="Open project" className="text-muted-foreground hover:text-foreground"><FolderKanban className="h-3.5 w-3.5" /></RouterLink>}
    </div>
  );
}
