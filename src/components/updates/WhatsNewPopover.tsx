import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Entry = {
  id: string;
  title: string;
  summary: string;
  category: "new" | "improved" | "fixed" | "announcement";
  published_at: string | null;
  created_at: string;
};

const labels: Record<Entry["category"], string> = {
  new: "New", improved: "Improved", fixed: "Fixed", announcement: "News",
};

export function WhatsNewPopover() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancel) return;
      setUserId(user.id);
      const [{ data: prof }, { data: rows }] = await Promise.all([
        supabase.from("profiles").select("last_seen_changelog_at").eq("id", user.id).maybeSingle(),
        supabase.from("changelog").select("id,title,summary,category,published_at,created_at")
          .eq("published", true)
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      if (cancel) return;
      setLastSeen((prof as { last_seen_changelog_at: string | null } | null)?.last_seen_changelog_at ?? null);
      setEntries((rows as Entry[]) ?? []);
    })();
    return () => { cancel = true; };
  }, []);

  const latestAt = entries[0]?.published_at ?? entries[0]?.created_at ?? null;
  const hasUnseen = latestAt && (!lastSeen || new Date(latestAt) > new Date(lastSeen));

  const markSeen = async () => {
    if (!userId || !latestAt) return;
    const stamp = new Date().toISOString();
    setLastSeen(stamp);
    await supabase.from("profiles").update({ last_seen_changelog_at: stamp }).eq("id", userId);
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) void markSeen(); }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-full text-primary hover:bg-primary/10 hover:text-primary"
              aria-label="What's new"
            >
              <Sparkles className="h-4 w-4" />
              {hasUnseen && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">What's new</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 p-2" align="end">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="font-display text-sm font-semibold">What's new</div>
          <Link to="/updates" className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            See all →
          </Link>
        </div>
        {entries.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">No updates yet.</p>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {entries.map((e) => {
              const d = parseISO(e.published_at ?? e.created_at);
              return (
                <li key={e.id} className="rounded-md px-2 py-2 hover:bg-muted">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <time>{format(d, "MMM d")}</time>
                    <Badge variant="secondary" className="text-[9px] uppercase tracking-wider">
                      {labels[e.category]}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-xs font-medium">{e.title}</div>
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">{e.summary}</p>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}