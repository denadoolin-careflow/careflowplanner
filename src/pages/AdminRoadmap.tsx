import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Rocket, Save } from "lucide-react";
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
  sort_order: number;
  vote_count: number;
  changelog_id: string | null;
  shipped_at: string | null;
};

export default function AdminRoadmap() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    document.title = "Roadmap admin · CareFlow";
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
    })();
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("roadmap_items")
      .select("*")
      .order("status", { ascending: true })
      .order("sort_order", { ascending: true });
    setItems((data as Item[]) ?? []);
    setLoading(false);
  }

  async function addItem() {
    const { error } = await supabase.from("roadmap_items").insert({
      title: "Untitled idea",
      status: "planned",
      category: "new",
    });
    if (error) toast.error(error.message); else load();
  }

  async function save(item: Item) {
    const { error } = await supabase.from("roadmap_items").update({
      title: item.title,
      description: item.description,
      status: item.status,
      category: item.category,
      target_quarter: item.target_quarter,
      sort_order: item.sort_order,
    }).eq("id", item.id);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  async function remove(id: string) {
    if (!confirm("Delete this roadmap item?")) return;
    const { error } = await supabase.from("roadmap_items").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  }

  async function ship(item: Item, publish: boolean) {
    const { data, error } = await supabase.rpc("ship_roadmap_item", {
      _id: item.id, _publish: publish,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(publish ? "Shipped and published" : "Shipped (draft changelog created)");
    load();
    return data;
  }

  function update(id: string, patch: Partial<Item>) {
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  if (isAdmin === false) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Admin only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-semibold">Roadmap</h1>
            <p className="text-sm text-muted-foreground">
              Manage planned features. Shipping creates a linked{" "}
              <Link to="/admin/updates" className="underline">changelog entry</Link>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/roadmap">View public</Link></Button>
            <Button onClick={addItem} size="sm"><Plus className="h-4 w-4 mr-1" />New item</Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center px-2 py-1 rounded border border-border text-xs">
                    <span>▲</span>
                    <span className="font-semibold">{item.vote_count}</span>
                  </div>
                  <Input
                    value={item.title}
                    onChange={(e) => update(item.id, { title: e.target.value })}
                    className="font-medium"
                  />
                  {item.changelog_id && (
                    <Badge variant="secondary" className="text-[10px]">linked</Badge>
                  )}
                </div>
                <Textarea
                  value={item.description ?? ""}
                  onChange={(e) => update(item.id, { description: e.target.value })}
                  placeholder="Description (shown publicly)"
                  rows={2}
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Select value={item.status} onValueChange={(v: Status) => update(item.id, { status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={item.category} onValueChange={(v: Category) => update(item.id, { category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="improved">Improved</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Target (e.g. Q1 2026)"
                    value={item.target_quarter ?? ""}
                    onChange={(e) => update(item.id, { target_quarter: e.target.value || null })}
                  />
                  <Input
                    type="number"
                    placeholder="Sort"
                    value={item.sort_order}
                    onChange={(e) => update(item.id, { sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => save(item)}>
                    <Save className="h-3 w-3 mr-1" />Save
                  </Button>
                  {item.status !== "shipped" && (
                    <>
                      <Button size="sm" onClick={() => ship(item, false)}>
                        <Rocket className="h-3 w-3 mr-1" />Ship (draft)
                      </Button>
                      <Button size="sm" variant="default" onClick={() => ship(item, true)}>
                        <Rocket className="h-3 w-3 mr-1" />Ship & publish
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}>
                    <Trash2 className="h-3 w-3 mr-1" />Delete
                  </Button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">No roadmap items yet. Add one above.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}