import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";
import {
  Sparkles, CheckSquare, CalendarDays, Users, ListPlus, ShoppingCart,
  BellPlus, Loader2, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore, todayISO } from "@/lib/store";
import { aiInvoke } from "@/lib/ai-invoke";
import { openTaskEditor } from "@/lib/open-task-editor";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";

interface Props {
  noteId: string;
  title: string;
  body: string;
  tags: string[];
  projectId?: string | null;
}

function stripMd(s: string): string {
  return (s || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

export function NoteIntelligencePanel({ noteId, title, body, tags, projectId }: Props) {
  const { state, addTask } = useStore();
  const nav = useNavigate();
  const bodyLc = (body || "").toLowerCase();
  const titleLc = (title || "").toLowerCase();
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

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
    tasks: true, events: true, people: true, ai: true, actions: true,
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

  return (
    <aside className="flex w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur">
      <header className="border-b border-border/40 px-4 py-3">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Intelligence
        </h2>
        <p className="text-[10px] text-muted-foreground">Context pulled from your CareFlow.</p>
      </header>

      <div className="space-y-4 p-4">
        <Group title={`Related tasks · ${relatedTasks.length}`} icon={CheckSquare} open={open.tasks} onToggle={() => toggle("tasks")}>
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

        <Group title="AI summary" icon={Sparkles} open={open.ai} onToggle={() => toggle("ai")}>
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
  title, icon: Icon, open, onToggle, children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        className="mb-1.5 flex w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Icon className="h-3 w-3" />
        <span className="flex-1 text-left">{title}</span>
      </button>
      {open && <div>{children}</div>}
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