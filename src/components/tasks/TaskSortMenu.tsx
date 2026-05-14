import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Task, Priority } from "@/lib/types";

export type SortMode = "created" | "date" | "priority" | "title";

const PRIO: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function sortTasks(list: Task[], mode: SortMode): Task[] {
  const arr = [...list];
  switch (mode) {
    case "date":
      return arr.sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
    case "priority":
      return arr.sort((a, b) => (PRIO[a.priority] ?? 9) - (PRIO[b.priority] ?? 9));
    case "title":
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return arr.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }
}

const LABEL: Record<SortMode, string> = {
  created: "Newest",
  date: "Date",
  priority: "Priority",
  title: "Title",
};

export function TaskSortMenu({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <ArrowUpDown className="h-3.5 w-3.5" /> Sort: {LABEL[value]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        {(["created", "date", "priority", "title"] as SortMode[]).map(k => (
          <DropdownMenuCheckboxItem key={k} checked={value === k} onCheckedChange={() => onChange(k)}>
            {LABEL[k]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}