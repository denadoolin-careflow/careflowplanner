import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useNoteLinks, linkNote, unlinkNote, ENTITY_LABEL, ENTITY_ROUTE, type EntityType } from "@/lib/note-links";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link2, Plus, X, CheckSquare, FolderOpen, Target, Flame, CalendarHeart, Clock, Users, Utensils, BookOpen } from "lucide-react";
import { toast } from "sonner";

const ICONS: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  task: CheckSquare, project: FolderOpen, goal: Target, habit: Flame, appointment: CalendarHeart, time_block: Clock,
  person: Users, meal: Utensils, journal: BookOpen,
};

interface Props { noteId: string; }

export function NoteLinksSidebar({ noteId }: Props) {
  const { state } = useStore();
  const { links, reload } = useNoteLinks(noteId);
  const nav = useNavigate();

  const resolved = useMemo(() => {
    return links.map(l => {
      let label = "(missing)";
      switch (l.entityType) {
        case "task": label = state.tasks.find(t => t.id === l.entityId)?.title ?? label; break;
        case "project": label = (state.projects ?? []).find(p => p.id === l.entityId)?.name ?? label; break;
        case "goal": label = state.goals.find(g => g.id === l.entityId)?.title ?? label; break;
        case "habit": label = state.habits.find(h => h.id === l.entityId)?.title ?? label; break;
        case "appointment": label = state.appointments.find(a => a.id === l.entityId)?.title ?? label; break;
        case "time_block": label = "Time block"; break;
      }
      return { ...l, label };
    });
  }, [links, state]);

  const grouped = useMemo(() => {
    const m = new Map<EntityType, typeof resolved>();
    for (const r of resolved) {
      const arr = m.get(r.entityType) ?? [];
      arr.push(r);
      m.set(r.entityType, arr);
    }
    return Array.from(m.entries());
  }, [resolved]);

  const onUnlink = async (l: typeof resolved[number]) => {
    await unlinkNote(noteId, l.entityType, l.entityId);
    await reload();
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" /> Linked to
        </h3>
        <AttachPopover noteId={noteId} existing={links.map(l => `${l.entityType}:${l.entityId}`)} onLinked={reload} />
      </div>

      {grouped.length === 0 ? (
        <p className="text-xs text-muted-foreground">Not attached to anything yet. Use “Attach” to connect this note to a task, project, goal, habit, appointment, or time block.</p>
      ) : (
        <div className="space-y-3">
          {grouped.map(([type, rows]) => {
            const Icon = ICONS[type];
            return (
              <div key={type}>
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3 w-3" /> {ENTITY_LABEL[type]}s
                </div>
                <ul className="space-y-1">
                  {rows.map(r => (
                    <li key={r.id} className="group flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 text-xs">
                      <button onClick={() => nav(ENTITY_ROUTE[type](r.entityId))} className="min-w-0 flex-1 truncate text-left hover:underline">{r.label}</button>
                      <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={() => onUnlink(r)} aria-label="Unlink">
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AttachPopover({ noteId, existing, onLinked }: { noteId: string; existing: string[]; onLinked: () => void; }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EntityType>("task");
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const m = (s?: string) => !term || (s ?? "").toLowerCase().includes(term);
    switch (tab) {
      case "task": return state.tasks.filter(t => !t.done && m(t.title)).slice(0, 30).map(t => ({ id: t.id, label: t.title }));
      case "project": return (state.projects ?? []).filter(p => m(p.name)).slice(0, 30).map(p => ({ id: p.id, label: p.name }));
      case "goal": return state.goals.filter(g => m(g.title)).slice(0, 30).map(g => ({ id: g.id, label: g.title }));
      case "habit": return state.habits.filter(h => m(h.title)).slice(0, 30).map(h => ({ id: h.id, label: h.title }));
      case "appointment": return state.appointments.filter(a => m(a.title)).slice(0, 30).map(a => ({ id: a.id, label: `${a.title}${a.date ? ` · ${a.date}` : ""}` }));
      default: return [];
    }
  }, [tab, q, state]);

  const attach = async (id: string) => {
    if (existing.includes(`${tab}:${id}`)) { toast("Already linked"); return; }
    try {
      await linkNote(noteId, tab, id);
      onLinked();
      toast("Linked");
    } catch (e: any) { toast.error(e?.message ?? "Could not link"); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 rounded-full text-xs"><Plus className="h-3 w-3" /> Attach</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as EntityType)}>
          <TabsList className="grid w-full grid-cols-5 h-8">
            <TabsTrigger value="task" className="text-[10px] px-1">Task</TabsTrigger>
            <TabsTrigger value="project" className="text-[10px] px-1">Project</TabsTrigger>
            <TabsTrigger value="goal" className="text-[10px] px-1">Goal</TabsTrigger>
            <TabsTrigger value="habit" className="text-[10px] px-1">Habit</TabsTrigger>
            <TabsTrigger value="appointment" className="text-[10px] px-1">Event</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-2 space-y-2">
            <Input autoFocus placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 text-xs" />
            <ScrollArea className="h-56">
              {items.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">Nothing to show.</div>
              ) : (
                <ul className="space-y-0.5">
                  {items.map(it => (
                    <li key={it.id}>
                      <button
                        type="button"
                        className="w-full truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60"
                        onClick={() => attach(it.id)}
                      >
                        {it.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}