import { useEffect, useRef, useState } from "react";
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
import { Loader2, Sparkles, Plus, Trash2, Save, Upload, Eye, EyeOff, Layers, Merge, Clock, CheckCircle2, AlertCircle, CalendarDays } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type Category = "new" | "improved" | "fixed" | "announcement";
type FilterCategory = Category | "all";
type Frequency = "off" | "hourly" | "daily" | "weekly";
type Entry = {
  id: string;
  title: string;
  summary: string;
  category: Category;
  published: boolean;
  published_at: string | null;
  created_at: string;
};

function computeNextPullAt(freq: Frequency, lastPulledAt: string | null): Date | null {
  if (freq === "off") return null;
  const now = new Date();
  if (freq === "hourly") {
    const d = new Date(now);
    d.setUTCMinutes(0, 0, 0);
    d.setUTCHours(d.getUTCHours() + 1);
    return d;
  }
  if (freq === "daily") {
    const d = new Date(now);
    d.setUTCHours(6, 0, 0, 0);
    if (d <= now) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  }
  // weekly Mon 6am UTC
  const d = new Date(now);
  d.setUTCHours(6, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Sun,1=Mon
  let add = (1 - day + 7) % 7;
  if (add === 0 && d <= now) add = 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d;
}

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
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);
  const [commitFilter, setCommitFilter] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("off");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [lastPulledAt, setLastPulledAt] = useState<string | null>(null);
  const [lastPullStatus, setLastPullStatus] = useState<string | null>(null);
  const [lastPullError, setLastPullError] = useState<string | null>(null);
  const [lastPullFetched, setLastPullFetched] = useState<number | null>(null);
  const [lastPullInserted, setLastPullInserted] = useState<number | null>(null);
  const lastShiftIdRef = useRef<string | null>(null);

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

  const loadSettings = async () => {
    const { data } = await supabase
      .from("changelog_settings")
      .select("pull_frequency, last_pulled_at, last_pull_status, last_pull_error, last_pull_fetched, last_pull_inserted")
      .eq("id", true)
      .maybeSingle();
    if (data) {
      setFrequency((data.pull_frequency as Frequency) ?? "off");
      setLastPulledAt((data.last_pulled_at as string | null) ?? null);
      setLastPullStatus((data as any).last_pull_status ?? null);
      setLastPullError((data as any).last_pull_error ?? null);
      setLastPullFetched((data as any).last_pull_fetched ?? null);
      setLastPullInserted((data as any).last_pull_inserted ?? null);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadSettings();
  }, [isAdmin]);

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
    return data as Entry;
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
      await loadSettings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to pull commits. Configure GITHUB_TOKEN and GITHUB_REPO secrets.");
    } finally {
      setPulling(false);
    }
  };

  const saveSchedule = async (freq: Frequency) => {
    setSavingSchedule(true);
    try {
      const { error } = await supabase.rpc("set_changelog_pull_schedule", { _freq: freq });
      if (error) throw error;
      setFrequency(freq);
      toast.success(freq === "off" ? "Auto-pull turned off" : `Auto-pull set to ${freq}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update schedule");
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleSelect = (id: string, shift = false) => {
    const ordered = filteredEntries.map((e) => e.id);
    setSelected((prev) => {
      const n = new Set(prev);
      if (shift && lastShiftIdRef.current && ordered.length) {
        const a = ordered.indexOf(lastShiftIdRef.current);
        const b = ordered.indexOf(id);
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) n.add(ordered[i]);
          lastShiftIdRef.current = id;
          return n;
        }
      }
      if (n.has(id)) n.delete(id);
      else n.add(id);
      lastShiftIdRef.current = id;
      return n;
    });
  };

  const mergeSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length < 2) { toast.error("Select at least 2 drafts to merge"); return; }
    const chosen = entries.filter((e) => ids.includes(e.id) && !e.published);
    if (chosen.length < 2) { toast.error("Only unpublished drafts can be merged"); return; }
    setMerging(true);
    try {
      // Order oldest -> newest so summaries read chronologically
      chosen.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
      const title = chosen[0].title || "Merged update";
      const summary = chosen
        .map((e) => `**${e.title}**\n\n${e.summary}`.trim())
        .filter(Boolean)
        .join("\n\n---\n\n");
      // Use the most common category (fallback first)
      const counts = new Map<Category, number>();
      for (const e of chosen) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
      const category = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];

      const merged = await createDraft({ title, summary, category });
      if (!merged) throw new Error("Failed to create merged draft");

      // Re-point raw commits to the new entry, then delete old drafts
      await supabase
        .from("changelog_raw_commits")
        .update({ included_in_entry_id: merged.id })
        .in("included_in_entry_id", ids);
      const { error: delErr } = await supabase.from("changelog").delete().in("id", ids);
      if (delErr) throw delErr;

      setSelected(new Set());
      toast.success(`Merged ${ids.length} drafts`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to merge");
    } finally {
      setMerging(false);
    }
  };

  const deleteSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} entr${ids.length === 1 ? "y" : "ies"}?`)) return;
    const { error } = await supabase.from("changelog").delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    setSelected(new Set());
    toast.success(`Deleted ${ids.length}`);
    await refresh();
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

  const filteredEntries = filter === "all" ? entries : entries.filter((e) => e.category === filter);
  const allSelected = filteredEntries.length > 0 && filteredEntries.every((e) => selected.has(e.id));
  const nextPullAt = computeNextPullAt(frequency, lastPulledAt);
  const filteredCommitText = commitFilter.trim()
    ? commitsText.split("\n").filter((l) => l.toLowerCase().includes(commitFilter.toLowerCase())).join("\n")
    : commitsText;

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
        <Input
          placeholder="Filter commit lines (keyword)…"
          value={commitFilter}
          onChange={(e) => setCommitFilter(e.target.value)}
          className="mt-3 h-8 text-xs"
        />
        <Textarea
          className="mt-3 min-h-32 text-xs"
          placeholder="One commit message per line…"
          value={filteredCommitText}
          onChange={(e) => { setCommitFilter(""); setCommitsText(e.target.value); }}
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

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Auto-pull schedule</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Automatically fetch new commits from GitHub on a schedule (uses last pull time as the “since” date).
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Frequency</label>
            <Select value={frequency} onValueChange={(v) => saveSchedule(v as Frequency)} disabled={savingSchedule}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily (6am UTC)</SelectItem>
                <SelectItem value="weekly">Weekly (Mon 6am UTC)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
          <div className="rounded-md border border-border bg-muted/20 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Last pull</div>
            <div className="mt-0.5 font-medium">
              {lastPulledAt ? format(parseISO(lastPulledAt), "MMM d, yyyy HH:mm") : "Never"}
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Next pull</div>
            <div className="mt-0.5 font-medium">
              {nextPullAt ? format(nextPullAt, "MMM d, yyyy HH:mm 'UTC'") : "Off"}
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</div>
            <div className="mt-0.5 flex items-center gap-1 font-medium">
              {lastPullStatus === "success" ? (
                <><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Success
                  {lastPullFetched != null && (
                    <span className="ml-1 text-muted-foreground">
                      ({lastPullFetched} fetched, {lastPullInserted ?? 0} new)
                    </span>
                  )}
                </>
              ) : lastPullStatus === "error" ? (
                <><AlertCircle className="h-3 w-3 text-destructive" /> Error</>
              ) : (
                <span className="text-muted-foreground">No runs yet</span>
              )}
            </div>
            {lastPullStatus === "error" && lastPullError && (
              <div className="mt-1 line-clamp-2 text-[10px] text-destructive/80" title={lastPullError}>
                {lastPullError}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Entries</h2>
          {filteredEntries.length > 0 && (
            <label className="ml-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => {
                  if (v) setSelected(new Set(filteredEntries.map((e) => e.id)));
                  else setSelected(new Set());
                }}
                aria-label="Select all"
              />
              Select all
            </label>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {(["all","new","improved","fixed","announcement"] as FilterCategory[]).map((c) => (
              <Button
                key={c}
                size="sm"
                variant={filter === c ? "default" : "outline"}
                className="h-7 px-2 text-[11px] capitalize"
                onClick={() => setFilter(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
            <span>{selected.size} selected</span>
            <Button size="sm" variant="outline" disabled={merging || selected.size < 2} onClick={mergeSelected}>
              {merging ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Merge className="mr-1 h-3 w-3" />}
              Merge selected
            </Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={deleteSelected}>
              <Trash2 className="mr-1 h-3 w-3" /> Delete selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filteredEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          filteredEntries.map((entry) => (
            <EntryEditor
              key={entry.id}
              entry={entry}
              onChange={refresh}
              selected={selected.has(entry.id)}
              onToggleSelect={(shift) => toggleSelect(entry.id, shift)}
            />
          ))
        )}
      </section>
    </div>
  );
}

function EntryEditor({
  entry, onChange, selected, onToggleSelect,
}: {
  entry: Entry; onChange: () => void; selected: boolean; onToggleSelect: (shift: boolean) => void;
}) {
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
        <div
          className="flex items-center gap-2"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            onToggleSelect(e.shiftKey);
          }}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => {
              if (v !== selected) onToggleSelect(false);
            }}
            aria-label="Select entry"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <Badge variant={draft.published ? "default" : "secondary"} className="text-[10px] uppercase tracking-wider">
          {draft.published ? "Published" : "Draft"}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          Created {format(parseISO(draft.created_at), "MMM d, yyyy")}
        </span>
        {draft.published_at && (
          <span className="text-[10px] text-muted-foreground">
            · Published {format(parseISO(draft.published_at), "MMM d, yyyy")}
          </span>
        )}
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
        <div className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3 text-muted-foreground" />
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={(draft.published_at ?? draft.created_at).slice(0, 10)}
            onChange={(e) => {
              const iso = e.target.value ? new Date(e.target.value + "T12:00:00Z").toISOString() : null;
              if (draft.published) {
                setDraft({ ...draft, published_at: iso });
              } else {
                setDraft({ ...draft, created_at: iso ?? draft.created_at });
              }
            }}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => save({
            title: draft.title,
            summary: draft.summary,
            category: draft.category,
            published_at: draft.published_at,
            created_at: draft.created_at,
          })}
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