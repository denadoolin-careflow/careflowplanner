import { useMemo, useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Plus, Trash2, Copy, Indent, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { ResetChecklist, ResetItem, TimeBlock } from "@/lib/reset-checklists";
import { QuickTimerMenu } from "./QuickTimerMenu";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const BLOCKS: TimeBlock[] = ["morning","afternoon","evening"];

interface Props {
  list: ResetChecklist;
  onAdd: (item: Partial<ResetItem> & { title: string; parent_id?: string | null }) => void;
  onUpdate: (id: string, patch: Partial<ResetItem>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (parentId: string | null, ordered: string[]) => void;
  onRenameList?: (name: string) => void;
  onDeleteList?: () => void;
  onSaveTemplate?: () => void;
}

export function ChecklistTree(p: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const roots = useMemo(
    () => p.list.items.filter(i => !i.parent_id).sort((a,b)=>a.sort_order-b.sort_order),
    [p.list.items]
  );
  const childrenOf = (pid: string) => p.list.items.filter(i => i.parent_id === pid).sort((a,b)=>a.sort_order-b.sort_order);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(p.list.name);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = roots.findIndex(i => i.id === active.id);
    const newIdx = roots.findIndex(i => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const ids = arrayMove(roots, oldIdx, newIdx).map(i => i.id);
    p.onReorder(null, ids);
  };

  const submitDraft = () => {
    const t = draft.trim();
    if (t) p.onAdd({ title: t });
    setDraft("");
    setAdding(false);
  };

  const completedCount = roots.filter(r => r.done).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {editingName ? (
          <Input
            autoFocus
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onBlur={() => { p.onRenameList?.(nameDraft.trim() || p.list.name); setEditingName(false); }}
            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setNameDraft(p.list.name); setEditingName(false); } }}
            className="h-8 max-w-xs"
          />
        ) : (
          <button
            className="flex items-center gap-1 rounded font-display text-base font-semibold text-foreground hover:text-primary"
            onClick={() => setEditingName(true)}
            title="Rename"
          >
            {p.list.name}
            <Pencil className="h-3 w-3 opacity-40" />
          </button>
        )}
        <span className="text-xs text-muted-foreground">{completedCount}/{roots.length}</span>
        <div className="ml-auto flex gap-1">
          {p.onSaveTemplate && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={p.onSaveTemplate}>Save as template</Button>
          )}
          {p.onDeleteList && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={p.onDeleteList}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={roots.map(r=>r.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {roots.map(item => (
                <SortableRow
                  key={item.id}
                  item={item}
                  children={childrenOf(item.id)}
                  onAdd={p.onAdd}
                  onUpdate={p.onUpdate}
                  onDelete={p.onDelete}
                  onDuplicate={p.onDuplicate}
                />
              ))}
            </AnimatePresence>
          </ul>
        </SortableContext>
      </DndContext>

      {adding ? (
        <form onSubmit={e => { e.preventDefault(); submitDraft(); }} className="flex gap-1">
          <Input
            autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={submitDraft}
            onKeyDown={e => { if (e.key === "Escape") { setDraft(""); setAdding(false); } }}
            placeholder="Add item…" className="h-8 text-sm"
          />
        </form>
      ) : (
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-3 w-3" /> Add item
        </Button>
      )}
    </div>
  );
}

function SortableRow({
  item, children, onAdd, onUpdate, onDelete, onDuplicate,
}: {
  item: ResetItem;
  children: ResetItem[];
  onAdd: Props["onAdd"];
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
  onDuplicate: Props["onDuplicate"];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const [addingChild, setAddingChild] = useState(false);
  const [childDraft, setChildDraft] = useState("");

  const commit = () => {
    const v = draft.trim();
    if (v && v !== item.title) onUpdate(item.id, { title: v });
    else setDraft(item.title);
    setEditing(false);
  };

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="rounded-lg"
    >
      <div className="group flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted/40">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        {children.length > 0 ? (
          <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : <span className="w-3.5" />}
        <Checkbox checked={item.done} onCheckedChange={(v) => onUpdate(item.id, { done: !!v })} />
        {editing ? (
          <Input
            autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(item.title); setEditing(false); } }}
            className="h-7 flex-1 text-sm"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={cn("flex-1 cursor-text text-sm", item.done && "text-muted-foreground line-through")}
          >
            {item.title}
          </span>
        )}
        <ItemMeta item={item} />
        <QuickTimerMenu title={item.title} />
        <ItemDetails item={item} onUpdate={onUpdate} />
        <Popover>
          <PopoverTrigger asChild>
            <button className="rounded-md p-1 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="end">
            <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted" onClick={() => setAddingChild(true)}>
              <Indent className="h-3 w-3" /> Add subtask
            </button>
            <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted" onClick={() => onDuplicate(item.id)}>
              <Copy className="h-3 w-3" /> Duplicate
            </button>
            <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-destructive hover:bg-destructive/10" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {expanded && children.length > 0 && (
        <ul className="ml-7 mt-0.5 space-y-0.5 border-l border-border/40 pl-2">
          {children.map(c => (
            <li key={c.id} className="group/sub flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-muted/30">
              <Checkbox checked={c.done} onCheckedChange={(v) => onUpdate(c.id, { done: !!v })} className="h-3.5 w-3.5" />
              <SubTitle item={c} onUpdate={onUpdate} />
              <QuickTimerMenu title={c.title} />
              <button className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover/sub:opacity-100" onClick={() => onDelete(c.id)}>
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {addingChild && (
        <form
          className="ml-7 mt-1 flex gap-1"
          onSubmit={e => {
            e.preventDefault();
            const t = childDraft.trim();
            if (t) onAdd({ title: t, parent_id: item.id });
            setChildDraft(""); setAddingChild(false);
          }}
        >
          <Input
            autoFocus value={childDraft} onChange={e => setChildDraft(e.target.value)}
            onBlur={() => { setChildDraft(""); setAddingChild(false); }}
            onKeyDown={e => { if (e.key === "Escape") { setChildDraft(""); setAddingChild(false); } }}
            placeholder="Subtask…" className="h-7 text-xs"
          />
        </form>
      )}
    </motion.li>
  );
}

function SubTitle({ item, onUpdate }: { item: ResetItem; onUpdate: Props["onUpdate"] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const commit = () => {
    const v = draft.trim();
    if (v && v !== item.title) onUpdate(item.id, { title: v });
    else setDraft(item.title);
    setEditing(false);
  };
  if (editing) {
    return (
      <Input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(item.title); setEditing(false); } }}
        className="h-6 flex-1 text-xs" />
    );
  }
  return (
    <span onDoubleClick={() => setEditing(true)} className={cn("flex-1 cursor-text text-xs", item.done && "text-muted-foreground line-through")}>
      {item.title}
    </span>
  );
}

function ItemMeta({ item }: { item: ResetItem }) {
  const bits: string[] = [];
  if (item.day_of_week !== null && item.day_of_week !== undefined) bits.push(DAYS[item.day_of_week]);
  if (item.time_block) bits.push(item.time_block);
  if (item.start_time) bits.push(item.start_time);
  if (item.est_minutes) bits.push(`${item.est_minutes}m`);
  if (!bits.length) return null;
  return <span className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">{bits.join(" · ")}</span>;
}

function ItemDetails({ item, onUpdate }: { item: ResetItem; onUpdate: Props["onUpdate"] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="rounded-md p-1 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100" title="Schedule & details">
          <Pencil className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2 p-3" align="end">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Day</Label>
          <Select value={item.day_of_week !== null ? String(item.day_of_week) : "none"} onValueChange={v => onUpdate(item.id, { day_of_week: v === "none" ? null : Number(v) })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Any</SelectItem>
              {DAYS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Time block</Label>
          <Select value={item.time_block ?? "none"} onValueChange={v => onUpdate(item.id, { time_block: v === "none" ? null : v as TimeBlock })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Anytime</SelectItem>
              {BLOCKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Start</Label>
            <Input type="time" value={item.start_time ?? ""} onChange={e => onUpdate(item.id, { start_time: e.target.value || null })} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Duration (min)</Label>
            <Input type="number" min={1} value={item.est_minutes ?? ""} onChange={e => onUpdate(item.id, { est_minutes: e.target.value ? Number(e.target.value) : null })} className="h-8 text-xs" />
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</Label>
          <Input value={item.category ?? ""} onChange={e => onUpdate(item.id, { category: e.target.value || null })} className="h-8 text-xs" placeholder="Kitchen, Bathroom…" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</Label>
          <Textarea value={item.notes ?? ""} onChange={e => onUpdate(item.id, { notes: e.target.value || null })} className="text-xs" rows={2} />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Due date</Label>
          <Input type="date" value={item.due_date ?? ""} onChange={e => onUpdate(item.id, { due_date: e.target.value || null })} className="h-8 text-xs" />
        </div>
      </PopoverContent>
    </Popover>
  );
}