import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell } from "lucide-react";

const PRESETS = [
  { v: "0",   label: "At time of event" },
  { v: "5",   label: "5 minutes before" },
  { v: "15",  label: "15 minutes before" },
  { v: "30",  label: "30 minutes before" },
  { v: "60",  label: "1 hour before" },
  { v: "1440",label: "1 day before" },
];

export function ReminderPicker({ value, onChange }: { value?: number; onChange: (v: number | undefined) => void }) {
  const cur = value === undefined ? "none" : String(value);
  return (
    <div className="flex items-center gap-2">
      <Bell className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={cur} onValueChange={(v) => onChange(v === "none" ? undefined : Number(v))}>
        <SelectTrigger className="h-9 w-full text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No reminder</SelectItem>
          {PRESETS.map(p => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}