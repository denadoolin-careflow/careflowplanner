import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddInline } from "@/components/planning/AddInline";
import type { PriorityItem, PrepWindow } from "@/lib/monthly-plan";

type Patch = { priorities?: PriorityItem[]; prep_windows?: PrepWindow[]; intention?: string };

/** 3 priorities, 2 prep windows, 1 seasonal intention. Typing is debounced before saving. */
export function ThreeTwoOneCard({
  priorities, prepWindows, intention, onChange, newId,
}: {
  priorities: PriorityItem[];
  prepWindows: PrepWindow[];
  intention: string;
  newId: () => string;
  onChange: (patch: Patch) => void;
}) {
  const [local, setLocal] = useState({ priorities, prepWindows, intention });
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // adopt server values whenever we are not mid-edit (month switch, refresh, other device)
  useEffect(() => {
    if (dirty.current) return;
    setLocal({ priorities, prepWindows, intention });
  }, [priorities, prepWindows, intention]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (patch: Patch, immediate = false) => {
    dirty.current = true;
    clearTimeout(timer.current);
    const send = () => { dirty.current = false; onChange(patch); };
    if (immediate) send();
    else timer.current = setTimeout(send, 700);
  };

  const setPriorities = (next: PriorityItem[], immediate = false) => {
    setLocal(l => ({ ...l, priorities: next }));
    commit({ priorities: next }, immediate);
  };
  const setWindows = (next: PrepWindow[], immediate = false) => {
    setLocal(l => ({ ...l, prepWindows: next }));
    commit({ prep_windows: next }, immediate);
  };

  const top3 = local.priorities.slice(0, 3);
  const windows = local.prepWindows.slice(0, 2);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">3 priorities</p>
        <ul className="mt-2 space-y-2">
          {top3.map(p => (
            <li key={p.id} className="flex items-center gap-2">
              <Input
                value={p.title}
                onChange={e => setPriorities(local.priorities.map(x => x.id === p.id ? { ...x, title: e.target.value } : x))}
                onBlur={() => commit({ priorities: local.priorities }, true)}
                className="h-11 rounded-xl text-sm sm:h-9"
              />
              <Button size="sm" variant="ghost" className="h-11 w-11 shrink-0 p-0 sm:h-9 sm:w-9" aria-label="Remove priority"
                onClick={() => setPriorities(local.priorities.filter(x => x.id !== p.id), true)}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
        {top3.length < 3 && (
          <AddInline
            placeholder="Add a priority"
            onAdd={v => setPriorities([...local.priorities, { id: newId(), title: v, done: false }], true)}
          />
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">2 preparation windows</p>
        <ul className="mt-2 space-y-2">
          {windows.map(w => (
            <li key={w.id} className="rounded-xl border border-border/60 p-2 sm:border-0 sm:p-0">
              <div className="flex items-center gap-2">
                <Input
                  value={w.label}
                  onChange={e => setWindows(local.prepWindows.map(x => x.id === w.id ? { ...x, label: e.target.value } : x))}
                  onBlur={() => commit({ prep_windows: local.prepWindows }, true)}
                  className="h-11 rounded-xl text-sm sm:h-9"
                />
                <Button size="sm" variant="ghost" className="h-11 w-11 shrink-0 p-0 sm:h-9 sm:w-9" aria-label="Remove window"
                  onClick={() => setWindows(local.prepWindows.filter(x => x.id !== w.id), true)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                type="date"
                value={w.start ?? ""}
                onChange={e => setWindows(local.prepWindows.map(x => x.id === w.id ? { ...x, start: e.target.value || null } : x), true)}
                className="mt-2 h-11 w-full rounded-xl text-sm sm:mt-1 sm:h-9 sm:w-[10rem]"
              />
            </li>
          ))}
        </ul>
        {windows.length < 2 && (
          <AddInline
            placeholder="e.g. Sunday afternoon for gift shopping"
            onAdd={v => setWindows([...local.prepWindows, { id: newId(), label: v, start: null, end: null }], true)}
          />
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">1 seasonal intention</p>
        <Input
          value={local.intention}
          onChange={e => { setLocal(l => ({ ...l, intention: e.target.value })); commit({ intention: e.target.value }); }}
          onBlur={() => commit({ intention: local.intention }, true)}
          placeholder="What this month is really for"
          className="mt-2 h-11 rounded-xl text-sm sm:h-10"
        />
      </div>
    </div>
  );
}
