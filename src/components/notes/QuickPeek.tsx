import { useEffect, useMemo, useState } from "react";
import { Link as RRLink } from "react-router-dom";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import {
  ExternalLink, FileText, Folder, CheckCircle2, Users, CalendarDays,
  Utensils, Sparkles, Hash, Link2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { listNotes, type Note } from "@/lib/notes";
import { NoteMarkdownPreview } from "@/components/notes/NoteMarkdownPreview";

export type PeekType =
  | "note" | "task" | "project" | "person" | "event"
  | "recipe" | "goal" | "habit" | "area" | "tag" | "wiki";

interface PeekPayload {
  title: string;
  subtitle?: string;
  body?: string;
  href?: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}

function usePeekPayload(type: PeekType, id: string): PeekPayload | null {
  const { state } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    if (type !== "wiki" && type !== "note") return;
    let cancelled = false;
    void listNotes().then((arr) => { if (!cancelled) setNotes(arr); }).catch(() => {});
    return () => { cancelled = true; };
  }, [type]);

  return useMemo<PeekPayload | null>(() => {
    const key = decodeURIComponent(id);
    switch (type) {
      case "task": {
        const t = (state.tasks ?? []).find(x => x.id === key || x.title === key);
        if (!t) return null;
        return { title: t.title, subtitle: t.status === "done" ? "Completed" : (t.due ? `Due ${t.due}` : "Task"), href: "/anytime", Icon: CheckCircle2 };
      }
      case "project": {
        const p = (state.projects ?? []).find(x => x.id === key || x.name === key);
        if (!p) return null;
        return { title: p.name, subtitle: "Project", href: `/projects/${p.id}`, Icon: Folder };
      }
      case "person": {
        const r = (state.recipients ?? []).find(x => x.id === key || x.name === key);
        if (!r) return null;
        return { title: r.name, subtitle: r.relation ?? "Person", href: "/caregiving", Icon: Users };
      }
      case "event": {
        const a = (state.appointments ?? []).find(x => x.id === key || x.title === key);
        if (!a) return null;
        return { title: a.title, subtitle: a.startTime ? `${a.date} · ${a.startTime}` : a.date, href: "/calendar", Icon: CalendarDays };
      }
      case "recipe": {
        const m = (state.meals ?? []).find(x => x.id === key || x.name === key);
        if (!m) return null;
        return { title: m.name, subtitle: "Meal", href: "/meals", Icon: Utensils };
      }
      case "goal": {
        const g = (state.goals ?? []).find(x => x.id === key || x.title === key);
        if (!g) return null;
        return { title: g.title, subtitle: "Goal", href: "/goals", Icon: Sparkles };
      }
      case "habit": {
        const h = (state.habits ?? []).find(x => x.id === key || x.title === key);
        if (!h) return null;
        return { title: h.title, subtitle: "Habit", href: "/habits", Icon: Sparkles };
      }
      case "area": {
        const a = (state.areas ?? []).find(x => x.id === key || x.name === key);
        if (!a) return null;
        return { title: a.name, subtitle: "Area", href: `/areas/${a.id}`, Icon: Folder };
      }
      case "tag":
        return { title: `#${key}`, subtitle: "Tag", href: `/tags/${encodeURIComponent(key)}`, Icon: Hash };
      case "note":
      case "wiki": {
        const n = notes.find(x => x.id === key || x.title.toLowerCase() === key.toLowerCase());
        if (!n) return { title: key, subtitle: "Not found · Create note", href: `/notes?q=${encodeURIComponent(key)}`, Icon: FileText };
        return { title: n.title || "Untitled", subtitle: "Note", body: n.body, href: `/notes/${n.id}`, Icon: FileText };
      }
      default:
        return null;
    }
  }, [type, id, state, notes]);
}

/**
 * Universal quick-peek wrapper. Wrap any element with an entity type + id and
 * hovering it opens a floating summary card with an "Open" action.
 */
export function QuickPeek({
  type,
  id,
  children,
  side = "top",
  openDelay = 220,
}: {
  type: PeekType;
  id: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  openDelay?: number;
}) {
  const payload = usePeekPayload(type, id);
  return (
    <HoverCard openDelay={openDelay} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align="start"
        sideOffset={8}
        className="w-72 overflow-hidden rounded-2xl border-border/60 bg-popover/95 p-0 shadow-xl backdrop-blur animate-in fade-in-0 zoom-in-95"
      >
        {!payload ? (
          <div className="p-3 text-xs text-muted-foreground">Preview unavailable.</div>
        ) : (
          <div className="space-y-2 p-3.5">
            <div className="flex items-start gap-2">
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary")}>
                <payload.Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 font-display text-sm font-semibold leading-snug">{payload.title}</div>
                {payload.subtitle && (
                  <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{payload.subtitle}</div>
                )}
              </div>
            </div>
            {payload.body && (
              <div className="max-h-32 overflow-hidden text-[12.5px] leading-relaxed text-muted-foreground">
                <NoteMarkdownPreview body={payload.body} maxChars={280} />
              </div>
            )}
            {payload.href && (
              <div className="flex items-center justify-end border-t border-border/40 pt-2">
                <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                  <RRLink to={payload.href}>
                    <ExternalLink className="h-3 w-3" /> Open
                  </RRLink>
                </Button>
              </div>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Convenience: infer PeekType from an internal href, so callers can wrap
 * arbitrary links.
 */
export function inferPeek(href: string): { type: PeekType; id: string } | null {
  const m = href.match(/^\/([^/?#]+)(?:\/([^/?#]+))?/);
  if (!m) return null;
  const [, seg, rest] = m;
  switch (seg) {
    case "notes": return rest ? { type: "note", id: rest } : null;
    case "projects": return rest ? { type: "project", id: rest } : null;
    case "areas": return rest ? { type: "area", id: rest } : null;
    case "tags": return rest ? { type: "tag", id: rest } : null;
    case "goals": return { type: "goal", id: rest ?? "" };
    case "habits": return { type: "habit", id: rest ?? "" };
    case "meals": return { type: "recipe", id: rest ?? "" };
    case "calendar": return { type: "event", id: rest ?? "" };
    default: return null;
  }
}