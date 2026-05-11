import { useState, useEffect, useRef } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Input } from "@/components/ui/input";
import { ChevronDown, Clock, Plus } from "lucide-react";
import type { Meal } from "@/lib/types";
import { MealPickerPopover } from "./MealPickerPopover";
import { motion } from "framer-motion";

interface Props {
  meal: Meal | null;
  date: string;
  slot: Meal["slot"];
  onOpen: (meal: Meal) => void;
  onCreate: (data: { name: string; prep_minutes?: number | null; ingredients?: string[]; steps?: string[]; tags?: string[] }) => Promise<void> | void;
  onRename: (id: string, name: string) => Promise<void> | void;
}

export function MealCell({ meal, date, slot, onOpen, onCreate, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(meal?.name ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setVal(meal?.name ?? ""); }, [meal?.name]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const { setNodeRef: dropRef, isOver } = useDroppable({ id: `slot-${date}-${slot}`, data: { date, slot } });
  const { attributes, listeners, setNodeRef: dragRef, isDragging } = useDraggable({
    id: meal ? `meal-${meal.id}` : `empty-${date}-${slot}`,
    disabled: !meal || editing,
    data: { mealId: meal?.id },
  });

  const setRefs = (n: HTMLElement | null) => { dropRef(n); dragRef(n); };

  const commit = async () => {
    const trimmed = val.trim();
    setEditing(false);
    if (!trimmed) return;
    if (meal && trimmed !== meal.name) await onRename(meal.id, trimmed);
    if (!meal) await onCreate({ name: trimmed });
  };

  if (!meal) {
    return (
      <div ref={setRefs} className={`relative rounded-lg border border-dashed transition
        ${isOver ? "border-primary bg-primary/10 shadow-[0_0_0_2px_hsl(var(--primary)/0.25)]" : "border-border/50"}`}>
        {editing ? (
          <Input ref={inputRef} value={val} onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(""); setEditing(false); } }}
            className="h-7 border-0 bg-transparent px-2 text-xs focus-visible:ring-0" placeholder="Meal name…" />
        ) : (
          <div className="flex items-center">
            <button onClick={() => setEditing(true)}
              className="flex-1 px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground">
              <Plus className="mr-1 inline h-3 w-3" />Add
            </button>
            <MealPickerPopover
              trigger={
                <button className="px-1.5 py-1.5 text-muted-foreground hover:text-primary" title="Pick meal">
                  <ChevronDown className="h-3 w-3" />
                </button>
              }
              onPick={(m) => onCreate(m)}
              onCreateNew={() => setEditing(true)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div ref={setRefs} {...attributes} {...listeners}
      animate={{ opacity: isDragging ? 0.4 : 1, scale: isDragging ? 0.98 : 1 }}
      transition={{ duration: 0.15 }}
      className={`group relative cursor-grab rounded-lg bg-muted/40 px-2 py-1.5 transition
        ${isOver ? "ring-2 ring-primary/50 bg-primary/15" : "hover:bg-primary/15 hover:shadow-[0_0_12px_hsl(var(--primary)/0.25)]"}`}>
      {editing ? (
        <Input ref={inputRef} value={val} onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(meal.name); setEditing(false); } }}
          className="h-6 border-0 bg-transparent px-1 text-xs focus-visible:ring-0" />
      ) : (
        <>
          <div className="flex items-start gap-1">
            <button onClick={() => onOpen(meal)} className="flex-1 text-left text-xs leading-snug">
              <span className="line-clamp-2">{meal.name}</span>
            </button>
            <MealPickerPopover
              trigger={
                <button className="opacity-0 transition group-hover:opacity-70" onPointerDown={(e) => e.stopPropagation()}>
                  <ChevronDown className="h-3 w-3" />
                </button>
              }
              onPick={(m) => onCreate(m)}
              onCreateNew={() => setEditing(true)}
            />
          </div>
          {meal.prepMinutes ? (
            <div className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />{meal.prepMinutes}m
            </div>
          ) : null}
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setEditing(true)}
            className="absolute right-1 bottom-0.5 hidden text-[9px] text-muted-foreground hover:text-primary group-hover:block">
            edit
          </button>
        </>
      )}
    </motion.div>
  );
}
