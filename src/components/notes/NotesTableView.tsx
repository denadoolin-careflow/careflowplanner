/**
 * Notion-style notes table: fixed columns plus one column per note property
 * (matched by name across notes). Property cells edit inline; property
 * headers sort and filter; the last row adds a new note.
 */
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowUp, Filter, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagChip } from "@/components/tags/TagChip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { noteNodes } from "./NotesOutlineView";
import { PropValue, PROPERTY_TYPES, createdDay } from "./NotePropertiesSection";
import type { Note, NoteProperty, NotePropertyType } from "@/lib/notes";

export type NotesSort = "updated" | "created" | "title" | "words";

interface Props {
  notes: Note[];
  allNotes?: Note[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  sort: NotesSort;
  onSortChange: (s: NotesSort) => void;
  onPropertiesChange?: (noteId: string, properties: NoteProperty[]) => void;
  onCreate?: (title: string, properties: NoteProperty[]) => Promise<void>;
}

const COLS: { id: NotesSort | null; label: string; className?: string }[] = [
  { id: "title",   label: "Title" },
  { id: null,      label: "Tags",   className: "hidden md:table-cell" },
  { id: null,      label: "Kind",   className: "hidden sm:table-cell" },
  { id: null,      label: "Nodes",  className: "hidden lg:table-cell text-right" },
  { id: "words",   label: "Words",  className: "hidden sm:table-cell text-right" },
  { id: "updated", label: "Updated", className: "text-right" },
];

interface PropCol { name: string; type: NotePropertyType; options: string[]; colors: Record<string, string> }
const keyOf = (n: string) => n.trim().toLowerCase();

const cellText = (v: NoteProperty["value"]) =>
  v == null ? "" : Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "yes" : "no") : String(v);

export function NotesTableView({ notes, allNotes, selectedId, onSelect, sort, onSortChange, onPropertiesChange, onCreate }: Props) {
  const [propSort, setPropSort] = useState<{ name: string; dir: 1 | -1 } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState("");

  const cols = useMemo<PropCol[]>(() => {
    const map = new Map<string, PropCol>();
    for (const n of allNotes ?? notes) for (const p of n.properties ?? []) {
      const k = keyOf(p.name); if (!k) continue;
      const c = map.get(k) ?? { name: p.name, type: p.type, options: [], colors: {} };
      for (const o of p.options ?? []) if (!c.options.includes(o)) c.options.push(o);
      Object.assign(c.colors, p.colors ?? {});
      map.set(k, c);
    }
    return [...map.values()];
  }, [allNotes, notes]);

  const propOf = (n: Note, c: PropCol) => (n.properties ?? []).find(p => keyOf(p.name) === keyOf(c.name));
  const virtual = (n: Note, c: PropCol): NoteProperty => propOf(n, c) ?? {
    id: `v-${c.name}`, name: c.name, type: c.type, options: c.options, colors: c.colors,
    value: c.type === "checkbox" ? false : c.type === "multi" ? [] : null,
  };

  const rows = useMemo(() => {
    let r = notes.filter(n => Object.entries(filters).every(([name, q]) => {
      if (!q.trim()) return true;
      const c = cols.find(x => keyOf(x.name) === name); if (!c) return true;
      return cellText(propOf(n, c)?.value ?? null).toLowerCase().includes(q.toLowerCase());
    }));
    if (propSort) {
      const c = cols.find(x => keyOf(x.name) === keyOf(propSort.name));
      if (c) r = [...r].sort((a, b) => {
        const av = propOf(a, c)?.value, bv = propOf(b, c)?.value;
        const ae = av == null || av === "", be = bv == null || bv === "";
        if (ae !== be) return ae ? 1 : -1;
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * propSort.dir;
        return cellText(av ?? null).localeCompare(cellText(bv ?? null)) * propSort.dir;
      });
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, filters, propSort, cols]);

  const editCell = (n: Note, c: PropCol, patch: Partial<NoteProperty>) => {
    if (!onPropertiesChange) return;
    const existing = propOf(n, c);
    const next = existing
      ? (n.properties ?? []).map(p => p.id === existing.id ? { ...p, ...patch } : p)
      : [...(n.properties ?? []), { ...virtual(n, c), id: crypto.randomUUID(), ...patch }];
    onPropertiesChange(n.id, next);
  };

  const addColumn = (name: string, type: NotePropertyType) => {
    if (!onPropertiesChange || !name.trim() || cols.some(c => keyOf(c.name) === keyOf(name))) return;
    for (const n of notes) onPropertiesChange(n.id, [...(n.properties ?? []), {
      id: crypto.randomUUID(), name: name.trim(), type, options: [],
      value: type === "checkbox" ? false : type === "multi" ? [] : type === "date" ? createdDay(n.createdAt) : null,
    }]);
  };

  const create = async () => {
    const title = newTitle.trim(); if (!title || !onCreate) return;
    const today = createdDay();
    const props: NoteProperty[] = cols.filter(c => c.type === "date").map(c => ({ id: crypto.randomUUID(), name: c.name, type: "date", value: today }));
    setNewTitle("");
    await onCreate(title, props);
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/50">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground">
            {COLS.map(c => (
              <th key={c.label} scope="col" className={cn("px-3 py-2 text-left font-medium", c.className)}>
                {c.id ? (
                  <button type="button" onClick={() => { setPropSort(null); onSortChange(c.id!); }} aria-label={`Sort by ${c.label}`} className="inline-flex items-center gap-1 hover:text-foreground">
                    {c.label}
                    {!propSort && sort === c.id && (c.id === "title" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                ) : c.label}
              </th>
            ))}
            {cols.map(c => {
              const k = keyOf(c.name);
              const active = propSort && keyOf(propSort.name) === k;
              return (
                <th key={k} scope="col" className="min-w-[140px] px-3 py-2 text-left font-medium">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground">
                        {c.name}
                        {active && (propSort!.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        {filters[k] && <Filter className="h-3 w-3 text-primary" />}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-56 space-y-2 p-2 normal-case tracking-normal">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setPropSort({ name: c.name, dir: 1 })} className="flex-1 rounded px-2 py-1 text-xs hover:bg-muted"><ArrowUp className="mr-1 inline h-3 w-3" />Ascending</button>
                        <button type="button" onClick={() => setPropSort({ name: c.name, dir: -1 })} className="flex-1 rounded px-2 py-1 text-xs hover:bg-muted"><ArrowDown className="mr-1 inline h-3 w-3" />Descending</button>
                      </div>
                      <Input placeholder="Filter: contains…" value={filters[k] ?? ""} onChange={e => setFilters(f => ({ ...f, [k]: e.target.value }))} className="h-8 text-xs" />
                      {(filters[k] || active) && (
                        <button type="button" onClick={() => { setFilters(f => { const n = { ...f }; delete n[k]; return n; }); if (active) setPropSort(null); }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" /> Clear
                        </button>
                      )}
                    </PopoverContent>
                  </Popover>
                </th>
              );
            })}
            {onPropertiesChange && (
              <th scope="col" className="w-8 px-2 py-2"><AddColumn onAdd={addColumn} /></th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(n => {
            const words = (n.body ?? "").trim() ? (n.body.trim().split(/\s+/).length) : 0;
            let updated = "";
            try { updated = format(parseISO(n.updatedAt), "MMM d"); } catch { /* noop */ }
            return (
              <tr key={n.id} onClick={() => onSelect(n.id)} className={cn("cursor-pointer border-b border-border/30 last:border-b-0 hover:bg-muted/40", selectedId === n.id && "bg-primary/5")}>
                <td className="max-w-[280px] truncate px-3 py-2">{n.title || "Untitled"}</td>
                <td className="hidden px-3 py-2 md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(n.tags ?? []).slice(0, 3).map(t => <TagChip key={t} name={t} size="xs" entityId={n.id} entityType="note" />)}
                  </div>
                </td>
                <td className="hidden px-3 py-2 capitalize text-muted-foreground sm:table-cell">{n.kind ?? "note"}</td>
                <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground lg:table-cell">{noteNodes(n.body).length}</td>
                <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">{words}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{updated}</td>
                {cols.map(c => {
                  const p = virtual(n, c);
                  return (
                    <td key={keyOf(c.name)} className="px-2 py-1" onClick={e => e.stopPropagation()}>
                      <PropValue key={`${n.id}-${String(p.value)}`} prop={{ ...p, options: Array.from(new Set([...(p.options ?? []), ...c.options])), colors: { ...c.colors, ...(p.colors ?? {}) } }} onChange={patch => editCell(n, c, patch)} />
                    </td>
                  );
                })}
                {onPropertiesChange && <td />}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLS.length + cols.length + 1} className="px-3 py-6 text-center text-sm text-muted-foreground">
                No notes match.
                {Object.values(filters).some(v => v.trim()) && (
                  <button type="button" onClick={() => setFilters({})} className="ml-2 underline hover:text-foreground">Clear all filters</button>
                )}
              </td>
            </tr>
          )}
          {onCreate && (
            <tr>
              <td colSpan={COLS.length + cols.length + 1} className="px-3 py-1.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Plus className="h-3.5 w-3.5" />
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void create(); }}
                    placeholder="New note — type a title and press Enter" aria-label="New note title"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                </div>
              </td>
            </tr>
          )}
        </tbody>
        {cols.length > 0 && (
          <tfoot>
            <tr className="border-t border-border/60 text-[11px] text-muted-foreground">
              <td className="px-3 py-1.5">{rows.length} {rows.length === 1 ? "note" : "notes"}</td>
              <td className="hidden md:table-cell" /><td className="hidden sm:table-cell" /><td className="hidden lg:table-cell" />
              <td className="hidden sm:table-cell" /><td />
              {cols.map(c => <td key={keyOf(c.name)} className="px-2 py-1"><Aggregate col={c} values={rows.map(n => propOf(n, c)?.value ?? null)} /></td>)}
              {onPropertiesChange && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function AddColumn({ onAdd }: { onAdd: (name: string, type: NotePropertyType) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Add property column" className="rounded p-1 hover:bg-muted hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 space-y-1 p-2 normal-case tracking-normal">
        <Input autoFocus placeholder="Property name" value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs" />
        {PROPERTY_TYPES.map(t => (
          <button key={t.type} type="button" disabled={!name.trim()} onClick={() => { onAdd(name, t.type); setName(""); setOpen(false); }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted disabled:opacity-50">
            <t.icon className="h-3.5 w-3.5 text-muted-foreground" /> {t.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
