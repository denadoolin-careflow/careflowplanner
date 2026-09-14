/**
 * One Trello-style drag layer for every planner surface.
 *
 * `PlannerDndProvider` wraps the planner. Cards call `useDraggableCard`,
 * targets call `useDropZone`, and every drop is routed through the shared
 * `useScheduleDrop` so conflicts, capacity prompts and Undo behave the same
 * in the Schedule grid, Board, List, Table, Month calendar and side panel.
 *
 * Mouse: pick up after a 6px move (clicks still work). Touch: long-press
 * 200ms. External HTML5 drags (inbox rails) still land via `nativeProps`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, type DragOverEvent,
} from "@dnd-kit/core";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScheduleConflictDialog } from "@/components/planner/ScheduleConflictDialog";
import { useScheduleDrop, readDraggedItem, PLANNER_ITEM_MIME, type DayPartKey, type ScheduleOpts } from "./use-schedule-drop";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export type PlannerDragKind = "task" | "appointment" | "meal";
export const DRAGGABLE_TYPES: string[] = ["task", "appointment", "meal"];

export interface PlannerDragItem {
  type: string;
  id: string;
  label: string;
  color?: string;
  time?: string | null;
}

export interface PlannerDropTarget {
  dateISO: string;
  part?: DayPartKey;
  slot?: ScheduleOpts["slot"];
  /** Schedule grid: map a client Y coordinate to an "HH:MM" start. */
  resolveTime?: (clientY: number) => string | undefined;
  /** Keep a task's current time when it already sits in `part`. */
  keepTime?: boolean;
  /** Board reordering hook: called after the item lands in this target. */
  onLanded?: (item: PlannerDragItem) => void;
}

interface Ctx {
  active: PlannerDragItem | null;
  schedule: (item: { type: string; id: string }, target: PlannerDropTarget, clientY?: number) => void;
}

const PlannerDndCtx = createContext<Ctx>({ active: null, schedule: () => {} });

export function usePlannerDnd() { return useContext(PlannerDndCtx); }

export function PlannerDndProvider({ children }: { children: ReactNode }) {
  const drop = useScheduleDrop();
  const [active, setActive] = useState<PlannerDragItem | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const schedule = useCallback((item: { type: string; id: string }, target: PlannerDropTarget, clientY?: number) => {
    const opts: ScheduleOpts = { slot: target.slot, keepTime: target.keepTime };
    if (target.resolveTime && clientY != null) {
      const t = target.resolveTime(clientY);
      if (t) opts.time = t;
    }
    drop.schedule(item, target.dateISO, target.part, opts);
  }, [drop]);

  const onDragStart = (e: DragStartEvent) => {
    const item = e.active.data.current as PlannerDragItem | undefined;
    if (!item) return;
    setActive(item);
    haptics.pickup();
    document.body.classList.add("planner-dragging");
  };

  const onDragOver = (e: DragOverEvent) => {
    const next = e.over ? String(e.over.id) : null;
    if (next !== overId) { setOverId(next); if (next) haptics.magnet(); }
  };

  const finish = () => {
    setActive(null);
    setOverId(null);
    document.body.classList.remove("planner-dragging");
  };

  const onDragEnd = (e: DragEndEvent) => {
    const item = e.active.data.current as PlannerDragItem | undefined;
    const target = e.over?.data.current as PlannerDropTarget | undefined;
    finish();
    if (!item || !target) return;
    const act = e.activatorEvent as PointerEvent | TouchEvent | undefined;
    let startY: number | undefined;
    if (act && "clientY" in act) startY = (act as PointerEvent).clientY;
    else if (act && "touches" in act && act.touches?.[0]) startY = act.touches[0].clientY;
    const clientY = startY != null ? startY + e.delta.y : undefined;
    haptics.drop();
    schedule(item, target, clientY);
    target.onLanded?.(item);
  };

  useEffect(() => () => document.body.classList.remove("planner-dragging"), []);

  const ctx = useMemo<Ctx>(() => ({ active, schedule }), [active, schedule]);
  const cap = drop.capacityPending;

  return (
    <PlannerDndCtx.Provider value={ctx}>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={finish}>
        {children}
        <DragOverlay dropAnimation={null} zIndex={9999}>
          {active && (
            <div className="planner-dnd-ghost" style={{ borderLeftColor: active.color ?? "hsl(var(--primary))" }}>
              {active.time && <span className="mr-1.5 font-mono text-[10px] opacity-70">{active.time.slice(0, 5)}</span>}
              {active.label}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <ScheduleConflictDialog pending={drop.pending} onCancel={() => drop.setPending(null)} onResolve={drop.resolve} />
      <AlertDialog open={!!cap} onOpenChange={open => !open && drop.cancelCapacity()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This day is already quite full</AlertDialogTitle>
            <AlertDialogDescription>
              {cap && `${format(new Date(`${cap.dateISO}T12:00:00`), "EEEE, MMMM d")} is holding about ${Math.round(cap.load / 60 * 10) / 10} hours of commitments. You can still move “${cap.title}” here, or choose a lighter day.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={drop.cancelCapacity}>Choose another day</AlertDialogCancel>
            <AlertDialogAction onClick={drop.confirmCapacity}>Move anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PlannerDndCtx.Provider>
  );
}

/** Make a card draggable. Spread `props` onto the element and pass `ref`. */
export function useDraggableCard(item: PlannerDragItem, opts: { disabled?: boolean; idPrefix?: string } = {}) {
  const disabled = opts.disabled || !DRAGGABLE_TYPES.includes(item.type);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `${opts.idPrefix ?? "card"}:${item.type}:${item.id}`,
    data: item,
    disabled,
  });
  const { role: _r, tabIndex: _t, ...rest } = attributes as any;
  return {
    ref: setNodeRef,
    isDragging,
    props: disabled ? {} : {
      ...listeners,
      ...rest,
      "data-planner-card": "true",
      style: { touchAction: "manipulation" as const },
    },
    className: cn(disabled ? undefined : "planner-dnd-card", isDragging && "planner-dnd-card--dragging"),
  };
}

let zoneSeq = 0;

/** Register a drop target. Spread `nativeProps` too so HTML5 drags from rails still land. */
export function useDropZone(target: PlannerDropTarget, opts: { id?: string; disabled?: boolean } = {}) {
  const [autoId] = useState(() => `zone-${++zoneSeq}`);
  const id = opts.id ?? `${autoId}:${target.dateISO}:${target.part ?? ""}:${target.slot ?? ""}`;
  const { setNodeRef, isOver, active } = useDroppable({ id, data: target, disabled: opts.disabled });
  const { schedule } = usePlannerDnd();
  const [nativeOver, setNativeOver] = useState(false);

  const nativeProps = {
    onDragOver: (e: React.DragEvent) => {
      const types = Array.from(e.dataTransfer.types);
      if (types.includes(PLANNER_ITEM_MIME) || types.includes("application/x-careflow-task") || types.includes("text/plain")) {
        e.preventDefault(); e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        if (!nativeOver) setNativeOver(true);
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setNativeOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      setNativeOver(false);
      const dragged = readDraggedItem(e);
      if (!dragged) return;
      e.preventDefault(); e.stopPropagation();
      schedule(dragged, target, e.clientY);
      target.onLanded?.({ ...dragged, label: "" });
    },
  };

  const over = isOver || nativeOver;
  return {
    ref: setNodeRef,
    isOver: over,
    armed: !!active,
    nativeProps,
    className: cn("planner-dropzone", !!active && "planner-dropzone--armed", over && "planner-dropzone--active"),
    dataProps: { "data-drop-day": target.dateISO, "data-drop-active": over ? "true" : undefined },
  };
}

/** Drag payload helpers for feed items. */
export function feedDragItem(it: { sourceRef: { type: string; id: string }; title: string; color?: string; time?: string | null }): PlannerDragItem {
  return { type: it.sourceRef.type, id: it.sourceRef.id, label: it.title, color: it.color, time: it.time };
}
