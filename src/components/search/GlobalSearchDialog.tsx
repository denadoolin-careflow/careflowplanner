import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  Search, FileText, CheckSquare, Folder, Hash, Sparkles, Calendar,
  Mic, ShoppingBasket, Plus, ArrowRight, CornerDownLeft, Compass,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useTags } from "@/hooks/use-tags";
import { upcomingEvents, type CosmicEvent } from "@/lib/cosmic/events";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";
import { NAV, NAV_GROUPS, NAV_DESCRIPTIONS } from "@/lib/nav";
import { toast } from "sonner";

type ResultKind = "page" | "task" | "note" | "project" | "tag" | "event" | "appointment";

export type SearchResult = {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle?: string;
  body?: string;
  to: string;
  tags?: string[];
  meta?: string;
  raw?: any;
};

const KIND_LABEL: Record<ResultKind, string> = {
  page: "Pages",
  task: "Tasks",
  note: "Notes",
  project: "Projects",
  tag: "Tags",
  event: "Astrology",
  appointment: "Events",
};

const KIND_ICON: Record<ResultKind, React.ComponentType<{ className?: string }>> = {
  page: Compass,
  task: CheckSquare,
  note: FileText,
  project: Folder,
  tag: Hash,
  event: Sparkles,
  appointment: Calendar,
};

/** Common synonyms users may type to find a page. */
const PAGE_KEYWORDS: Record<string, string[]> = {
  "/wealth": ["money", "finances", "budget", "spending", "accounts"],
  "/inbox": ["capture", "tasks", "todo", "to do"],
  "/today": ["agenda", "now", "day"],
  "/calendar": ["schedule", "agenda", "events"],
  "/pantry": ["groceries", "shopping", "inventory", "fridge"],
  "/meals": ["food", "recipes", "dinner", "lunch", "breakfast"],
  "/meals/library": ["recipes", "cookbook"],
  "/health": ["fitness", "wellness", "energy", "mood", "sleep"],
  "/habits": ["streak", "routine", "daily"],
  "/journal": ["diary", "write", "writing"],
  "/notes": ["docs", "documents", "knowledge"],
  "/whiteboards": ["canvas", "board"],
  "/graph": ["knowledge graph", "connections", "map"],
  "/goals": ["objectives", "milestones"],
  "/focus": ["pomodoro", "timer", "deep work"],
  "/mental-load": ["invisible work", "fairplay"],
  "/family": ["household", "members", "sharing"],
  "/caregiving": ["caregiver", "elder", "care plan"],
  "/care": ["care loop", "care hub"],
  "/automations": ["rules", "triggers", "workflows"],
  "/settings": ["preferences", "account", "config", "options"],
  "/trips": ["travel", "vacation", "packing"],
  "/routines": ["rituals", "checklist"],
  "/home-areas": ["rooms", "zones", "house"],
  "/cosmic-flow": ["astrology", "moon", "transits", "horoscope", "zodiac"],
  "/seasons": ["holidays", "celebrations", "birthdays"],
  "/memories": ["memory book", "moments", "photos"],
  "/logbook": ["completed", "done", "history"],
  "/review": ["reflect", "retrospective"],
  "/rhythm": ["lunar", "moon", "seasonal"],
  "/upcoming": ["next", "later"],
  "/anytime": ["someday", "no date"],
  "/someday": ["maybe", "later", "ideas"],
  "/not-today": ["snoozed", "skip"],
};

type PageEntry = { to: string; label: string; group?: string; description?: string; keywords?: string[]; icon: React.ComponentType<{ className?: string }> };

/** Build a deduped, searchable list of all pages from NAV + NAV_GROUPS. */
function buildPageIndex(): PageEntry[] {
  const map = new Map<string, PageEntry>();
  // Start with top-level NAV (icon authority)
  for (const n of NAV) {
    map.set(n.to, {
      to: n.to,
      label: n.label,
      description: NAV_DESCRIPTIONS[n.to],
      keywords: PAGE_KEYWORDS[n.to],
      icon: n.icon,
    });
  }
  // Augment with grouped nav (adds pages, group context)
  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      const prev = map.get(it.to);
      map.set(it.to, {
        to: it.to,
        label: prev?.label ?? it.label,
        group: g.label,
        description: NAV_DESCRIPTIONS[it.to] ?? prev?.description,
        keywords: PAGE_KEYWORDS[it.to] ?? prev?.keywords,
        icon: prev?.icon ?? it.icon,
      });
    }
  }
  return Array.from(map.values());
}

const PAGE_INDEX: PageEntry[] = buildPageIndex();

function highlight(text: string, term: string): React.ReactNode {
  if (!term) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/20 px-0.5 text-foreground">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export function GlobalSearchDialog({
  open, onOpenChange, onBrainDump,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onBrainDump?: () => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [noteHits, setNoteHits] = useState<Array<{ id: string; title: string; body: string; tags: string[] | null }>>([]);
  const navigate = useNavigate();
  const { state, addGrocery } = useStore();
  const { tags } = useTags();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const term = q.trim();
  const lc = term.toLowerCase();
  const m = (s?: string | null) => !!s && s.toLowerCase().includes(lc);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Async note search (title + body)
  useEffect(() => {
    if (!open || lc.length < 2) { setNoteHits([]); return; }
    let cancelled = false;
    const id = window.setTimeout(async () => {
      const t = term.replace(/[%,]/g, " ");
      const { data } = await supabase
        .from("notes")
        .select("id,title,body,tags")
        .or(`title.ilike.%${t}%,body.ilike.%${t}%`)
        .limit(12);
      if (!cancelled) setNoteHits((data ?? []) as any);
    }, 160);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [term, lc, open]);

  // Cosmic events (next 60 days) — built once when opened.
  const cosmic = useMemo<CosmicEvent[]>(() => (open ? upcomingEvents(new Date(), 60) : []), [open]);

  const results = useMemo<SearchResult[]>(() => {
    if (!lc) return [];
    const out: SearchResult[] = [];

    // Pages — always searched, so users can jump anywhere
    for (const p of PAGE_INDEX) {
      const kw = (p.keywords ?? []).join(" ");
      if (m(p.label) || m(p.description) || m(p.group) || m(p.to) || m(kw)) {
        out.push({
          id: `page:${p.to}`,
          kind: "page",
          title: p.label,
          subtitle: [p.group, p.description].filter(Boolean).join(" · ") || undefined,
          to: p.to,
          raw: p,
        });
      }
    }

    // Tags
    for (const t of tags) {
      if (m(t.name) || m(t.description)) {
        out.push({
          id: `tag:${t.id}`, kind: "tag", title: t.name,
          subtitle: t.description ?? undefined,
          to: `/tags/${encodeURIComponent(t.name)}`,
          raw: t,
        });
      }
    }

    // Tasks
    for (const t of state.tasks ?? []) {
      if (m(t.title) || m(t.notes) || (t.tags ?? []).some((x: string) => m(x))) {
        out.push({
          id: `task:${t.id}`, kind: "task", title: t.title,
          subtitle: t.notes ?? undefined,
          body: t.notes ?? undefined,
          tags: t.tags ?? [],
          meta: t.dueDate ?? undefined,
          to: t.inbox ? "/inbox" : t.dueDate ? "/upcoming" : "/anytime",
          raw: t,
        });
      }
    }

    // Notes (from async DB hits — covers content search)
    for (const n of noteHits) {
      out.push({
        id: `note:${n.id}`, kind: "note", title: n.title || "Untitled",
        subtitle: (n.body || "").replace(/[#*_`>\-]/g, " ").slice(0, 140),
        body: n.body ?? "",
        tags: n.tags ?? [],
        to: `/notes/${n.id}`,
        raw: n,
      });
    }

    // Projects
    for (const p of state.projects ?? []) {
      if (p.archivedAt) continue;
      if (m(p.name) || m((p as any).notes) || m((p as any).aiOverview)) {
        out.push({
          id: `project:${p.id}`, kind: "project", title: p.name,
          subtitle: (p as any).notes ?? (p as any).aiOverview ?? undefined,
          body: (p as any).aiOverview ?? (p as any).notes ?? undefined,
          to: `/projects/${p.id}`,
          raw: p,
        });
      }
    }

    // Appointments
    for (const a of state.appointments ?? []) {
      if (m(a.title) || m(a.location) || m((a as any).notes)) {
        out.push({
          id: `appt:${a.id}`, kind: "appointment", title: a.title,
          subtitle: [a.location, (a as any).notes].filter(Boolean).join(" · ") || undefined,
          body: (a as any).notes ?? undefined,
          meta: `${a.date}${a.time ? ` · ${a.time}` : ""}`,
          to: "/calendar",
          raw: a,
        });
      }
    }

    // Cosmic / astrology events
    for (const e of cosmic) {
      if (m(e.title) || m(e.subtitle) || m(e.planet) || m(e.sign)) {
        out.push({
          id: `cosmic:${e.id}`, kind: "event", title: `${e.glyph} ${e.title}`,
          subtitle: e.subtitle,
          meta: e.date,
          to: `/cosmic-flow/event/${e.id}`,
          raw: e,
        });
      }
    }

    // Light ranking: title-prefix > title-match > other
    return out
      .map(r => {
        const t = r.title.toLowerCase();
        let score = 0;
        if (t.startsWith(lc)) score += 10;
        else if (t.includes(lc)) score += 5;
        if (r.kind === "tag") score += 2; // tags are short, surface them
        if (r.kind === "page") score += 6; // surface navigation prominently
        return { r, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(x => x.r)
      .slice(0, 60);
  }, [lc, tags, state.tasks, state.projects, state.appointments, noteHits, cosmic]);

  // Group results in render order
  const grouped = useMemo(() => {
    const order: ResultKind[] = ["page", "task", "note", "project", "tag", "appointment", "event"];
    const map = new Map<ResultKind, SearchResult[]>();
    for (const r of results) {
      const arr = map.get(r.kind) ?? [];
      arr.push(r);
      map.set(r.kind, arr);
    }
    return order
      .map(k => ({ kind: k, items: map.get(k) ?? [] }))
      .filter(g => g.items.length > 0);
  }, [results]);

  // Flat list (same order as grouped) for keyboard nav
  const flat = useMemo(() => grouped.flatMap(g => g.items), [grouped]);
  const selected = flat[Math.min(active, Math.max(flat.length - 1, 0))];

  useEffect(() => { setActive(0); }, [lc]);

  // Ensure selected item is visible
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(i => Math.min(i + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selected) {
      e.preventDefault();
      go(selected.to);
    }
  };

  const go = (to: string) => {
    onOpenChange(false);
    setQ("");
    navigate(to);
  };

  const addToGrocery = async () => {
    const name = term;
    if (!name) return;
    await addGrocery(name);
    toast(`Added “${name}” to grocery list`);
    setQ("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl gap-0 overflow-hidden p-0 sm:rounded-2xl"
        onKeyDown={onKeyDown}
      >
        <div className="grid h-[min(80vh,640px)] grid-cols-1 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {/* Left: search + results */}
          <div className="flex min-w-0 flex-col border-r border-border/60 bg-card/40">
            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search tasks, notes, tags, projects, events…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden rounded border border-border/60 bg-muted/50 px-1.5 text-[10px] font-mono text-muted-foreground sm:inline">ESC</kbd>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto px-2 py-2">
              {!term ? (
                <EmptyHints onBrainDump={onBrainDump ? () => { onOpenChange(false); onBrainDump(); } : undefined} />
              ) : flat.length === 0 ? (
                <div className="space-y-2 px-2 py-6 text-center text-xs text-muted-foreground">
                  <p>No matches for “{term}”.</p>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={addToGrocery}>
                    <ShoppingBasket className="h-3.5 w-3.5" /> Add to grocery list
                  </Button>
                </div>
              ) : (
                grouped.map(group => {
                  const Icon = KIND_ICON[group.kind];
                  return (
                    <div key={group.kind} className="mb-2">
                      <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                        {KIND_LABEL[group.kind]}
                      </div>
                      <ul>
                        {group.items.map(r => {
                          const idx = flat.indexOf(r);
                          const isActive = idx === active;
                          return (
                            <li key={r.id}>
                              <button
                                type="button"
                                data-idx={idx}
                                onMouseEnter={() => setActive(idx)}
                                onClick={() => go(r.to)}
                                className={cn(
                                  "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                                  isActive ? "bg-primary/10 text-foreground" : "hover:bg-muted/60",
                                )}
                              >
                                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium">{highlight(r.title, term)}</span>
                                  {r.subtitle && (
                                    <span className="block truncate text-[11px] text-muted-foreground/80">
                                      {highlight(r.subtitle, term)}
                                    </span>
                                  )}
                                </span>
                                {r.meta && <span className="shrink-0 text-[10px] text-muted-foreground/70">{r.meta}</span>}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })
              )}
            </div>

            <footer className="flex items-center gap-3 border-t border-border/60 bg-card/60 px-3 py-1.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/60 bg-muted/50 px-1 font-mono">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/60 bg-muted/50 px-1 font-mono"><CornerDownLeft className="inline h-2.5 w-2.5" /></kbd> Open
              </span>
              <span className="ml-auto">{flat.length} result{flat.length === 1 ? "" : "s"}</span>
            </footer>
          </div>

          {/* Right: preview */}
          <div className="hidden min-w-0 flex-col overflow-hidden md:flex">
            {selected ? <Preview r={selected} onOpen={() => go(selected.to)} /> : <PreviewEmpty hasQuery={!!term} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Preview({ r, onOpen }: { r: SearchResult; onOpen: () => void }) {
  const Icon = KIND_ICON[r.kind];
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-3 border-b border-border/60 px-5 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{KIND_LABEL[r.kind]}</p>
          <h2 className="line-clamp-2 font-display text-base font-semibold leading-snug">{r.title}</h2>
          {r.meta && <p className="mt-0.5 text-[11px] text-muted-foreground">{r.meta}</p>}
        </div>
        <Button size="sm" className="gap-1.5 rounded-xl" onClick={onOpen}>
          Open <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </header>

      <ScrollArea className="min-h-0 flex-1 px-5 py-4">
        {r.tags && r.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {r.tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                <Hash className="h-2.5 w-2.5" /> {t}
              </span>
            ))}
          </div>
        )}

        {r.kind === "note" && r.body ? (
          <NoteMarkdown body={r.body} />
        ) : r.kind === "project" && r.body ? (
          <NoteMarkdown body={r.body} />
        ) : r.kind === "event" ? (
          <EventPreview event={r.raw} />
        ) : r.kind === "task" ? (
          <TaskPreview task={r.raw} />
        ) : r.kind === "appointment" ? (
          <AppointmentPreview appt={r.raw} />
        ) : r.kind === "tag" ? (
          <TagPreview tag={r.raw} />
        ) : (
          <p className="text-sm italic text-muted-foreground">No preview available.</p>
        )}
      </ScrollArea>
    </div>
  );
}

function PreviewEmpty({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <Search className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">
        {hasQuery ? "Select a result to preview" : "Search across your second brain"}
      </p>
      <p className="max-w-xs text-xs text-muted-foreground/70">
        Tasks, notes, tags, projects, calendar events, and astrology — all in one place.
      </p>
    </div>
  );
}

function EmptyHints({ onBrainDump }: { onBrainDump?: () => void }) {
  return (
    <div className="space-y-3 px-1 py-2">
      {onBrainDump && (
        <button
          type="button"
          onClick={onBrainDump}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-muted/60"
        >
          <Mic className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">Brain dump (voice capture)</span>
          <kbd className="ml-auto rounded border border-border/60 bg-muted/50 px-1.5 text-[10px] font-mono">⌘K</kbd>
        </button>
      )}
      <div className="px-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">Tips</div>
      <ul className="space-y-1 px-2 text-xs text-muted-foreground">
        <li>• Type to search tasks, notes, tags, projects, calendar, and astrology.</li>
        <li>• ↑↓ navigate · Enter to open · Esc to close.</li>
      </ul>
    </div>
  );
}

function TaskPreview({ task }: { task: any }) {
  if (!task) return null;
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {task.dueDate && <span>Due {task.dueDate}</span>}
        {task.completed && <span className="text-emerald-600">Completed</span>}
        {task.inbox && <span>Inbox</span>}
      </div>
      {task.notes ? <NoteMarkdown body={task.notes} /> : <p className="italic text-muted-foreground">No notes.</p>}
    </div>
  );
}

function AppointmentPreview({ appt }: { appt: any }) {
  if (!appt) return null;
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>{appt.date}{appt.time ? ` · ${appt.time}` : ""}</span>
        {appt.location && <span>{appt.location}</span>}
      </div>
      {appt.notes ? <NoteMarkdown body={appt.notes} /> : <p className="italic text-muted-foreground">No notes.</p>}
    </div>
  );
}

function TagPreview({ tag }: { tag: any }) {
  if (!tag) return null;
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-block h-4 w-4 rounded-full" style={{ background: tag.color }} />
        <span className="font-medium">{tag.name}</span>
      </div>
      {tag.description ? <p>{tag.description}</p> : <p className="italic text-muted-foreground">No description yet.</p>}
    </div>
  );
}

function EventPreview({ event }: { event: CosmicEvent | undefined }) {
  if (!event) return null;
  const pretty = (() => { try { return format(parseISO(event.date), "EEEE, MMMM d, yyyy"); } catch { return event.date; } })();
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" /> {pretty}
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
        <div className="text-3xl">{event.glyph}</div>
        <p className="mt-2 font-display text-lg font-semibold">{event.title}</p>
        {event.subtitle && <p className="mt-1 text-sm text-muted-foreground">{event.subtitle}</p>}
        {(event.planet || event.sign) && (
          <p className="mt-2 text-xs text-muted-foreground">
            {event.planet && <>Planet: {event.planet} </>}
            {event.sign && <> · Sign: {event.sign}</>}
          </p>
        )}
      </div>
    </div>
  );
}