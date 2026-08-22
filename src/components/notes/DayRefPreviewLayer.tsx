/**
 * Hover/tap preview cards for inline day references (`@today`, `@Aug 20`).
 *
 * The editor writes these as links to `/planner/<iso>`; this delegated layer
 * turns a hover into a formatted card with the day's scheduled items and any
 * note/journal snippet, so a date reference reads like a preview instead of a
 * bare link. Mounted once near the app root.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { CalendarDays, Clock, StickyNote } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const CARD_W = 300;
const CARD_H = 250;

export function DayRefPreviewLayer() {
  const [state, setState] = useState<{ iso: string; rect: DOMRect } | null>(null);
  const closeTimer = useRef<number | null>(null);
  const isTouch = useRef(false);

  useEffect(() => {
    isTouch.current = window.matchMedia?.("(hover: none)").matches ?? false;
  }, []);

  const clearClose = () => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const scheduleClose = () => {
    clearClose();
    closeTimer.current = window.setTimeout(() => setState(null), 160);
  };

  useEffect(() => {
    const isoFrom = (a: HTMLAnchorElement): string | null => {
      const m = (a.getAttribute("href") || "").match(/^\/planner\/(\d{4}-\d{2}-\d{2})$/);
      return m ? m[1] : null;
    };
    const anchorAt = (e: Event) =>
      ((e.target as HTMLElement | null)?.closest?.("a[href^='/planner/']") as HTMLAnchorElement | null);

    const onOver = (e: MouseEvent) => {
      if (isTouch.current) return;
      const a = anchorAt(e);
      if (!a) return;
      const iso = isoFrom(a);
      if (!iso) return;
      clearClose();
      setState({ iso, rect: a.getBoundingClientRect() });
    };
    const onOut = (e: MouseEvent) => {
      if (!anchorAt(e)) return;
      scheduleClose();
    };
    const onClick = (e: MouseEvent) => {
      if (!isTouch.current) return;
      const a = anchorAt(e);
      if (!a) return;
      const iso = isoFrom(a);
      if (!iso) return;
      if (state?.iso === iso) return; // second tap navigates
      e.preventDefault();
      e.stopPropagation();
      setState({ iso, rect: a.getBoundingClientRect() });
    };
    const onScroll = () => setState(null);

    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      clearClose();
    };
  }, [state]);

  if (!state) return null;

  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const preferAbove = state.rect.top > CARD_H + 40;
  const top = preferAbove
    ? Math.max(margin, state.rect.top - margin - CARD_H)
    : Math.min(vh - margin - CARD_H, state.rect.bottom + margin);
  let left = state.rect.left + state.rect.width / 2 - CARD_W / 2;
  left = Math.max(margin, Math.min(vw - margin - CARD_W, left));

  return createPortal(
    <div
      role="tooltip"
      onMouseEnter={clearClose}
      onMouseLeave={scheduleClose}
      style={{ position: "fixed", top, left, width: CARD_W, zIndex: 80 }}
      className="overflow-hidden rounded-2xl border border-border/70 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
    >
      <DayPreviewCard iso={state.iso} onNavigate={() => setState(null)} />
    </div>,
    document.body,
  );
}

/** The formatted day card — also reusable outside the hover layer. */
export function DayPreviewCard({ iso, onNavigate }: { iso: string; onNavigate?: () => void }) {
  const { state } = useStore() as any;
  const date = useMemo(() => {
    const d = parseISO(iso);
    return isValid(d) ? d : null;
  }, [iso]);

  const tasks = useMemo(() => {
    const list = (state.tasks ?? []).filter((t: any) => !t.deletedAt && (t.dueDate === iso || t.startDate === iso));
    return list
      .slice()
      .sort((a: any, b: any) => (a.startTime ?? "zz").localeCompare(b.startTime ?? "zz"))
      .slice(0, 5);
  }, [state.tasks, iso]);

  const note = useMemo(() => {
    const notes = (state.notes ?? []) as any[];
    return notes.find(n => (n.date ?? "").startsWith(iso) || (n.createdAt ?? "").startsWith(iso)) ?? null;
  }, [state.notes, iso]);

  const journal = useMemo(() => {
    const j = (state.journal ?? []) as any[];
    return j.find(e => (e.date ?? "").startsWith(iso)) ?? null;
  }, [state.journal, iso]);

  const snippet = (raw: unknown) =>
    String(raw ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/[#*_>`-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140);

  return (
    <div className="p-3">
      <div className="mb-2 flex items-baseline gap-2">
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <div className="truncate font-display text-sm font-semibold">
            {date ? format(date, "EEEE, MMMM d") : iso}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {tasks.length ? `${tasks.length} item${tasks.length === 1 ? "" : "s"} planned` : "Nothing planned yet"}
          </div>
        </div>
      </div>

      {tasks.length > 0 && (
        <ul className="mb-2 space-y-1">
          {tasks.map((t: any) => (
            <li key={t.id} className={cn("flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-[12px]", t.done && "opacity-60 line-through")}>
              {t.startTime && (
                <span className="inline-flex items-center gap-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" aria-hidden />{t.startTime}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
            </li>
          ))}
        </ul>
      )}

      {(note || journal) && (
        <div className="mb-2 rounded-md border border-border/60 bg-background/60 p-2">
          <div className="mb-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <StickyNote className="h-3 w-3" aria-hidden />
            {note ? "Note" : "Journal"}
          </div>
          <p className="text-[12px] leading-snug text-muted-foreground">
            {snippet(note?.body ?? note?.content ?? journal?.content ?? journal?.body) || "No text yet."}
          </p>
        </div>
      )}

      <Link
        to={`/planner/${iso}`}
        onClick={() => onNavigate?.()}
        className="inline-flex text-[11px] font-medium text-primary hover:underline"
      >
        Open this day →
      </Link>
    </div>
  );
}
