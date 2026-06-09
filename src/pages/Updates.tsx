import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

type Entry = {
  id: string;
  title: string;
  summary: string;
  category: "new" | "improved" | "fixed" | "announcement";
  published_at: string | null;
  created_at: string;
};

const categoryLabel: Record<Entry["category"], string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
  announcement: "Announcement",
};

export default function Updates() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "What's New · CareFlow Updates";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Latest CareFlow updates, new features, and improvements.");
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("changelog")
        .select("id,title,summary,category,published_at,created_at")
        .eq("published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setEntries((data as Entry[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          ← CareFlow
        </Link>
        <header className="mt-6 mb-12">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.2em]">Updates</span>
          </div>
          <h1 className="mt-3 font-display text-4xl font-semibold">What's new</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            New features, improvements, and fixes shipped to CareFlow.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates yet — check back soon.</p>
        ) : (
          <ol className="space-y-10 border-l border-border pl-6">
            {entries.map((e) => {
              const date = e.published_at ? parseISO(e.published_at) : parseISO(e.created_at);
              return (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[31px] top-2 h-2 w-2 rounded-full bg-primary" />
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <time dateTime={date.toISOString()}>{format(date, "MMM d, yyyy")}</time>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                      {categoryLabel[e.category]}
                    </Badge>
                  </div>
                  <h2 className="font-display text-xl font-semibold">{e.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                    {e.summary}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}