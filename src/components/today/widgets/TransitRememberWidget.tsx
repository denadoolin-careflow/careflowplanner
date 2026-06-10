import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Sparkles, FileText, BookOpen, ArrowRight, ExternalLink, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TransitItem {
  id: string;
  kind: "note" | "journal";
  title: string;
  date?: string;
  bodyPreview?: string;
  icon?: string;
  rating?: number;
}

function bodyPreview(body?: string, len = 60) {
  if (!body) return undefined;
  const text = body.replace(/[#*_`>\[\]!]/g, "").replace(/\s+/g, " ").trim();
  return text.length > len ? text.slice(0, len).trimEnd() + "…" : text;
}

/** Sidebar widget that surfaces saved transit notes & journal stubs. */
export function TransitRememberWidget() {
  const [items, setItems] = useState<TransitItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setItems([]); setLoading(false); return; }
      const uid = u.user.id;

      const [notesRes, journalRes, reflectionsRes] = await Promise.all([
        (supabase as any)
          .from("notes")
          .select("id, title, date, body, tags, icon, updated_at")
          .eq("user_id", uid)
          .contains("tags", ["cosmic", "transit"])
          .order("updated_at", { ascending: false })
          .limit(6),
        (supabase as any)
          .from("journal_entries")
          .select("id, title, date, body, type, tags, updated_at")
          .eq("user_id", uid)
          .or("type.eq.cosmic, tags.cs.{cosmic,transit}")
          .order("updated_at", { ascending: false })
          .limit(6),
        (supabase as any)
          .from("transit_reflections")
          .select("event_id, rating, note")
          .eq("user_id", uid)
          .not("note", "is", null)
          .order("updated_at", { ascending: false })
          .limit(6),
      ]);

      const out: TransitItem[] = [];
      const seen = new Set<string>();

      (notesRes.data ?? []).forEach((n: any) => {
        const key = `note:${n.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
          id: n.id,
          kind: "note",
          title: n.title || "Transit note",
          date: n.updated_at,
          bodyPreview: bodyPreview(n.body),
          icon: n.icon || "Sparkles",
        });
      });

      (journalRes.data ?? []).forEach((j: any) => {
        const key = `journal:${j.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
          id: j.id,
          kind: "journal",
          title: j.title || "Cosmic journal entry",
          date: j.updated_at,
          bodyPreview: bodyPreview(j.body),
        });
      });

      (reflectionsRes.data ?? []).forEach((r: any) => {
        const key = `reflection:${r.event_id}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
          id: r.event_id,
          kind: "journal",
          title: r.event_id,
          date: undefined,
          bodyPreview: bodyPreview(r.note),
          rating: r.rating,
        });
      });

      out.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });

      setItems(out.slice(0, 5));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  if (loading) {
    return (
      <section className="cozy-card p-4">
        <header className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Transits to remember
        </header>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="cozy-card p-4">
        <header className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Transits to remember
        </header>
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          No saved transits yet. Tap “Save to Notes” or “Save to Journal” on any transit.
        </p>
      </section>
    );
  }

  return (
    <section className="cozy-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <header className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Transits to remember
        </header>
        <Link
          to="/cosmic-flow"
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Cosmic flow <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li
            key={`${it.kind}:${it.id}`}
            className={cn(
              "group flex items-start gap-2 rounded-xl border border-border/40 bg-card/60 px-2.5 py-2 transition-colors hover:bg-muted/40",
            )}
          >
            <span className="mt-0.5 shrink-0 text-primary/80">
              {it.kind === "note" ? <FileText className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[12.5px] font-medium text-foreground">
                  {it.title.startsWith("Transit · ") ? it.title.slice(10) : it.title}
                </span>
                {it.rating ? (
                  <span className="flex shrink-0 items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-2.5 w-2.5",
                          i < it.rating! ? "fill-primary text-primary" : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </span>
                ) : null}
              </div>
              {it.bodyPreview && (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{it.bodyPreview}</p>
              )}
              {it.date && (
                <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                  {format(parseISO(it.date), "MMM d")}
                </p>
              )}
            </div>
            {it.kind === "note" ? (
              <Link
                to={`/notes/${it.id}`}
                className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted/60 hover:text-foreground group-hover:opacity-100"
                title="Open note"
              >
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <Link
                to="/journal"
                className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted/60 hover:text-foreground group-hover:opacity-100"
                title="Open journal"
              >
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
