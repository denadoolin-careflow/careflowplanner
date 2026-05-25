import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings2 } from "lucide-react";
import { useViewPrefs, type TaskViewType, type VisibleFields } from "@/hooks/useViewPrefs";

const FIELD_LABELS: Record<keyof VisibleFields, string> = {
  tags: "Tags",
  priority: "Priority",
  dueDate: "Due date",
  project: "Project",
  area: "Area",
  energy: "Energy",
  estMinutes: "Time estimate",
  icon: "Icon",
  cover: "Cover image",
  checkbox: "Checkbox",
  description: "Description",
  createdAt: "Created date",
};

export function ViewOptionsMenu({ view }: { view: TaskViewType }) {
  const { visible, toggle, reset } = useViewPrefs(view);
  const fields = Object.keys(FIELD_LABELS) as (keyof VisibleFields)[];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" title="View options">
          <Settings2 className="h-3.5 w-3.5" /> View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Visible fields · {view}
        </DropdownMenuLabel>
        {fields.map(f => (
          <DropdownMenuCheckboxItem
            key={f}
            checked={visible[f]}
            onCheckedChange={() => toggle(f)}
            onSelect={(e) => e.preventDefault()}
          >
            {FIELD_LABELS[f]}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => reset()} className="text-xs text-muted-foreground">
          Reset to defaults
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}