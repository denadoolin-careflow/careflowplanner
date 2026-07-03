import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";
import {
  Sparkles, CheckSquare, CalendarDays, Users, ListPlus, ShoppingCart,
  BellPlus, Loader2, ChevronDown, ChevronRight, List, Link2, X, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore, todayISO } from "@/lib/store";
import { aiInvoke } from "@/lib/ai-invoke";
import { openTaskEditor } from "@/lib/open-task-editor";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";
import { NoteTOC } from "@/components/notes/NoteTOC";
import { useNoteEntities } from "@/hooks/useNoteEntities";
import { toggleTaskLine, deleteTaskLine, editTaskLine } from "@/lib/note-entities";

interface Props {
  noteId: string;
  title: string;
  body: string;
  tags: string[];
  projectId?: string | null;
  /** When provided, checkbox toggles / edits inside detected tasks update the note body in place. */
  onBodyChange?: (nextBody: string) => void;
}

function stripMd(s: string): string {
  return (s || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

export function NoteIntelligencePanel({ noteId, title, body, tags, projectId, onBodyChange }: Props) {
  const { state, addTask } = useStore();
  const nav = useNavigate();
  const bodyLc = (body || "").toLowerCase();
  const titleLc = (title || "").toLowerCase();
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  const entities = useNoteEntities(body);
  const inlineTasks = entities.tasks;
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const relatedTasks = useMemo(() => {
    const out = (state.tasks ?? []).filter(t => {
      if (t.done) return false;
      if (projectId && (t as any).projectId === projectId) return true;
      if ((t.tags ?? []).some(x => tagSet.has(x.toLowerCase()))) return true;
      const tt = (t.title || "").toLowerCase();
      if (tt && titleLc && tt.includes(titleLc)) return true;
      if (tt && bodyLc.includes(tt) && tt.length > 4) return true;
      return false;
    });
    return out.slice(0, 6);
  }, [state.tasks, tagSet, titleLc, bodyLc, projectId]);

  const relatedEvents = useMemo(() => {
    const now = new Date();
    const horizon = addDays(now, 21);
    const out = (state.appointments ?? []).filter(a => {
      let d: Date | null = null;
      try { d = parseISO(a.date); } catch { d = null; }
      if (!d) return false;
      if (isBefore(d, addDays(now, -1))) return false;
      if (isAfter(d, horizon)) return false;
      if (projectId && a.projectId === projectId) return true;
      const at = (a.title || "").toLowerCase();
      if (at && bodyLc.includes(at) && at.length > 3) return true;
      if (a.areaName && tagSet.has(a.areaName.toLowerCase())) return true;
      return false;
    });
    return out
      .sort((x, y) => x.date.localeCompare(y.date))
      .slice(0, 5);
  }, [state.appointments, bodyLc, tagSet, projectId]);

  const peopleMentioned = useMemo(() => {
    const names: { id: string; name: string; kind: "recipient" | "birthday" }[] = [];
    const seen = new Set<string>();
    for (const r of (state.recipients ?? [])) {
      if (!r.name) continue;
      const n = r.name.toLowerCase();
      if (seen.has(n)) continue;
      if (bodyLc.includes(n) || titleLc.includes(n)) {
        names.push({ id: r.id, name: r.name, kind: "recipient" });
        seen.add(n);
      }
    }
    for (const b of (state.birthdays ?? [])) {
      if (!b.name) continue;
      const n = b.name.toLowerCase();
      if (seen.has(n)) continue;
      if (bodyLc.includes(n) || titleLc.includes(n)) {
        names.push({ id: b.id, name: b.name, kind: "birthday" });
        seen.add(n);
      }
    }
    return names.slice(0, 8);
  }, [state.recipients, state.birthdays, bodyLc, titleLc]);

  // AI Summary
  const [summary, setSummary] = useState<string>("");
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({
    toc: true, tasks: true, linked: true, events: true, people: true, ai: true, actions: true,
  });

  // Reset summary when note id changes.
  useEffect(() => { setSummary(""); }, [noteId]);

  const runSummary = async () => {
    if (!body.trim()) { toast.info("Nothing to summarize yet"); return; }
    setSummaryBusy(true);
    try {
      const { data, error } = await aiInvoke("ai-notes", {
        body: { action: "summarize", title, body },
      });
      if (error) throw error;
      const text = (data as any)?.text?.trim();
      if (!text) throw new Error("Empty response");
      setSummary(text);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't summarize");
    } finally { setSummaryBusy(false); }
  };

  const createTaskFromNote = async () => {
    const t = (title || "Note follow-up").slice(0, 80);
    try {
      await addTask({
        title: `Follow up: ${t}`,
        notes: stripMd(body).slice(0, 240),
        area: "Home" as any,
        tags: uniq(["from-note", ...tags]),
        dueDate: todayISO(),
      });
      toast.success("Task created for today");
    } catch { toast.error("Couldn't create task"); }
  };

  const scheduleReminder = async () => {
    const t = (title || "Reminder").slice(0, 80);
    try {
      await addTask({
        title: `Reminder: ${t}`,
        notes: stripMd(body).slice(0, 240),
        area: "Home" as any,
        tags: uniq(["reminder", ...tags]),
        dueDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      });
      toast.success("Reminder set for tomorrow");
    } catch { toast.error("Couldn't set reminder"); }
  };

  const toggle = (k: string) => setOpen(o => ({ ...o, [k]: !o[k] }));

  const persistOpenRef = useMemo(() => ({
    save() {
      try { localStorage.setItem("careflow.notes.rail.open", JSON.stringify(open)); } catch {}
    },
  }), [open]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("careflow.notes.rail.open");
      if (raw) setOpen(o => ({ ...o, ...JSON.parse(raw) }));
    } catch {}
  }, []);
  useEffect(() => { persistOpenRef.save(); }, [persistOpenRef]);

  const linkedItems = useMemo(() => {
    const out: { key: string; label: string; to?: string }[] = [];
    for (const w of entities.wikilinks.slice(0, 8)) {
      out.push({ key: `w:${w}`, label: `[[${w}]]`, to: `/notes?q=${encodeURIComponent(w)}` });
    }
    for (const m of entities.mentions.slice(0, 8)) {
      const proj = (state.projects ?? []).find(p => p.name.toLowerCase() === m.toLowerCase());
      out.push({ key: `m:${m}`, label: `@${m}`, to: proj ? `/projects/${proj.id}` : undefined });
    }
    return out;
  }, [entities.wikilinks, entities.mentions, state.projects]);

  return (
    <aside className="flex w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur">
      <header className="border-b border-border/40 px-4 py-3">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Intelligence
        </h2>
        <p className="text-[10px] text-muted-foreground">Context pulled from your CareFlow.</p>
      </header>

      <div className="space-y-4 p-4">
        <Group title="On this page" icon={List} open={open.toc} onToggle={() => toggle("toc")}>
          <NoteTOC body={body} title="" className="ml-1" />
        </Group>

        <Group
          title={`Tasks · ${inlineTasks.length}`}
          icon={CheckSquare}
          open={open.tasks}
          onToggle={() => toggle("tasks")}
        >
          {inlineTasks.length === 0 ? (
            <Empty>Add `- [ ] task` lines and they'll show up here.</Empty>
          ) : (
            <ul className="space-y-1">
              {inlineTasks.map(t => (
                <li key={`${t.line}:${t.text}`} className="group flex items-start gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted/40">
                  <button
                    type="button"
                    onClick={() => onBodyChange?.(toggleTaskLine(body, t.line))}
                    className={cn(
                      "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-all",
                      t.done ? "border-primary/60 bg-primary/80 text-primary-foreground" : "border-border/60 bg-background hover:border-primary/60",
                    )}
                    aria-label={t.done ? "Mark incomplete" : "Mark complete"}
                  >
                    {t.done && <CheckSquare className="h-3 w-3" strokeWidth={2.5} />}
                  </button>
                  {editingLine === t.line ? (
                    <input
                      autoFocus
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onBlur={() => {
                        if (editDraft.trim()) onBodyChange?.(editTaskLine(body, t.line, editDraft));
                        setEditingLine(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                        if (e.key === "Escape") { setEditingLine(null); }
                      }}
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs outline-none focus:ring-0"
                    />
                  ) : (
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate transition-colors",
                        t.done && "text-muted-foreground line-through",
                      )}
                      onDoubleClick={() => { setEditingLine(t.line); setEditDraft(t.text); }}
                      title="Double-click to edit"
                    >
                      {t.text || <em className="text-muted-foreground/70">empty</em>}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setEditingLine(t.line); setEditDraft(t.text); }}
                    className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground text-muted-foreground/70"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onBodyChange?.(deleteTaskLine(body, t.line))}
                    className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive text-muted-foreground/70"
                    aria-label="Delete"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Group>

        <Group title={`Linked · ${linkedItems.length}`} icon={Link2} open={open.linked} onToggle={() => toggle("linked")}>
          {linkedItems.length === 0 ? (
            <Empty>Type [[Title]] or @Project to link.</Empty>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {linkedItems.map(l => (
                <li key={l.key}>
                  {l.to ? (
                    <Link to={l.to} className="inline-flex items-center rounded-full border border-border/50 bg-background/70 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/10">
                      {l.label}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-border/50 bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {l.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Group>

        <Group title={`Related tasks · ${relatedTasks.length}`} icon={CheckSquare} open={open.relatedTasks ?? true} onToggle={() => toggle("relatedTasks")}>
          {relatedTasks.length === 0 ? (
            <Empty>No matching tasks yet.</Empty>
          ) : (
            <ul className="space-y-1">
              {relatedTasks.map(t => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openTaskEditor(t.id)}
                    className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-muted/50"
                  >
                    <CheckSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    {t.dueDate && (
                      <span className="shrink-0 text-[10px] text-muted-foreground/80">
                        {format(parseISO(t.dueDate), "MMM d")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Group>

        <Group title={`Upcoming events · ${relatedEvents.length}`} icon={CalendarDays} open={open.events} onToggle={() => toggle("events")}>
          {relatedEvents.length === 0 ? (
            <Empty>Nothing scheduled that matches.</Empty>
          ) : (
            <ul className="space-y-1">
              {relatedEvents.map(a => (
                <li key={a.id}>
                  <Link
                    to={`/calendar?date=${a.date}`}
                    className="flex items-start gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted/50"
                  >
                    <CalendarDays className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{a.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground/80">
                      {format(parseISO(a.date), "MMM d")}{a.time ? ` · ${a.time}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Group>

        <Group title={`People mentioned · ${peopleMentioned.length}`} icon={Users} open={open.people} onToggle={() => toggle("people")}>
          {peopleMentioned.length === 0 ? (
            <Empty>No family members detected.</Empty>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {peopleMentioned.map(p => (
                <li key={`${p.kind}:${p.id}`}>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/70 px-2 py-0.5 text-[11px] text-foreground">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    {p.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Group>

        <Group title="AI summary" icon={Sparkles} open={open.ai} onToggle={() => toggle("ai")} shimmer={summaryBusy}>
          {summary ? (
            <div className="rounded-xl border border-border/40 bg-background/60 p-3 text-[13px] leading-relaxed text-foreground/90 shadow-soft">
              <NoteMarkdown body={summary} />
            </div>
          ) : (
            <Empty>Generate a quick summary of this note.</Empty>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full gap-1.5"
            onClick={runSummary}
            disabled={summaryBusy}
          >
            {summaryBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {summary ? "Regenerate" : "Summarize note"}
          </Button>
        </Group>

        <Group title="Suggested actions" icon={ListPlus} open={open.actions} onToggle={() => toggle("actions")}>
          <div className="grid gap-1.5">
            <ActionRow icon={ListPlus} label="Create task for today" onClick={createTaskFromNote} />
            <ActionRow icon={BellPlus} label="Schedule reminder (tomorrow)" onClick={scheduleReminder} />
            <ActionRow icon={ShoppingCart} label="Open grocery list" onClick={() => nav("/home/groceries")} />
            <ActionRow icon={CalendarDays} label="Add to calendar" onClick={() => nav(`/calendar?new=1&title=${encodeURIComponent(title || "")}`)} />
          </div>
        </Group>
      </div>
    </aside>
  );
}

function Group({
  title, icon: Icon, open, onToggle, children, shimmer,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  shimmer?: boolean;
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "mb-1.5 flex w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground",
          shimmer && "relative overflow-hidden",
        )}
      >
        <ChevronRight
          className={cn("h-3 w-3 transition-transform duration-200", open && "rotate-90")}
        />
        <Icon className="h-3 w-3" />
        <span className="flex-1 text-left">{title}</span>
        {shimmer && (
          <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            style={{ overflow: "hidden" }}
          >
            <div className="pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] italic text-muted-foreground/70">{children}</p>;
}

function ActionRow({
  icon: Icon, label, onClick,
}: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-2 py-1.5 text-left text-xs",
        "transition hover:border-primary/40 hover:bg-primary/5",
      )}
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="flex-1">{label}</span>
    </button>
  );
}