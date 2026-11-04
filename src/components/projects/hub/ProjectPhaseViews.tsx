import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Lightbulb, MoreHorizontal, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PHASE_ICONS } from "@/lib/phase-icons";
import { RHYTHM_LABEL, type RhythmPhase } from "@/lib/planner/rhythm-phase";
import { PHASE_ORDER } from "@/lib/today-phase-items";
import { PHASE_ROLE, patchForPhase, projectDue, projectPhase, projectProgress } from "@/lib/projects/phase";
import { useProjectGroups } from "@/lib/projects/use-project-groups";
import { useProjectIdeas } from "@/lib/project-ideas";
import { ProjectIconGlyph } from "@/lib/project-icon";
import { ProgressRing, PhasePill } from "@/components/projects/ProgressRing";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Project, Task } from "@/lib/types";

const tint = (p: RhythmPhase) => `hsl(var(--rhythm-${p}-tint))`;
const deep = (p: RhythmPhase) => `hsl(var(--rhythm-${p}-deep))`;
const main = (p: RhythmPhase) => `hsl(var(--rhythm-${p}))`;
const dueLabel = (iso?: string) => iso ? format(new Date(`${iso}T00:00`), "MMM d") : "";
const DND = "application/x-careflow-project";

export type GroupBy = "phase" | "sections" | "area";
interface Group { key: string; label: string; phase: RhythmPhase; projects: Project[]; sub?: string; editable?: boolean }

function subline(p: Project, next?: Task) {
  if (projectPhase(p) === "letgo" && p.waitingOn) return `Waiting on ${p.waitingOn}`;
  if (next) return `Next: ${next.title}`;
  return p.focusThisWeek || p.notes?.split("\n")[0] || "";
}

/** Inbox-style project row: phase icon tile, name, next task, due pill, progress ring. */
export function ProjectRow({ p, draggable, moveMenu }: { p: Project; draggable?: boolean; moveMenu?: React.ReactNode }) {
  const { state } = useStore();
  const ph = projectPhase(p); const pr = projectProgress(p.id, state.tasks); const due = projectDue(p);
  return (
    <div draggable={draggable} onDragStart={e => e.dataTransfer.setData(DND, p.id)}
      className="flex min-h-[56px] items-center gap-3 rounded-2xl bg-card px-3 py-2 ring-1 ring-border/60">
      <Link to={`/projects/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: tint(ph), color: deep(ph) }}>
          {p.icon ? <ProjectIconGlyph icon={p.icon} className="h-4 w-4" /> : (() => { const I = PHASE_ICONS[ph]; return <I className="h-4 w-4" />; })()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words font-semibold leading-snug">{p.name}</span>
          <span className="block break-words text-sm text-muted-foreground">{subline(p, pr.next)}</span>
        </span>
      </Link>
      {due && <PhasePill phase={ph}>{dueLabel(due)}</PhasePill>}
      <ProgressRing pct={pr.pct} phase={ph} size={36} />
      {moveMenu}
    </div>
  );
}

function IdeasLine() {
  const { ideas, add } = useProjectIdeas();
  const [v, setV] = useState("");
  return (
    <div className="mt-2 space-y-2">
      {ideas.length > 0 && <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><Lightbulb className="h-4 w-4" aria-hidden />{ideas.length} {ideas.length === 1 ? "idea" : "ideas"} waiting</p>}
      <form onSubmit={async e => { e.preventDefault(); const t = v.trim(); if (!t) return; setV(""); await add(t); toast.success("Idea captured"); }}>
        <input value={v} onChange={e => setV(e.target.value)} aria-label="Add an idea" placeholder="Add an idea…"
          className="h-11 w-full rounded-2xl border border-dashed bg-transparent px-4 text-sm placeholder:text-muted-foreground focus:outline-none sm:max-w-md" style={{ borderColor: main("plan") }} />
      </form>
    </div>
  );
}

export function ByPhaseView({ projects }: { projects: Project[] }) {
  return (
    <div className="space-y-4">
      {PHASE_ORDER.map(ph => {
        const ps = projects.filter(p => projectPhase(p) === ph); const I = PHASE_ICONS[ph];
        return (
          <section key={ph} className="planner-card border-l-4 p-4" style={{ borderLeftColor: main(ph), background: `linear-gradient(180deg, ${tint(ph)}, hsl(var(--card)) 90px)` }}>
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: tint(ph), color: deep(ph) }}><I className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><h3 className="font-display text-xl leading-tight" style={{ color: deep(ph) }}>{RHYTHM_LABEL[ph]}</h3><p className="text-sm text-muted-foreground">{PHASE_ROLE[ph]}</p></div>
              <span className="text-sm text-muted-foreground">{ps.length}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">{ps.map(p => <ProjectRow key={p.id} p={p} />)}</div>
            {ps.length === 0 && ph !== "plan" && <p className="text-sm text-muted-foreground">Nothing here right now.</p>}
            {ph === "plan" && <IdeasLine />}
          </section>
        );
      })}
    </div>
  );
}

/** Groups + the move action for Phase / My sections / Area. */
export function useGrouping(projects: Project[], by: GroupBy) {
  const { updateProject } = useStore();
  const sec = useProjectGroups();
  const areas = useMemo(() => Array.from(new Set(projects.map(p => p.areaName || "No area"))).sort(), [projects]);
  const groups: Group[] = useMemo(() => {
    if (by === "phase") return PHASE_ORDER.map(ph => ({ key: ph, label: RHYTHM_LABEL[ph], phase: ph, sub: PHASE_ROLE[ph], projects: projects.filter(p => projectPhase(p) === ph) }));
    if (by === "area") return areas.map((a, i) => ({ key: a, label: a, phase: PHASE_ORDER[i % 4], projects: projects.filter(p => (p.areaName || "No area") === a) }));
    const known = new Set(sec.groups.map(g => g.id));
    return [
      ...sec.groups.map((g, i) => ({ key: g.id, label: g.name, phase: PHASE_ORDER[i % 4], editable: true, projects: projects.filter(p => p.groupId === g.id) })),
      { key: "none", label: "No section", phase: "letgo" as RhythmPhase, sub: "Drag a project into a section", projects: projects.filter(p => !p.groupId || !known.has(p.groupId)) },
    ];
  }, [by, projects, areas, sec.groups]);
  const move = async (projectId: string, key: string) => {
    const p = projects.find(x => x.id === projectId); if (!p) return;
    if (by === "phase") await updateProject(projectId, patchForPhase(key as RhythmPhase, p.stage));
    else if (by === "area") await updateProject(projectId, { areaName: key === "No area" ? undefined : key, areaId: undefined });
    else await updateProject(projectId, { groupId: key === "none" ? undefined : key });
    const g = groups.find(x => x.key === key); if (g) toast.success(`Moved to ${g.label}`);
  };
  return { groups, move, sec };
}

function MoveMenu({ groups, current, onMove }: { groups: Group[]; current: string; onMove: (k: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Move to" className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Move to</DropdownMenuLabel><DropdownMenuSeparator />
        {groups.filter(g => g.key !== current).map(g => <DropdownMenuItem key={g.key} onSelect={() => onMove(g.key)}>{g.label}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupTitle({ g, onRename, onDelete }: { g: Group; onRename: (n: string) => void; onDelete: () => void }) {
  const [edit, setEdit] = useState(false); const [v, setV] = useState(g.label);
  return (
    <div className="flex items-center gap-2">
      {edit ? (
        <input autoFocus value={v} onChange={e => setV(e.target.value)} aria-label="Section name"
          onBlur={() => { setEdit(false); if (v.trim() && v !== g.label) onRename(v.trim()); }}
          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setV(g.label); setEdit(false); } }}
          className="h-9 min-w-0 flex-1 rounded-lg bg-card px-2 font-display text-lg" />
      ) : (
        <button type="button" disabled={!g.editable} onClick={() => setEdit(true)} className="min-h-[44px] min-w-0 flex-1 break-words text-left font-display text-lg leading-tight" style={{ color: deep(g.phase) }}>{g.label}</button>
      )}
      {g.editable && <button type="button" onClick={onDelete} aria-label={`Delete section ${g.label}`} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-card"><X className="h-4 w-4" /></button>}
      <span className="text-sm" style={{ color: deep(g.phase) }}>{g.projects.length}</span>
    </div>
  );
}

function NewSectionBox({ onAdd }: { onAdd: (n: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={e => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV(""); } }} className="flex min-h-[44px] items-center gap-2 rounded-[20px] border border-dashed border-border px-3">
      <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
      <input value={v} onChange={e => setV(e.target.value)} aria-label="New section" placeholder="New section" className="h-11 min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
    </form>
  );
}

function useDrop(onDrop: (id: string) => void) {
  const [over, setOver] = useState(false);
  return { over, props: {
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes(DND)) { e.preventDefault(); setOver(true); } },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData(DND); if (id) onDrop(id); },
  } };
}

function BoardColumn({ g, groups, move, sec, onNew }: { g: Group; groups: Group[]; move: (id: string, k: string) => void; sec: ReturnType<typeof useProjectGroups>; onNew: () => void }) {
  const { state } = useStore();
  const d = useDrop(id => move(id, g.key));
  return (
    <section {...d.props} aria-label={g.label} className={cn("flex w-[280px] shrink-0 flex-col gap-2 rounded-[20px] border-t-4 p-3 md:w-auto", d.over && "ring-2")}
      style={{ background: tint(g.phase), borderTopColor: main(g.phase) }}>
      <GroupTitle g={g} onRename={n => sec.rename(g.key, n)} onDelete={() => sec.remove(g.key)} />
      {g.sub && <p className="-mt-1 text-xs text-muted-foreground">{g.sub}</p>}
      {g.projects.map(p => {
        const ph = projectPhase(p); const pr = projectProgress(p.id, state.tasks); const due = projectDue(p);
        return (
          <article key={p.id} draggable onDragStart={e => e.dataTransfer.setData(DND, p.id)} className="planner-card space-y-2 p-3">
            <div className="flex items-start gap-2">
              <Link to={`/projects/${p.id}`} className="min-w-0 flex-1 break-words font-semibold leading-snug">{p.name}</Link>
              <MoveMenu groups={groups} current={g.key} onMove={k => move(p.id, k)} />
            </div>
            <div className="flex flex-wrap gap-1 text-[11px] font-bold uppercase tracking-wide">
              {p.areaName && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{p.areaName}</span>}
              <span className="rounded-full px-2 py-0.5" style={{ background: tint(ph), color: deep(ph) }}>{RHYTHM_LABEL[ph]}</span>
              {due && <PhasePill phase={ph} className="normal-case tracking-normal">{dueLabel(due)}</PhasePill>}
            </div>
            <p className="break-words text-sm text-muted-foreground">{subline(p, pr.next)}</p>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: tint(ph) }}><div className="h-full rounded-full" style={{ width: `${pr.pct}%`, background: main(ph) }} /></div>
            <div className="flex justify-between text-xs font-semibold text-muted-foreground"><span>{pr.pct}% done</span><span>{pr.total - pr.done} open</span></div>
          </article>
        );
      })}
      <button type="button" onClick={onNew} className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-dashed px-3 text-sm font-semibold" style={{ borderColor: main(g.phase), color: deep(g.phase) }}><Plus className="h-4 w-4" />Add project</button>
    </section>
  );
}

export function ProjectBoard({ projects, by, onNew }: { projects: Project[]; by: GroupBy; onNew: () => void }) {
  const { groups, move, sec } = useGrouping(projects, by);
  return (
    <div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] md:px-0">
        {groups.map(g => <BoardColumn key={g.key} g={g} groups={groups} move={move} sec={sec} onNew={onNew} />)}
        {by === "sections" && <div className="w-[240px] shrink-0 md:w-auto"><NewSectionBox onAdd={sec.add} /></div>}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Drag a card to another column{by === "sections" ? " to file it in that section. Tap a section name to rename it." : ", or use ⋯ to move it."}</p>
    </div>
  );
}

function ListGroup({ g, groups, move, sec }: { g: Group; groups: Group[]; move: (id: string, k: string) => void; sec: ReturnType<typeof useProjectGroups> }) {
  const d = useDrop(id => move(id, g.key));
  return (
    <section {...d.props} className={cn("planner-card border-l-4 p-4", d.over && "ring-2")} style={{ borderLeftColor: main(g.phase) }}>
      <GroupTitle g={g} onRename={n => sec.rename(g.key, n)} onDelete={() => sec.remove(g.key)} />
      <ul className="mt-2 space-y-2">
        {g.projects.map(p => <li key={p.id}><ProjectRow p={p} draggable moveMenu={<MoveMenu groups={groups} current={g.key} onMove={k => move(p.id, k)} />} /></li>)}
        {g.projects.length === 0 && <li className="text-sm text-muted-foreground">Drop a project here.</li>}
      </ul>
    </section>
  );
}

export function ProjectListGrouped({ projects, by }: { projects: Project[]; by: GroupBy }) {
  const { groups, move, sec } = useGrouping(projects, by);
  return (
    <div className="space-y-3">
      {groups.map(g => <ListGroup key={g.key} g={g} groups={groups} move={move} sec={sec} />)}
      {by === "sections" && <NewSectionBox onAdd={sec.add} />}
    </div>
  );
}

export function ProjectCalendar({ projects }: { projects: Project[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const events = useMemo(() => projects.flatMap(p => {
    const ph = projectPhase(p); const out: { date: string; label: string; phase: RhythmPhase; id: string; kind: string }[] = [];
    const due = projectDue(p); if (due) out.push({ date: due, label: `${p.name} due`, phase: ph, id: p.id, kind: "Due" });
    for (const m of p.milestones ?? []) if (m.date) out.push({ date: m.date, label: `${p.name}: ${m.title}`, phase: ph, id: p.id, kind: "Milestone" });
    return out;
  }).sort((a, b) => a.date.localeCompare(b.date)), [projects]);
  const days = eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const coming = events.filter(e => e.date >= todayIso).slice(0, 8);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <section className="planner-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <button aria-label="Previous month" onClick={() => setMonth(m => addMonths(m, -1))} className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <h3 className="font-display text-xl">{format(month, "MMMM yyyy")}</h3>
          <button aria-label="Next month" onClick={() => setMonth(m => addMonths(m, 1))} className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <span key={d}>{d}</span>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map(d => {
            const iso = format(d, "yyyy-MM-dd"); const es = events.filter(e => e.date === iso);
            return (
              <div key={iso} className={cn("min-h-[72px] rounded-xl p-1 ring-1 ring-border/50", !isSameMonth(d, month) && "opacity-40", isToday(d) && "ring-2 ring-primary")}>
                <span className="block text-xs font-semibold">{format(d, "d")}</span>
                <div className="mt-0.5 space-y-0.5">
                  {es.map((e, i) => (
                    <Link key={i} to={`/projects/${e.id}`} className="block whitespace-normal break-words rounded-md px-1 py-0.5 text-[10px] font-semibold leading-tight" style={{ background: tint(e.phase), color: deep(e.phase) }}>{e.label}</Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="planner-card p-4">
        <h3 className="mb-2 font-display text-lg">Coming up</h3>
        {coming.length === 0 ? <p className="text-sm text-muted-foreground">No dates ahead.</p> : (
          <ul className="space-y-2">{coming.map((e, i) => (
            <li key={i}><Link to={`/projects/${e.id}`} className="flex min-h-[44px] items-start gap-2 rounded-xl px-2 py-1 hover:bg-muted">
              <PhasePill phase={e.phase}>{dueLabel(e.date)}</PhasePill>
              <span className="min-w-0 flex-1 break-words text-sm"><span className="font-semibold">{e.label}</span><span className="block text-xs text-muted-foreground">{e.kind}</span></span>
            </Link></li>
          ))}</ul>
        )}
      </section>
    </div>
  );
}
