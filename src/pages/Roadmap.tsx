import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Map, ChevronUp, Check } from "lucide-react";
import { toast } from "sonner";

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

export default function Roadmap() {
  const [items, setItems] = useState<Item[]>([]);
  const [votes, setVotes] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    }
    setLoading(false);
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
              <Map className="h-4 w-4" />
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
          <div className="grid gap-6 md:grid-cols-3">
            {columns.map((col) => {
              const colItems = items.filter((i) => i.status === col.key);
              return (
                <div key={col.key}>
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
                    {colItems.map((item) => {
                      const voted = votes.has(item.id);
                      return (
                        <li key={item.id} className="rounded-lg border border-border bg-card p-4">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleVote(item)}
                              disabled={col.key === "shipped"}
                              className={`flex flex-col items-center rounded-md border px-2 py-1.5 text-xs transition ${
                                voted
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:border-primary/40"
                              } ${col.key === "shipped" ? "opacity-50 cursor-not-allowed" : ""}`}
                              aria-label="Vote"
                            >
                              <ChevronUp className="h-4 w-4" />
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
                                {col.key === "shipped" && (
                                  <Check className="h-3 w-3 text-primary" />
                                )}
                              </div>
                              <h3 className="mt-1 font-medium leading-snug">{item.title}</h3>
                              {item.description && (
                                <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                                  {item.description}
                                </p>
                              )}
                              {col.key === "shipped" && item.changelog_id && (
                                <Link
                                  to="/updates"
                                  className="mt-2 inline-block text-xs text-primary hover:underline"
                                >
                                  See in changelog →
                                </Link>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}