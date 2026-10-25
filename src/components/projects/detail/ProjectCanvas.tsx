/**
 * Project canvas (design C): anchor card with progress, goal, milestones and next step,
 * plus Garden / Journal / List views with inline task and note capture.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { BookOpen, CheckCircle2, Circle, FileText, Flag, Heart, Leaf, List, NotebookPen, Plus, Sprout, Sun, Wind } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useConnections } from "@/lib/connections";
import { useEntityNotes, linkNote } from "@/lib/note-links";
import { createNote } from "@/lib/notes";
import { GARDEN_PHASES, groupTasksByPhase, phaseOfSection, type GardenPhase } from "@/lib/projects/garden-phases";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LinkedGoalLabels } from "@/components/goals/LifeAreaGoalPicker";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { Project, Task } from "@/lib/types";

type View = "garden" | "journal" | "list";
const ICON: Record<GardenPhase, typeof Sprout> = { Plan: Sprout, Grow: Leaf, Care: Heart, "Let go": Wind };
const todayISO = () => format(new Date(), "yyyy-MM-dd");

function InlineAdd({ placeholder, onAdd, className }: { placeholder: string; onAdd: (v: string) => Promise<void> | void; className?: string }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const s = v.trim(); if (!s || busy) return;
    setBusy(true);
    try { await onAdd(s); setV(""); haptics.light?.(); } finally { setBusy(false); }
  };
  return (
    <form className={cn("flex items-center gap-2", className)} onSubmit={e => { e.preventDefault(); void submit(); }}>
      <Input value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} enterKeyHint="done"
        className="h-11 min-w-0 flex-1 rounded-xl bg-background/70 text-base md:text-sm" />
      <Button type="submit" size="icon" disabled={!v.trim() || busy} aria-label="Add" className="h-11 w-11 shrink-0 rounded-xl"><Plus className="h-4 w-4" /></Button>
    </form>
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <div className="flex min-h-11 items-start gap-2 rounded-xl bg-muted/50 px-2 py-2">
      <button type="button" onClick={onToggle} aria-label={task.done ? "Mark not done" : "Mark done"} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-primary">
        {task.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </button>
      <p className={cn("min-w-0 flex-1 break-words pt-1.5 text-sm", task.done && "text-muted-foreground line-through")}>{task.title}</p>
    </div>
  );
}

export function ProjectCanvas({ project }: { project: Project }) {
  const { state, addTask, toggleTask, updateTask, updateProject, addSection } = useStore();
  const { linksFor } = useConnections();
  const { notes, reload } = useEntityNotes("project", project.id);
  const key = `careflow:project-canvas:${project.id}`;
  const [view, setView] = useState<View>(() => { try { return (localStorage.getItem(key) as View) || "garden"; } catch { return "garden"; } });
  useEffect(() => { try { localStorage.setItem(key, view); } catch { /* ignore */ } }, [key, view]);

  const all = useMemo(() => state.tasks.filter(t => t.projectId === project.id && !t.parentTaskId), [state.tasks, project.id]);
  const open = all.filter(t => !t.done);
  const done = all.filter(t => t.done);
  const pct = all.length ? Math.round((done.length / all.length) * 100) : 0;
  const sections = (state.projectSections ?? []).filter(s => s.projectId === project.id);
  const phases = groupTasksByPhase(open, sections);
  const next = open.find(t => t.isTopThree) ?? open[0];
  const milestones = project.milestones ?? [];
  const library = linksFor("project", project.id).map(l => l.other).filter(o => o.type === "library");

  const addInPhase = async (phase: GardenPhase, title: string) => {
    let sec = sections.find(s => phaseOfSection(s.name) === phase);
    if (!sec && phase !== "Plan") sec = (await addSection({ projectId: project.id, name: phase })) ?? undefined;
    await addTask({ title, projectId: project.id, sectionId: sec?.id });
  };
  const addNote = async (text: string) => {
    try {
      const n = await createNote({ title: text.length > 60 ? text.slice(0, 60) + "…" : text, body: text, projectId: project.id, date: todayISO() });
      await linkNote(n.id, "project", project.id);
      await reload();
      toast.success("Note added");
    } catch (e: any) { toast.error(e?.message ?? "Could not add note"); }
  };
  const toggleMilestone = (id: string) =>
    updateProject(project.id, { milestones: milestones.map(m => m.id === id ? { ...m, done: !m.done } : m) });

  const journal = useMemo(() => {
    const items: { at: string; label: string; icon: typeof Flag; href?: string; body?: string }[] = [];
    for (const n of notes) items.push({ at: (n as any).date || (n as any).createdAt || "", label: n.title || "Untitled note", icon: FileText, href: `/notes/${n.id}`, body: n.body?.replace(/<[^>]+>/g, "").slice(0, 160) });
    for (const t of done) items.push({ at: t.updatedAt || t.createdAt, label: `Finished · ${t.title}`, icon: CheckCircle2 });
    for (const m of milestones) if (m.done) items.push({ at: m.date || "", label: `Milestone · ${m.title}`, icon: Flag });
    for (const l of library) items.push({ at: "", label: l.title, icon: BookOpen, href: l.href });
    return items.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  }, [notes, done, milestones, library]);

  return (
    <div className="space-y-4 pb-24">
      <section className="space-y-3 rounded-3xl border border-border/50 bg-card/90 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Progress value={pct} className="h-2 flex-1" />
          <span className="text-xs tabular-nums text-muted-foreground">{done.length}/{all.length}</span>
        </div>
        <LinkedGoalLabels ids={project.linkedGoalIds} />
        {milestones.length > 0 && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {milestones.map(m => (
              <button key={m.id} type="button" onClick={() => toggleMilestone(m.id)} aria-pressed={m.done}
                className={cn("inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border px-3 text-xs", m.done ? "border-secondary bg-secondary/15 text-foreground" : "border-border text-muted-foreground")}>
                <Flag className="h-3 w-3" />{m.title}
              </button>
            ))}
          </div>
        )}
        {next ? (
          <div className="flex items-center gap-2 rounded-2xl bg-muted/60 p-2 pl-3">
            <p className="min-w-0 flex-1 break-words text-sm"><span className="text-muted-foreground">Next step: </span>{next.title}</p>
            <Button size="sm" variant={next.dueDate === todayISO() ? "secondary" : "default"} className="min-h-10 shrink-0 rounded-full"
              onClick={() => { void updateTask(next.id, { dueDate: todayISO() }); toast.success("Added to today"); }}>
              <Sun className="mr-1 h-3.5 w-3.5" />{next.dueDate === todayISO() ? "Today" : "+ Today"}
            </Button>
          </div>
        ) : <p className="text-sm text-muted-foreground">No open steps yet. Add one below.</p>}
      </section>

      <div role="tablist" aria-label="Project view" className="flex gap-2 overflow-x-auto">
        {([["garden", "Garden", Sprout], ["journal", "Journal", NotebookPen], ["list", "List", List]] as const).map(([k, l, I]) => (
          <button key={k} role="tab" type="button" aria-selected={view === k} onClick={() => setView(k)}
            className={cn("inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm", view === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/70")}>
            <I className="h-4 w-4" />{l}
          </button>
        ))}
      </div>

      {view === "garden" && (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {GARDEN_PHASES.map(p => {
            const I = ICON[p];
            return (
              <section key={p} className="w-[85%] shrink-0 snap-start space-y-2 rounded-2xl border border-border/60 bg-card/80 p-3 md:w-auto">
                <p className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold"><I className="h-3.5 w-3.5" />{p} · {phases[p].length}</p>
                {phases[p].map(t => <TaskRow key={t.id} task={t} onToggle={() => void toggleTask(t.id)} />)}
                <InlineAdd placeholder="Add task…" onAdd={v => addInPhase(p, v)} />
              </section>
            );
          })}
        </div>
      )}

      {view === "journal" && (
        <div className="space-y-3">
          <InlineAdd placeholder="Add a note or reflection…" onAdd={addNote} />
          {journal.length ? (
            <ol className="space-y-3 rounded-2xl border border-border/60 bg-card/80 p-4">
              {journal.map((j, i) => {
                const I = j.icon;
                const inner = <>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><I className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    {j.at && <p className="text-xs text-muted-foreground">{(() => { try { return format(parseISO(j.at), "MMM d"); } catch { return ""; } })()}</p>}
                    <p className="break-words text-sm">{j.label}</p>
                    {j.body && j.body !== j.label && <p className="line-clamp-2 text-xs text-muted-foreground">{j.body}</p>}
                  </div>
                </>;
                return <li key={i}>{j.href ? <Link to={j.href} className="flex gap-3">{inner}</Link> : <div className="flex gap-3">{inner}</div>}</li>;
              })}
            </ol>
          ) : <p className="text-sm text-muted-foreground">Your project journal is empty. Write a first note above.</p>}
        </div>
      )}

      {view === "list" && (
        <div className="space-y-2 rounded-2xl border border-border/60 bg-card/80 p-3">
          <InlineAdd placeholder="Add task…" onAdd={v => addTask({ title: v, projectId: project.id }).then(() => {})} />
          {open.map(t => <TaskRow key={t.id} task={t} onToggle={() => void toggleTask(t.id)} />)}
          {done.length > 0 && <p className="pt-2 text-xs text-muted-foreground">Done · {done.length}</p>}
          {done.slice(0, 20).map(t => <TaskRow key={t.id} task={t} onToggle={() => void toggleTask(t.id)} />)}
        </div>
      )}
    </div>
  );
}
