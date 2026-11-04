import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useTaskSelection } from "@/lib/task-selection";
import type { DayPart } from "@/components/inbox/WhenPopover";
import { useInboxRowStyle } from "@/lib/inbox-row-style";
import type { Task } from "@/lib/types";

interface Props {
  task: Task;
  autoDayPart: DayPart;
  compact?: boolean;
}

/**
 * Inbox row wrapper: drag-sortable shell around the shared TaskCard,
 * plus multi-select support.
 */
export function InboxSortableRow({ task, autoDayPart, compact = false }: Props) {
  const { isSelected, toggle } = useTaskSelection();
  const [rowStyle] = useInboxRowStyle();
  const sortableId = `inbox:${task.id}`;
  const { setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sortableId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  void rowStyle;
  void compact;
  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        autoDayPart={autoDayPart}
        selected={isSelected(task.id)}
        onToggleSelect={toggle}
      />
    </div>
  );
}
