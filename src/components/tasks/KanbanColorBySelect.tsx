import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { KanbanColorBy } from "@/components/tasks/KanbanBoard";

export function KanbanColorBySelect({ value, onChange }: { value: KanbanColorBy; onChange: (v: KanbanColorBy) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as KanbanColorBy)}>
      <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="area">Color: Area</SelectItem>
        <SelectItem value="project">Color: Project</SelectItem>
        <SelectItem value="tag">Color: Tag</SelectItem>
        <SelectItem value="none">Color: None</SelectItem>
      </SelectContent>
    </Select>
  );
}
