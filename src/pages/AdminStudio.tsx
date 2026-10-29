import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ExternalLink, Image as ImageIcon, Plus, Save, Trash2, Upload, Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice, slugify, uploadCornerMedia, uploadShopFile, useIsAdmin, type BlogPost, type ClubMember, type Freebie, type Product } from "@/lib/corner";
import { CreatorGuide } from "@/components/corner/CreatorGuide";

function UploadButton({ label, accept, onFile }: { label: string; accept?: string; onFile: (f: File) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button asChild variant="outline" size="sm" disabled={busy}>
      <label className="cursor-pointer">
        <Upload className="mr-1 h-4 w-4" /> {busy ? "Uploading…" : label}
        <input type="file" accept={accept} className="sr-only" onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = "";
          if (!f) return; setBusy(true);
          try { await onFile(f); } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); } finally { setBusy(false); }
        }} />
      </label>
    </Button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

/* ───────── Blog posts ───────── */
function PostsPanel() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [sel, setSel] = useState<BlogPost | null>(null);
  const [preview, setPreview] = useState(false);
  const load = async () => {
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    setPosts((data ?? []) as BlogPost[]);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("blog_posts").insert({ title: "New post", slug: `new-post-${Date.now().toString(36)}`, author_id: user?.id }).select().single();
    if (error) return toast.error(error.message);
    await load(); setSel(data as BlogPost);
  };
  const save = async (publish?: boolean) => {
    if (!sel) return;
    const patch: Partial<BlogPost> = { title: sel.title, slug: slugify(sel.slug || sel.title), excerpt: sel.excerpt, body: sel.body, cover_url: sel.cover_url, tags: sel.tags, published_at: sel.published_at, status: sel.status };
    if (publish === true) { patch.status = "published"; patch.published_at = sel.published_at ?? new Date().toISOString(); }
    if (publish === false) patch.status = "draft";
    const { data, error } = await supabase.from("blog_posts").update(patch).eq("id", sel.id).select().single();
    if (error) return toast.error(error.message);
    setSel(data as BlogPost); load(); toast.success(publish === true ? "Published" : publish === false ? "Moved to drafts" : "Saved");
  };
  const remove = async () => {
    if (!sel || !confirm("Delete this post?")) return;
    await supabase.from("blog_posts").delete().eq("id", sel.id); setSel(null); load();
  };

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <div className="space-y-2">
        <Button onClick={create} className="w-full"><Plus className="mr-1 h-4 w-4" /> New post</Button>
        {posts.map((p) => (
          <button key={p.id} onClick={() => { setSel(p); setPreview(false); }} className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${sel?.id === p.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
            <div className="truncate font-semibold">{p.title}</div>
            <div className="text-xs text-muted-foreground">{p.status === "published" ? (p.published_at && new Date(p.published_at) > new Date() ? "Scheduled" : "Published") : "Draft"}</div>
          </button>
        ))}
      </div>
      {sel ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <Field label="Title"><Input value={sel.title} onChange={(e) => setSel({ ...sel, title: e.target.value })} /></Field>
          <Field label="Link name (slug)"><Input value={sel.slug} onChange={(e) => setSel({ ...sel, slug: e.target.value })} onBlur={() => setSel({ ...sel, slug: slugify(sel.slug || sel.title) })} /></Field>
          <Field label="Short summary"><Textarea rows={2} value={sel.excerpt} onChange={(e) => setSel({ ...sel, excerpt: e.target.value })} /></Field>
          <div className="flex flex-wrap items-center gap-3">
            {sel.cover_url ? <img src={sel.cover_url} alt="" className="h-16 w-24 rounded-lg object-cover" /> : <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-secondary"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>}
            <UploadButton label="Cover image" accept="image/*" onFile={async (f) => setSel({ ...sel, cover_url: await uploadCornerMedia(f, "covers") })} />
            <UploadButton label="Insert image in post" accept="image/*" onFile={async (f) => { const url = await uploadCornerMedia(f, "covers"); setSel({ ...sel, body: `${sel.body}\n\n![](${url})\n` }); }} />
          </div>
          <Field label="Tags (comma separated)"><Input value={sel.tags.join(", ")} onChange={(e) => setSel({ ...sel, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} /></Field>
          <Field label="Publish date (leave empty for now; a future date schedules it)">
            <Input type="datetime-local" value={sel.published_at ? new Date(new Date(sel.published_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={(e) => setSel({ ...sel, published_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          </Field>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Post (use # for headings, **bold**, - lists)</Label>
            <Button variant="ghost" size="sm" onClick={() => setPreview((v) => !v)}>{preview ? "Write" : "Preview"}</Button>
          </div>
          {preview
            ? <div className="prose prose-neutral min-h-[300px] max-w-none rounded-xl border border-border p-4 dark:prose-invert"><ReactMarkdown>{sel.body}</ReactMarkdown></div>
            : <Textarea rows={16} value={sel.body} onChange={(e) => setSel({ ...sel, body: e.target.value })} className="font-mono text-sm" />}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save()}><Save className="mr-1 h-4 w-4" /> Save</Button>
            {sel.status === "published" ? <Button variant="outline" onClick={() => save(false)}>Unpublish</Button> : <Button variant="secondary" onClick={() => save(true)}>Publish</Button>}
            <Button asChild variant="outline"><Link to={`/corner/${sel.slug}`} target="_blank"><ExternalLink className="mr-1 h-4 w-4" /> View</Link></Button>
            <Button variant="ghost" className="ml-auto text-destructive" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ) : <p className="text-sm text-muted-foreground">Pick a post or create a new one.</p>}
    </div>
  );
}

/* ───────── Club + freebies ───────── */
function ClubPanel() {
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [freebies, setFreebies] = useState<Freebie[]>([]);
  const load = async () => {
    const [m, f] = await Promise.all([
      supabase.from("club_members").select("*").order("created_at", { ascending: false }),
      supabase.from("freebies").select("*").order("created_at", { ascending: false }),
    ]);
    setMembers((m.data ?? []) as ClubMember[]); setFreebies((f.data ?? []) as Freebie[]);
  };
  useEffect(() => { load(); }, []);
  const update = async (id: string, patch: Partial<Freebie>) => {
    if (patch.is_active) await supabase.from("freebies").update({ is_active: false }).neq("id", id);
    const { error } = await supabase.from("freebies").update(patch).eq("id", id);
    if (error) toast.error(error.message); load();
  };
  const addFreebie = async () => { await supabase.from("freebies").insert({ title: "New freebie" }); load(); };
  const exportCsv = () => {
    const rows = [["email", "first_name", "source", "joined"], ...members.map((m) => [m.email, m.first_name, m.source, m.created_at])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "careflow-club.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl">Freebies</h2><Button size="sm" onClick={addFreebie}><Plus className="mr-1 h-4 w-4" /> Add</Button></div>
        <p className="mb-3 text-xs text-muted-foreground">The one marked "Given on signup" is offered as a download right after someone joins.</p>
        <div className="space-y-3">
          {freebies.map((f) => (
            <div key={f.id} className="space-y-2 rounded-xl border border-border/60 p-3">
              <Input defaultValue={f.title} onBlur={(e) => e.target.value !== f.title && update(f.id, { title: e.target.value })} aria-label="Freebie title" />
              <Textarea rows={2} defaultValue={f.description} onBlur={(e) => e.target.value !== f.description && update(f.id, { description: e.target.value })} placeholder="Short description" />
              <div className="flex flex-wrap items-center gap-2">
                <UploadButton label={f.file_url ? "Replace file" : "Upload file"} onFile={async (file) => update(f.id, { file_url: await uploadCornerMedia(file, "freebies") })} />
                {f.file_url && <a href={f.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Open file</a>}
                <Label className="ml-auto flex items-center gap-2 text-xs">Given on signup <Switch checked={f.is_active} onCheckedChange={(v) => update(f.id, { is_active: v })} /></Label>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { if (confirm("Delete freebie?")) { await supabase.from("freebies").delete().eq("id", f.id); load(); } }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl">Club members ({members.length})</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(members.map((m) => m.email).join(", ")); toast.success("Emails copied"); }}><Copy className="mr-1 h-4 w-4" /> Copy emails</Button>
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" /> Export CSV</Button>
          </div>
        </div>
        <div className="divide-y divide-border/60">
          {members.length === 0 && <p className="text-sm text-muted-foreground">No members yet.</p>}
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0"><div className="truncate font-medium">{m.first_name || "—"} · {m.email}</div><div className="text-xs text-muted-foreground">{m.source} · {new Date(m.created_at).toLocaleDateString()}</div></div>
              <Button variant="ghost" size="sm" className="text-destructive" aria-label="Remove member" onClick={async () => { if (confirm("Remove member?")) { await supabase.from("club_members").delete().eq("id", m.id); load(); } }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ───────── Shop ───────── */
function ShopPanel() {
  const [items, setItems] = useState<Product[]>([]);
  const [sel, setSel] = useState<Product | null>(null);
  const load = async () => { const { data } = await supabase.from("products").select("*").order("sort_order").order("created_at"); setItems((data ?? []) as Product[]); };
  useEffect(() => { load(); }, []);
  const create = async () => {
    const { data, error } = await supabase.from("products").insert({ title: "New product", slug: `product-${Date.now().toString(36)}`, sort_order: items.length }).select().single();
    if (error) return toast.error(error.message); await load(); setSel(data as Product);
  };
  const save = async () => {
    if (!sel) return;
    const { id, created_at, updated_at, ...rest } = sel; void created_at; void updated_at;
    const { data, error } = await supabase.from("products").update({ ...rest, slug: slugify(sel.slug || sel.title) }).eq("id", id).select().single();
    if (error) return toast.error(error.message); setSel(data as Product); load(); toast.success("Saved");
  };

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <div className="space-y-2">
        <Button onClick={create} className="w-full"><Plus className="mr-1 h-4 w-4" /> New product</Button>
        {items.map((p) => (
          <button key={p.id} onClick={() => setSel(p)} className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${sel?.id === p.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
            <div className="truncate font-semibold">{p.title}</div>
            <div className="text-xs text-muted-foreground">{p.status === "draft" ? "Hidden" : p.status === "coming_soon" ? "Coming soon" : "For sale"} · {formatPrice(p.price_cents, p.currency)}</div>
          </button>
        ))}
      </div>
      {sel ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <Field label="Name"><Input value={sel.title} onChange={(e) => setSel({ ...sel, title: e.target.value })} /></Field>
          <Field label="Link name (slug)"><Input value={sel.slug} onChange={(e) => setSel({ ...sel, slug: e.target.value })} /></Field>
          <Field label="Description (supports **bold** and - lists)"><Textarea rows={6} value={sel.description} onChange={(e) => setSel({ ...sel, description: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price (USD)"><Input type="number" min={0} step="0.01" value={(sel.price_cents / 100).toString()} onChange={(e) => setSel({ ...sel, price_cents: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) })} /></Field>
            <Field label="Visibility">
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={sel.status} onChange={(e) => setSel({ ...sel, status: e.target.value })}>
                <option value="draft">Hidden</option><option value="coming_soon">Coming soon</option><option value="published">For sale</option>
              </select>
            </Field>
          </div>
          <Field label="Checkout link (Etsy, Gumroad, Stripe payment link…) — the Buy button opens this">
            <Input placeholder="https://" value={sel.checkout_url ?? ""} onChange={(e) => setSel({ ...sel, checkout_url: e.target.value || null })} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            {sel.cover_url && <img src={sel.cover_url} alt="" className="h-16 w-16 rounded-lg object-cover" />}
            <UploadButton label="Main image" accept="image/*" onFile={async (f) => setSel({ ...sel, cover_url: await uploadCornerMedia(f, "products") })} />
            <UploadButton label="Add gallery image" accept="image/*" onFile={async (f) => { const u = await uploadCornerMedia(f, "products"); setSel({ ...sel, images: [...sel.images, u] }); }} />
            <UploadButton label={sel.file_path ? "Replace product file" : "Upload product file"} onFile={async (f) => setSel({ ...sel, file_path: await uploadShopFile(f) })} />
          </div>
          {sel.images.length > 0 && <div className="flex flex-wrap gap-2">{sel.images.map((src) => <button key={src} title="Remove" onClick={() => setSel({ ...sel, images: sel.images.filter((s) => s !== src) })}><img src={src} alt="" className="h-14 w-14 rounded-lg object-cover" /></button>)}</div>}
          {sel.file_path && <p className="text-xs text-muted-foreground">Product file stored privately: {sel.file_path.split("/").pop()}</p>}
          <Field label="Order in shop"><Input type="number" value={sel.sort_order} onChange={(e) => setSel({ ...sel, sort_order: Number(e.target.value) || 0 })} /></Field>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save}><Save className="mr-1 h-4 w-4" /> Save</Button>
            <Button asChild variant="outline"><Link to={`/shop/${sel.slug}`} target="_blank"><ExternalLink className="mr-1 h-4 w-4" /> View</Link></Button>
            <Button variant="ghost" className="ml-auto text-destructive" onClick={async () => { if (confirm("Delete product?")) { await supabase.from("products").delete().eq("id", sel.id); setSel(null); load(); } }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ) : <p className="text-sm text-muted-foreground">Pick a product or create a new one.</p>}
    </div>
  );
}

const TABS = [
  { id: "corner", label: "Blog" },
  { id: "club", label: "Club & freebies" },
  { id: "shop", label: "Shop" },
  { id: "guide", label: "Setup guide" },
];

export default function AdminStudio() {
  const { loading, isAdmin } = useIsAdmin();
  const loc = useLocation();
  const nav = useNavigate();
  const tab = TABS.find((t) => loc.pathname.endsWith(t.id))?.id ?? "corner";
  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <div className="p-8 text-sm text-muted-foreground">Only admins can open the creator studio.</div>;
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-32 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Creator studio</h1>
          <p className="text-sm text-muted-foreground">Write for the CareFlow Corner, grow the Club, and run your shop. Saves go live instantly.</p>
        </div>
        <Button asChild variant="outline"><Link to="/admin/landing">Landing page editor</Link></Button>
      </header>
      <Tabs value={tab} onValueChange={(v) => nav(`/admin/${v}`)}>
        <TabsList className="flex w-full flex-wrap justify-start">{TABS.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}</TabsList>
        <TabsContent value="corner"><PostsPanel /></TabsContent>
        <TabsContent value="club"><ClubPanel /></TabsContent>
        <TabsContent value="shop"><ShopPanel /></TabsContent>
        <TabsContent value="guide"><CreatorGuide /></TabsContent>
      </Tabs>
    </div>
  );
}
