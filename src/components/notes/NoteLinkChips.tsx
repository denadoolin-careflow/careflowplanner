import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useNoteLinks, unlinkNote, ENTITY_LABEL, ENTITY_ROUTE, type EntityType } from "@/lib/note-links";
import {
  CheckSquare, FolderOpen, Target, Flame, CalendarHeart, Clock, Users, Utensils,
  BookOpen, FileText, CalendarDays, Sparkles, Layers, PartyPopper, Heart, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  task: CheckSquare, project: FolderOpen, goal: Target, habit: Flame, appointment: CalendarHeart,
  time_block: Clock, person: Users, meal: Utensils, journal: BookOpen,
  note: FileText, date: CalendarDays, cosmic_event: Sparkles, area: Layers, holiday: PartyPopper, memory: Heart,
};

interface Props {
  noteId: string | null | undefined;
  className?: string;
  emptyHint?: string;
}

/** Compact removable chips showing every entity a note is linked to. */
export function NoteLinkChips({ noteId, className, emptyHint }: Props) {
  const { state } = useStore();
  const { links, reload } = useNoteLinks(noteId ?? null);
  const nav = useNavigate();

  const items = useMemo(() => links.map(l => {
    let label = ENTITY_LABEL[l.entityType];
    switch (l.entityType) {
      case "task": label = state.tasks.find(t => t.id === l.entityId)?.title ?? label; break;
      case "project": label = (state.projects ?? []).find(p => p.id === l.entityId)?.name ?? label; break;
      case "goal": label = state.goals.find(g => g.id === l.entityId)?.title ?? label; break;
      case "habit": label = state.habits.find(h => h.id === l.entityId)?.title ?? label; break;
      case "appointment": label = state.appointments.find(a => a.id === l.entityId)?.title ?? label; break;
      case "person": label = state.recipients.find(p => p.id === l.entityId)?.name ?? label; break;
      case "meal": label = state.meals.find(m => m.id === l.entityId)?.name ?? label; break;
      case "journal": {
        const j = state.journal.find(x => x.id === l.entityId);
        label = j ? (j.title || j.body.slice(0, 32)) : label; break;
      }
      case "area": label = (state.areas ?? []).find(a => a.id === l.entityId)?.name ?? label; break;
      case "holiday": label = state.holidays.find(h => h.id === l.entityId)?.name ?? label; break;
      case "date": label = l.entityId; break;
      case "cosmic_event": label = decodeURIComponent(l.entityId); break;
    }
    return { ...l, label };
  }), [links, state]);

  if (!noteId) return null;
  if (items.length === 0) {
    if (!emptyHint) return null;
    return <p className={cn("text-[11px] text-muted-foreground", className)}>{emptyHint}</p>;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map(it => {
        const Icon = ICONS[it.entityType];
        return (
          <span
            key={it.id}
            className="group inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 pl-2 pr-1 py-0.5 text-[11px] text-foreground/80"
          >
            <Icon className="h-3 w-3 text-muted-foreground" />
            <button
              type="button"
              onClick={() => nav(ENTITY_ROUTE[it.entityType](it.entityId))}
              className="max-w-[160px] truncate text-left hover:underline"
              title={`${ENTITY_LABEL[it.entityType]} · ${it.label}`}
            >
              {it.label}
            </button>
            <button
              type="button"
              onClick={async () => { await unlinkNote(noteId, it.entityType, it.entityId); await reload(); }}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-60 group-hover:opacity-100"
              aria-label="Remove link"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}