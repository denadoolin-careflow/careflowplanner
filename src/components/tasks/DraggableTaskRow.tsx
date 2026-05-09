import { useDraggable } from "@dnd-kit/core";
import { Task } from "@/lib/types";
import { TaskRow } from "@/components/cards/TaskRow";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function DraggableTaskRow({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} className={cn("flex items-center gap-1 rounded-xl", isDragging && "opacity-40")}>
      <button {...listeners} {...attributes} aria-label="Drag" className="cursor-grab touch-none rounded p-1 text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1"><TaskRow task={task} dense showArea={false} /></div>
    </div>
  );
}