import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Map as MapIcon, ChevronUp, Check, KanbanSquare, CalendarRange, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, startOfMonth } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Status = "planned" | "in_progress" | "shipped" | "cancelled";
type Category = "new" | "improved" | "fixed" | "announcement";

type Item = {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  category: Category;
  target_quarter: string | null;
  vote_count: number;
  changelog_id: string | null;
  shipped_at: string | null;
};

const columns: { key: Status; label: string }[] = [
  { key: "planned", label: "Planned" },
  { key: "in_progress", label: "In progress" },
  { key: "shipped", label: "Shipped" },
];

// Sort quarters like "Q1 2026" chronologically; unknowns last.
function quarterSortKey(q: string | null): number {
  if (!q) return Number.MAX_SAFE_INTEGER;
  const m = q.match(/Q([1-4])\s*(\d{4})/i);
  if (!m) return Number.MAX_SAFE_INTEGER - 1;
  return parseInt(m[2]) * 10 + parseInt(m[1]);
}

function currentQuarter(d = new Date()): string {
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
}

export default function Roadmap() {
  const [items, setItems] = useState<Item[]>([]);
  const [votes, setVotes] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null);
  const [shipDialog, setShipDialog] = useState<null | {
    item: Item;
    title: string;
    summary: string;
    category: Category;
    publish: boolean;
    saving: boolean;
  }>(null);

  useEffect(() => {
    document.title = "Roadmap · CareFlow";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "See what's planned, in progress, and shipped in CareFlow. Vote on features you want next.");
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const { data } = await supabase
      .from("roadmap_items")
      .select("id,title,description,status,category,target_quarter,vote_count,changelog_id,shipped_at")
      .neq("status", "cancelled")
      .order("status", { ascending: true })
      .order("vote_count", { ascending: false })
      .order("sort_order", { ascending: true });
    setItems((data as Item[]) ?? []);

    if (user) {
      const { data: v } = await supabase
        .from("roadmap_votes")
        .select("roadmap_item_id")
        .eq("user_id", user.id);
      setVotes(new Set((v ?? []).map((r: any) => r.roadmap_item_id)));
      const { data: r } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!r);
    } else {
      setIsAdmin(false);
    }
    setLoading(false);
  }

  async function handleDrop(targetStatus: Status) {
    const id = dragId;
    setDragId(null);
    setDragOverCol(null);
    if (!id) return;
    const item = items.find((i) => i.id === id);
    if (!item || item.status === targetStatus) return;
    if (!isAdmin) { toast.error("Admin only"); return; }

    if (targetStatus === "shipped") {
      // Open confirmation modal to review changelog draft before shipping.
      setShipDialog({
        item,
        title: item.title,
        summary: item.description ?? "",
        category: item.category,
        publish: false,
        saving: false,
      });
      return;
    }

    const prev = items;
    const nextQuarter = currentQuarter();
    setItems((arr) =>
      arr.map((i) =>
        i.id === id
          ? { ...i, status: targetStatus, target_quarter: nextQuarter, shipped_at: i.status === "shipped" ? null : i.shipped_at }
          : i
      )
    );

    const patch: { status: Status; target_quarter?: string | null; shipped_at?: string | null } = { status: targetStatus };
    if (!item.target_quarter || item.status === "shipped") patch.target_quarter = currentQuarter();
    if (item.status === "shipped") patch.shipped_at = null;
    const { error } = await supabase.from("roadmap_items").update(patch).eq("id", id);
    if (error) { toast.error(error.message); setItems(prev); return; }
    toast.success(`Moved to ${targetStatus.replace("_", " ")}`);
  }

  async function confirmShip() {
    if (!shipDialog) return;
    const { item, title, summary, category, publish } = shipDialog;
    setShipDialog({ ...shipDialog, saving: true });

    // 1) Apply any edits to the roadmap item so the RPC uses the latest text.
    const { error: updErr } = await supabase
      .from("roadmap_items")
      .update({ title, description: summary || null, category })
      .eq("id", item.id);
    if (updErr) {
      toast.error(updErr.message);
      setShipDialog({ ...shipDialog, saving: false });
      return;
    }

    // 2) Ship — creates/updates the linked changelog entry.
    const { error } = await supabase.rpc("ship_roadmap_item", { _id: item.id, _publish: publish });
    if (error) {
      toast.error(error.message);
      setShipDialog({ ...shipDialog, saving: false });
      return;
    }
    toast.success(publish ? "Shipped & published" : "Shipped — draft changelog created");
    setShipDialog(null);
    load();
  }

  async function toggleVote(item: Item) {
    if (!userId) {
      toast.error("Sign in to vote");
      return;
    }
    const hasVote = votes.has(item.id);
    // optimistic
    setVotes((s) => {
      const next = new Set(s);
      hasVote ? next.delete(item.id) : next.add(item.id);
      return next;
    });
    setItems((arr) =>
      arr.map((i) => (i.id === item.id ? { ...i, vote_count: i.vote_count + (hasVote ? -1 : 1) } : i))
    );
    if (hasVote) {
      const { error } = await supabase
        .from("roadmap_votes")
        .delete()
        .eq("roadmap_item_id", item.id)
        .eq("user_id", userId);
      if (error) { toast.error(error.message); load(); }
    } else {
      const { error } = await supabase
        .from("roadmap_votes")
        .insert({ roadmap_item_id: item.id, user_id: userId });
      if (error) { toast.error(error.message); load(); }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          ← CareFlow
        </Link>
        <header className="mt-6 mb-12 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <MapIcon className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.2em]">Roadmap</span>
            </div>
            <h1 className="mt-3 font-display text-4xl font-semibold">What's coming</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg">
              Vote on the features you want most. Shipped items roll into the{" "}
              <Link to="/updates" className="underline">changelog</Link>.
            </p>
          </div>
          {!userId && (
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">Sign in to vote</Link>
            </Button>
          )}
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Tabs defaultValue="kanban">
            <TabsList className="mb-6">
              <TabsTrigger value="kanban"><KanbanSquare className="h-3.5 w-3.5 mr-1.5" />Kanban</TabsTrigger>
              <TabsTrigger value="timeline"><CalendarRange className="h-3.5 w-3.5 mr-1.5" />Timeline</TabsTrigger>
              <TabsTrigger value="calendar"><CalendarDays className="h-3.5 w-3.5 mr-1.5" />Calendar</TabsTrigger>
            </TabsList>

            <TabsContent value="kanban">
              {isAdmin && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Drag cards between columns to update status. Target quarter updates automatically.
                </p>
              )}
              <div className="grid gap-6 md:grid-cols-3">
                {columns.map((col) => {
                  const colItems = items.filter((i) => i.status === col.key);
                  return (
                    <div
                      key={col.key}
                      onDragOver={(e) => { if (isAdmin) { e.preventDefault(); setDragOverCol(col.key); } }}
                      onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
                      onDrop={(e) => { e.preventDefault(); handleDrop(col.key); }}
                      className={`rounded-lg transition ${dragOverCol === col.key ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                          {col.label}
                        </h2>
                        <span className="text-xs text-muted-foreground">{colItems.length}</span>
                      </div>
                      <ul className="space-y-3">
                        {colItems.length === 0 && (
                          <li className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
                            Nothing here yet.
                          </li>
                        )}
                        {colItems.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            voted={votes.has(item.id)}
                            onVote={() => toggleVote(item)}
                            draggable={isAdmin}
                            onDragStart={() => setDragId(item.id)}
                            onDragEnd={() => { setDragId(null); setDragOverCol(null); }}
                            dragging={dragId === item.id}
                          />
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <TimelineView items={items} votes={votes} onVote={toggleVote} />
            </TabsContent>

            <TabsContent value="calendar">
              <CalendarView items={items} votes={votes} onVote={toggleVote} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={!!shipDialog} onOpenChange={(o) => !o && !shipDialog?.saving && setShipDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ship to changelog</DialogTitle>
            <DialogDescription>
              Review the draft changelog entry before it's created. You can edit the text or publish it now.
            </DialogDescription>
          </DialogHeader>
          {shipDialog && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ship-title">Title</Label>
                <Input
                  id="ship-title"
                  value={shipDialog.title}
                  onChange={(e) => setShipDialog({ ...shipDialog, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ship-summary">Summary</Label>
                <Textarea
                  id="ship-summary"
                  rows={4}
                  value={shipDialog.summary}
                  onChange={(e) => setShipDialog({ ...shipDialog, summary: e.target.value })}
                  placeholder="What changed?"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={shipDialog.category}
                  onValueChange={(v: Category) => setShipDialog({ ...shipDialog, category: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="improved">Improved</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={shipDialog.publish}
                  onCheckedChange={(c) => setShipDialog({ ...shipDialog, publish: !!c })}
                />
                Publish immediately (otherwise saved as a draft in /admin/updates)
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={shipDialog?.saving} onClick={() => setShipDialog(null)}>
              Cancel
            </Button>
            <Button disabled={shipDialog?.saving || !shipDialog?.title.trim()} onClick={confirmShip}>
              {shipDialog?.saving ? "Shipping…" : shipDialog?.publish ? "Ship & publish" : "Ship as draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemCard({
  item, voted, onVote, compact = false,
  draggable = false, onDragStart, onDragEnd, dragging = false,
}: {
  item: Item; voted: boolean; onVote: () => void; compact?: boolean;
  draggable?: boolean; onDragStart?: () => void; onDragEnd?: () => void; dragging?: boolean;
}) {
  const isShipped = item.status === "shipped";
  return (
    <li
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-lg border border-border bg-card p-3 ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${dragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onVote}
          disabled={isShipped}
          className={`flex flex-col items-center rounded-md border px-2 py-1 text-xs transition ${
            voted ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
          } ${isShipped ? "opacity-50 cursor-not-allowed" : ""}`}
          aria-label="Vote"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          <span className="font-semibold">{item.vote_count}</span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              {item.category}
            </Badge>
            {item.target_quarter && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {item.target_quarter}
              </span>
            )}
            {isShipped && <Check className="h-3 w-3 text-primary" />}
          </div>
          <h3 className="mt-1 text-sm font-medium leading-snug">{item.title}</h3>
          {!compact && item.description && (
            <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{item.description}</p>
          )}
          {isShipped && item.changelog_id && (
            <Link to="/updates" className="mt-2 inline-block text-xs text-primary hover:underline">
              See in changelog →
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

function TimelineView({
  items, votes, onVote,
}: { items: Item[]; votes: Set<string>; onVote: (i: Item) => void }) {
  // Group by target_quarter; non-shipped items appear here. Shipped grouped separately at end.
  const upcoming = items.filter((i) => i.status !== "shipped");
  const shipped = items.filter((i) => i.status === "shipped");

  const groups = new Map<string, Item[]>();
  for (const i of upcoming) {
    const key = i.target_quarter || "Unscheduled";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  }
  const sortedKeys = [...groups.keys()].sort(
    (a, b) => quarterSortKey(a === "Unscheduled" ? null : a) - quarterSortKey(b === "Unscheduled" ? null : b)
  );

  return (
    <div className="space-y-10 border-l border-border pl-6">
      {sortedKeys.length === 0 && shipped.length === 0 && (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      )}
      {sortedKeys.map((q) => (
        <section key={q} className="relative">
          <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
          <h2 className="font-display text-lg font-semibold">{q}</h2>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {groups.get(q)!.length} item{groups.get(q)!.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {groups.get(q)!
              .sort((a, b) => b.vote_count - a.vote_count)
              .map((item) => (
                <ItemCard key={item.id} item={item} voted={votes.has(item.id)} onVote={() => onVote(item)} />
              ))}
          </ul>
        </section>
      ))}
      {shipped.length > 0 && (
        <section className="relative">
          <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-muted-foreground" />
          <h2 className="font-display text-lg font-semibold">Already shipped</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {shipped
              .sort((a, b) => (b.shipped_at ?? "").localeCompare(a.shipped_at ?? ""))
              .map((item) => (
                <ItemCard key={item.id} item={item} voted={votes.has(item.id)} onVote={() => onVote(item)} compact />
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CalendarView({
  items, votes, onVote,
}: { items: Item[]; votes: Set<string>; onVote: (i: Item) => void }) {
  // Shipped items grouped by month of shipped_at, newest first.
  const shipped = items
    .filter((i) => i.status === "shipped" && i.shipped_at)
    .sort((a, b) => (b.shipped_at ?? "").localeCompare(a.shipped_at ?? ""));

  const upcoming = items.filter((i) => i.status !== "shipped");

  const monthGroups = new Map<string, Item[]>();
  for (const i of shipped) {
    const d = startOfMonth(parseISO(i.shipped_at!));
    const key = format(d, "yyyy-MM");
    if (!monthGroups.has(key)) monthGroups.set(key, []);
    monthGroups.get(key)!.push(i);
  }

  return (
    <div className="space-y-10">
      {upcoming.length > 0 && (
        <section>
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-3">
            Upcoming (by target quarter)
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming
              .sort(
                (a, b) =>
                  quarterSortKey(a.target_quarter) - quarterSortKey(b.target_quarter) ||
                  b.vote_count - a.vote_count
              )
              .map((item) => (
                <ItemCard key={item.id} item={item} voted={votes.has(item.id)} onVote={() => onVote(item)} />
              ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-3">
          Shipped by month
        </h2>
        {monthGroups.size === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing shipped yet.</p>
        ) : (
          <div className="space-y-6">
            {[...monthGroups.entries()].map(([key, list]) => {
              const date = parseISO(key + "-01");
              return (
                <div key={key} className="grid gap-4 md:grid-cols-[140px_1fr]">
                  <div>
                    <div className="font-display text-2xl font-semibold">{format(date, "MMM")}</div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      {format(date, "yyyy")}
                    </div>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {list.map((item) => (
                      <ItemCard key={item.id} item={item} voted={votes.has(item.id)} onVote={() => onVote(item)} compact />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}