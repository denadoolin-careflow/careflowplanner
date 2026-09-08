import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddInline } from "@/components/planning/AddInline";
import type { PriorityItem, PrepWindow } from "@/lib/monthly-plan";

/** 3 priorities, 2 prep windows, 1 seasonal intention. */
export function ThreeTwoOneCard({
  priorities, prepWindows, intention, onChange, newId,
}: {
  priorities: PriorityItem[];
  prepWindows: PrepWindow[];
  intention: string;
  newId: () => string;
  onChange: (patch: { priorities?: PriorityItem[]; prep_windows?: PrepWindow[]; intention?: string }) => void;
}) {
  const top3 = priorities.slice(0, 3);
  const windows = prepWindows.slice(0, 2);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">3 priorities</p>
        <ul className="mt-1.5 space-y-1.5">
          {top3.map(p => (
            <li key={p.id} className="flex items-center gap-2">
              <Input
                value={p.title}
                onChange={e => onChange({ priorities: priorities.map(x => x.id === p.id ? { ...x, title: e.target.value } : x) })}
                className="h-8 rounded-lg text-xs"
              />
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Remove priority"
                onClick={() => onChange({ priorities: priorities.filter(x => x.id !== p.id) })}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
        {top3.length < 3 && (
          <AddInline
            placeholder="Add a priority"
            onAdd={v => onChange({ priorities: [...priorities, { id: newId(), title: v, done: false }] })}
          />
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">2 preparation windows</p>
        <ul className="mt-1.5 space-y-1.5">
          {windows.map(w => (
            <li key={w.id} className="flex items-center gap-2">
              <Input
                value={w.label}
                onChange={e => onChange({ prep_windows: prepWindows.map(x => x.id === w.id ? { ...x, label: e.target.value } : x) })}
                className="h-8 rounded-lg text-xs"
              />
              <Input
                type="date"
                value={w.start ?? ""}
                onChange={e => onChange({ prep_windows: prepWindows.map(x => x.id === w.id ? { ...x, start: e.target.value || null } : x) })}
                className="h-8 w-[9.5rem] rounded-lg text-xs"
              />
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Remove window"
                onClick={() => onChange({ prep_windows: prepWindows.filter(x => x.id !== w.id) })}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
        {windows.length < 2 && (
          <AddInline
            placeholder="e.g. Sunday afternoon for gift shopping"
            onAdd={v => onChange({ prep_windows: [...prepWindows, { id: newId(), label: v, start: null, end: null }] })}
          />
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">1 seasonal intention</p>
        <Input
          value={intention}
          onChange={e => onChange({ intention: e.target.value })}
          placeholder="What this month is really for"
          className="mt-1.5 h-9 rounded-lg text-sm"
        />
      </div>
    </div>
  );
}
