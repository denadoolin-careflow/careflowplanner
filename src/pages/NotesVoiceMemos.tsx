import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Mic, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listVoiceMemos, type VoiceMemoRow } from "@/lib/voice-memos";
import { VoiceMemoCard } from "@/components/notes/VoiceMemoCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NotesVoiceMemos() {
  const [memos, setMemos] = useState<VoiceMemoRow[] | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("new");

  const load = () => listVoiceMemos().then(setMemos).catch(() => setMemos([]));
  useEffect(() => {
    void load();
    const ch = supabase.channel(`voice-memos-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_memos" }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const ids = [...new Set((memos ?? []).map((m) => m.note_id).filter(Boolean))] as string[];
    if (!ids.length) return;
    (supabase as any).from("notes").select("id, title").in("id", ids).then(({ data }: any) => {
      setTitles(Object.fromEntries((data ?? []).map((n: any) => [n.id, n.title || "Untitled note"])));
    });
  }, [memos]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const now = Date.now();
    let list = (memos ?? []).filter((m) => {
      if (needle && !`${m.transcript ?? ""} ${m.summary ?? ""}`.toLowerCase().includes(needle)) return false;
      if (filter === "transcribed" && !m.transcript) return false;
      if (filter === "untranscribed" && m.transcript) return false;
      if (filter === "week" && now - new Date(m.created_at).getTime() > 7 * 864e5) return false;
      if (filter === "month" && now - new Date(m.created_at).getTime() > 30 * 864e5) return false;
      return true;
    });
    if (sort === "old") list = [...list].reverse();
    return list;
  }, [memos, q, filter, sort]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 pb-28">
      <header className="flex items-center gap-2">
        <Mic className="h-5 w-5 text-primary" aria-hidden />
        <h1 className="font-display text-2xl text-foreground">Voice memos</h1>
        {memos && <span className="ml-auto text-sm text-muted-foreground">{memos.length} total</span>}
      </header>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transcripts and summaries" className="h-11 pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-11 w-full sm:w-44" aria-label="Filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All memos</SelectItem>
              <SelectItem value="transcribed">Has transcript</SelectItem>
              <SelectItem value="untranscribed">No transcript</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-11 w-full sm:w-36" aria-label="Sort"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Newest first</SelectItem>
              <SelectItem value="old">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {memos === null ? <p className="text-sm text-muted-foreground">Loading…</p>
        : shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {memos.length ? "No memos match." : "No voice memos yet. Record one from the mic button in any note."}
          </p>
        ) : shown.map((m) => (
          <div key={m.id} className="space-y-1">
            <p className="text-xs text-muted-foreground">{format(new Date(m.created_at), "EEE, MMM d yyyy · h:mm a")}</p>
            <VoiceMemoCard path={m.path} memo={m}
              onDeleted={() => setMemos((list) => (list ?? []).filter((x) => x.id !== m.id))}
              footer={
                <div className="mt-2 text-xs">
                  {m.note_id ? (
                    <Link to={`/notes/${m.note_id}`} className="font-medium text-primary hover:underline">
                      Open in “{titles[m.note_id] ?? "note"}”
                    </Link>
                  ) : <span className="text-muted-foreground">Not in a note</span>}
                </div>
              } />
          </div>
        ))}
    </div>
  );
}
