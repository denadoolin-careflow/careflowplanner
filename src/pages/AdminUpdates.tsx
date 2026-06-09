import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles, Plus, Trash2, Save, Upload, Eye, EyeOff, Layers } from "lucide-react";

type Category = "new" | "improved" | "fixed" | "announcement";
type Entry = {
  id: string;
  title: string;
  summary: string;
  category: Category;
  published: boolean;
  published_at: string | null;
  created_at: string;
};

export default function AdminUpdates() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [commitsText, setCommitsText] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [since, setSince] = useState<string>("");
  const [maxRange, setMaxRange] = useState<string>("30");
  const [batching, setBatching] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(Boolean(data));
    })();
  }, []);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("changelog")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setEntries((data as Entry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  const createDraft = async (
    initial: Partial<Entry> = { title: "Untitled update", summary: "", category: "new" },
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("changelog")
      .insert({
        title: initial.title ?? "Untitled update",
        summary: initial.summary ?? "",
        category: initial.category ?? "new",
        published: false,
        created_by: user?.id,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setEntries((es) => [data as Entry, ...es]);
    toast.success("Draft created");
  };

  const summarize = async () => {
    if (!commitsText.trim()) { toast.error("Paste some commit messages first"); return; }
    setSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("changelog-summarize", {
        body: { text: commitsText },
      });
      if (error) throw error;
      await createDraft({ title: data.title, summary: data.summary, category: data.category });
      setCommitsText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to summarize");
    } finally {
      setSummarizing(false);
    }
  };

  const pullCommits = async () => {
    setPulling(true);
    try {
      const body: Record<string, unknown> = {};
      if (since) body.since = since;
      if (maxRange === "all") body.all = true;
      else body.maxCommits = Number(maxRange);
      const { data, error } = await supabase.functions.invoke("changelog-pull-commits", { body });
      if (error) throw error;
      toast.success(`Fetched ${data.fetched} commits (${data.inserted} new)`);
      const { data: rows } = await supabase
        .from("changelog_raw_commits")
        .select("message")
        .is("included_in_entry_id", null)
        .order("committed_at", { ascending: false })
        .limit(Math.min(100, data.fetched || 30));
      if (rows?.length) {
        setCommitsText(rows.map((r) => r.message).join("\n"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to pull commits. Configure GITHUB_TOKEN and GITHUB_REPO secrets.");
    } finally {
      setPulling(false);
    }
  };

  const summarizeAllInBatches = async () => {
    setBatching(true);
    setBatchProgress(null);
    try {
      const { data: rows, error } = await supabase
        .from("changelog_raw_commits")
        .select("id, message, committed_at")
        .is("included_in_entry_id", null)
        .order("committed_at", { ascending: true });
      if (error) throw error;
      if (!rows?.length) { toast.error("No pending commits to summarize"); return; }

      const BATCH = 40;
      const batches: typeof rows[] = [];
      for (let i = 0; i < rows.length; i += BATCH) batches.push(rows.slice(i, i + BATCH));
      setBatchProgress({ done: 0, total: batches.length });

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const text = batch.map((r) => r.message).join("\n");
        const { data: sum, error: sErr } = await supabase.functions.invoke("changelog-summarize", {
          body: { text },
        });
        if (sErr) throw sErr;
        await createDraft({ title: sum.title, summary: sum.summary, category: sum.category });
        setBatchProgress({ done: i + 1, total: batches.length });
      }
      toast.success(`Created ${batches.length} draft${batches.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to batch-summarize");
    } finally {
      setBatching(false);
      setBatchProgress(null);
    }
  };

  if (isAdmin === null) return <div className="p-8 text-sm text-muted-foreground">Checking access…</div>;
  if (!isAdmin) return (
    <div className="mx-auto max-w-md p-12 text-center">
      <h1 className="font-display text-2xl font-semibold">Admins only</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You need the <code>admin</code> role in the <code>user_roles</code> table to manage updates.
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-semibold">Updates · Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Draft, AI-summarize, and publish entries to the /updates page.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">AI summarize</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste raw commit messages (or pull from GitHub) and turn them into a polished draft.
        </p>
        <Textarea
          className="mt-3 min-h-32 text-xs"
          placeholder="One commit message per line…"
          value={commitsText}
          onChange={(e) => setCommitsText(e.target.value)}
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-[auto_auto_1fr] sm:items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Since</label>
            <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="h-8 w-40 text-xs" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">How many</label>
            <Select value={maxRange} onValueChange={setMaxRange}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30</SelectItem>
                <SelectItem value="100">Last 100</SelectItem>
                <SelectItem value="300">Last 300</SelectItem>
                <SelectItem value="1000">Last 1000</SelectItem>
                <SelectItem value="all">All (since date)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={summarize} disabled={summarizing} size="sm">
            {summarizing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
            Summarize → draft
          </Button>
          <Button onClick={pullCommits} disabled={pulling} size="sm" variant="outline">
            {pulling ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
            Pull from GitHub
          </Button>
          <Button onClick={summarizeAllInBatches} disabled={batching} size="sm" variant="outline">
            {batching ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Layers className="mr-1 h-3 w-3" />}
            {batchProgress
              ? `Summarizing ${batchProgress.done}/${batchProgress.total}…`
              : "Summarize all pending → grouped drafts"}
          </Button>
          <Button onClick={() => createDraft()} size="sm" variant="ghost">
            <Plus className="mr-1 h-3 w-3" /> Blank draft
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Entries</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          entries.map((entry) => (
            <EntryEditor key={entry.id} entry={entry} onChange={refresh} />
          ))
        )}
      </section>
    </div>
  );
}

function EntryEditor({ entry, onChange }: { entry: Entry; onChange: () => void }) {
  const [draft, setDraft] = useState(entry);
  const [saving, setSaving] = useState(false);

  const save = async (patch: Partial<Entry>) => {
    setSaving(true);
    const updates: Partial<Entry> = { ...patch };
    if (patch.published === true && !draft.published_at) {
      updates.published_at = new Date().toISOString();
    }
    const { error } = await supabase.from("changelog").update(updates).eq("id", entry.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setDraft({ ...draft, ...updates });
    onChange();
  };

  const remove = async () => {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("changelog").delete().eq("id", entry.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    onChange();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant={draft.published ? "default" : "secondary"} className="text-[10px] uppercase tracking-wider">
          {draft.published ? "Published" : "Draft"}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {format(parseISO(draft.created_at), "MMM d, yyyy")}
        </span>
      </div>
      <Input
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        className="font-display text-base font-semibold"
      />
      <Textarea
        value={draft.summary}
        onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
        className="mt-2 min-h-24 text-sm"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as Category })}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="improved">Improved</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="announcement">Announcement</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => save({ title: draft.title, summary: draft.summary, category: draft.category })}
        >
          <Save className="mr-1 h-3 w-3" /> Save
        </Button>
        {draft.published ? (
          <Button size="sm" variant="ghost" onClick={() => save({ published: false })}>
            <EyeOff className="mr-1 h-3 w-3" /> Unpublish
          </Button>
        ) : (
          <Button size="sm" onClick={() => save({ title: draft.title, summary: draft.summary, category: draft.category, published: true })}>
            <Eye className="mr-1 h-3 w-3" /> Publish
          </Button>
        )}
        <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={remove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}