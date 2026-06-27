import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Link2, FileText, BookOpen, Target, Flame, Utensils, CalendarHeart,
} from "lucide-react";
import { TASK_LINK_LABEL, type TaskLinkEntity } from "@/lib/task-links";
import { listNotes } from "@/lib/notes";

export interface PickedLink {
  type: TaskLinkEntity;
  id: string;
  label: string;
}

const TYPE_ICON: Record<TaskLinkEntity, React.ComponentType<{ className?: string }>> = {
  note: FileText, journal: BookOpen, goal: Target, habit: Flame,
  meal: Utensils, appointment: CalendarHeart, project: FileText, person: FileText,
};

const TYPES: TaskLinkEntity[] = ["note", "journal", "goal", "habit", "meal", "appointment"];

export function SubtaskLinkPicker({
  selected, onChange, compact = false,
}: {
  selected: PickedLink[];
  onChange: (next: PickedLink[]) => void;
  compact?: boolean;
}) {
  const { state } = useStore();
  const [type, setType] = useState<TaskLinkEntity>("note");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    let active = true;
    if (type === "note") {
      void listNotes({ archived: false }).then((rows) => {
        if (!active) return;
        setNotes(rows.map(n => ({ id: n.id, label: n.title || n.body.slice(0, 48) || "Untitled note" })));
      }).catch(() => { if (active) setNotes([]); });
    }
    return () => { active = false; };
  }, [type]);

  const options = useMemo<{ id: string; label: string }[]>(() => {
    const q = query.trim().toLowerCase();
    const filter = (rows: { id: string; label: string }[]) =>
      q ? rows.filter(r => r.label.toLowerCase().includes(q)) : rows;
    switch (type) {
      case "note": return filter(notes);
      case "journal":
        return filter(state.journal.map(j => ({ id: j.id, label: j.title || j.body.slice(0, 48) || "Untitled entry" })));
      case "goal":
        return filter(state.goals.map(g => ({ id: g.id, label: g.title })));
      case "habit":
        return filter(state.habits.map(h => ({ id: h.id, label: h.title })));
      case "meal":
        return filter(state.meals.map(m => ({ id: m.id, label: `${m.name} · ${m.date}` })));
      case "appointment":
        return filter(state.appointments.map(a => ({ id: a.id, label: `${a.title} · ${a.date}` })));
      default: return [];
    }
  }, [type, query, notes, state]);

  const isPicked = (t: TaskLinkEntity, id: string) =>
    selected.some(s => s.type === t && s.id === id);

  const toggle = (id: string, label: string) => {
    if (isPicked(type, id)) {
      onChange(selected.filter(s => !(s.type === type && s.id === id)));
    } else {
      onChange([...selected, { type, id, label }]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/60 px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50",
            compact ? "h-7" : "h-8",
          )}
          aria-label="Link subtask to…"
        >
          <Link2 className="h-3 w-3" />
          {selected.length > 0 ? `${selected.length} linked` : "Link…"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="mb-2 flex flex-wrap gap-1">
          {TYPES.map(t => {
            const Icon = TYPE_ICON[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors",
                  type === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                <Icon className="h-3 w-3" /> {TASK_LINK_LABEL[t]}
              </button>
            );
          })}
        </div>
        <Input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${TASK_LINK_LABEL[type].toLowerCase()}…`}
          className="mb-2 h-8 text-xs"
        />
        <div className="max-h-56 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">No matches</p>
          ) : options.slice(0, 50).map(opt => {
            const picked = isPicked(type, opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id, opt.label)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
                  picked ? "bg-primary/10 text-primary" : "hover:bg-muted/60",
                )}
              >
                <span className="truncate">{opt.label}</span>
                {picked && <span aria-hidden>✓</span>}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}