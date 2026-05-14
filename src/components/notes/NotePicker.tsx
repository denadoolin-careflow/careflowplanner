import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Note } from "@/lib/notes";

interface Props {
  trigger?: React.ReactNode;
  /** IDs of notes already linked, hidden from results. */
  excludeIds?: string[];
  onPick: (note: Note) => void;
  onCreateNew?: () => void;
}

export function NotePicker({ trigger, excludeIds = [], onPick, onCreateNew }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Note[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      const term = q.trim();
      let query = supabase.from("notes").select("*").eq("archived", false).order("updated_at", { ascending: false }).limit(20);
      if (term) query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
      const { data } = await query;
      if (cancelled) return;
      const mapped = (data ?? []).map((r: any) => ({
        id: r.id, userId: r.user_id, title: r.title ?? "", body: r.body ?? "",
        kind: r.kind, date: r.date ?? null, projectId: r.project_id ?? null,
        pinned: !!r.pinned, archived: !!r.archived, createdAt: r.created_at, updatedAt: r.updated_at,
      } as Note)).filter(n => !excludeIds.includes(n.id));
      setResults(mapped);
    }, 150);
    return () => { cancelled = true; clearTimeout(id); };
  }, [q, open, excludeIds.join(",")]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? <Button size="sm" variant="outline" className="h-7 gap-1.5 rounded-full text-xs"><Plus className="h-3 w-3" /> Link a note</Button>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <Input autoFocus placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 text-xs" />
        <ScrollArea className="mt-2 h-64">
          {results.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">{q ? "No notes found." : "Type to search."}</div>
          ) : (
            <ul className="space-y-0.5">
              {results.map(n => (
                <li key={n.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60"
                    onClick={() => { onPick(n); setOpen(false); setQ(""); }}
                  >
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{n.title || "Untitled"}</span>
                      {n.body && <span className="block truncate text-[10px] text-muted-foreground">{n.body.slice(0, 80)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        {onCreateNew && (
          <Button size="sm" variant="ghost" className="mt-1 w-full gap-1.5 text-xs" onClick={() => { onCreateNew(); setOpen(false); }}>
            <Plus className="h-3.5 w-3.5" /> New note &amp; link
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}