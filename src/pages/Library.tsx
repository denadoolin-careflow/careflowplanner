import { ConnectionsPanel } from "@/components/connections/ConnectionsPanel";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Film, Newspaper, ChefHat, Plus, Search, Star, Trash2, ExternalLink, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMealsLibrary, type LibraryMeal } from "@/lib/meals-library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Sparkles, Wand2, NotebookPen, Loader2 } from "lucide-react";
import { fetchArticle, generateCover, clipToDailyNote, type ArticleDetails } from "@/lib/library-ai";

type Kind = "book" | "film" | "article";
type Shelf = "all" | Kind | "recipe";

interface Item {
  id: string; kind: Kind; title: string; creator: string | null; url: string | null;
  cover_url: string | null; status: string; rating: number | null; format: string | null;
  platform: string | null; notes: string | null; tags: string[]; created_at: string; details?: ArticleDetails | null;
}

export const STATUSES: Record<Kind, { value: string; label: string }[]> = {
  book: [{ value: "want", label: "Want to read" }, { value: "doing", label: "Reading" }, { value: "done", label: "Finished" }, { value: "dropped", label: "Ditched" }],
  film: [{ value: "want", label: "Watchlist" }, { value: "doing", label: "Watching" }, { value: "done", label: "Watched" }, { value: "dropped", label: "Ditched" }],
  article: [{ value: "want", label: "To read" }, { value: "doing", label: "Reading" }, { value: "done", label: "Read" }, { value: "dropped", label: "Archived" }],
};
const SHELVES: { id: Shelf; label: string; icon: any }[] = [
  { id: "all", label: "All", icon: Star },
  { id: "book", label: "Books", icon: BookOpen },
  { id: "film", label: "Movies & Shows", icon: Film },
  { id: "article", label: "Articles", icon: Newspaper },
  { id: "recipe", label: "Recipes", icon: ChefHat },
];
const KIND_ICON: Record<Kind | "recipe", any> = { book: BookOpen, film: Film, article: Newspaper, recipe: ChefHat };
const statusLabel = (k: Kind, v: string) => STATUSES[k].find((s) => s.value === v)?.label ?? v;

function Stars({ value, onChange }: { value: number | null; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n === value ? 0 : n)} aria-label={`${n} stars`} className="p-1">
          <Star className={`h-4 w-4 ${value && n <= value ? "fill-accent text-accent" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

export default function LibraryPage() {
  const [shelf, setShelf] = useState<Shelf>("all");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("any");
  const [items, setItems] = useState<Item[]>([]);
  const meals = useMealsLibrary();
  const [edit, setEdit] = useState<Partial<Item> | null>(null);
  const [recipeEdit, setRecipeEdit] = useState<Partial<LibraryMeal> | null>(null);
  const [planFor, setPlanFor] = useState<LibraryMeal | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("library_items").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Item[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const ql = q.trim().toLowerCase();
  const shown = useMemo(() => items.filter((i) =>
    (shelf === "all" || shelf === i.kind) &&
    (statusFilter === "any" || i.status === statusFilter) &&
    (!ql || [i.title, i.creator, i.notes, ...(i.tags ?? [])].some((t) => t?.toLowerCase().includes(ql)))
  ), [items, shelf, statusFilter, ql]);
  const recipes = useMemo(() => (shelf === "all" || shelf === "recipe") && statusFilter === "any"
    ? meals.items.filter((m) => !m.is_archived && (!ql || [m.title, m.description, ...m.tags].some((t) => t?.toLowerCase().includes(ql))))
    : [], [meals.items, shelf, statusFilter, ql]);

  const saveItem = async () => {
    if (!edit?.title?.trim()) return toast.error("Add a title");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload: any = {
      kind: edit.kind ?? "book", title: edit.title.trim(), creator: edit.creator || null, url: edit.url || null,
      cover_url: edit.cover_url || null, status: edit.status ?? "want", rating: edit.rating || null,
      format: edit.format || null, platform: edit.platform || null, notes: edit.notes || null,
      details: edit.details ?? {}, tags: edit.tags ?? [],
    };
    const res = edit.id
      ? await supabase.from("library_items").update(payload).eq("id", edit.id)
      : await supabase.from("library_items").insert({ ...payload, user_id: u.user.id });
    if (res.error) return toast.error("Couldn't save");
    setEdit(null); load(); toast.success("Saved to your library");
  };
  const removeItem = async (id: string) => {
    await supabase.from("library_items").delete().eq("id", id);
    setEdit(null); load();
  };
  const saveRecipe = async () => {
    const r = recipeEdit;
    if (!r?.title?.trim()) return toast.error("Add a title");
    const patch: Partial<LibraryMeal> = {
      title: r.title.trim(), description: r.description ?? null, prep_minutes: r.prep_minutes ?? null,
      cook_minutes: r.cook_minutes ?? null, servings: r.servings ?? null, notes: r.notes ?? null,
      ingredients: r.ingredients ?? [], steps: r.steps ?? [],
    };
    if (r.id) await meals.update(r.id, patch); else await meals.create(patch as any);
    setRecipeEdit(null); toast.success("Recipe saved");
  };

  const newFor = () => shelf === "recipe" ? setRecipeEdit({ ingredients: [], steps: [] })
    : setEdit({ kind: shelf === "all" ? "book" : shelf, status: "want" });

  const statusOptions = shelf === "book" || shelf === "film" || shelf === "article" ? STATUSES[shelf] : STATUSES.book;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-4">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Library</h1>
          <p className="text-sm text-muted-foreground">Books, films, clipped reads and recipes in one place.</p>
        </div>
        <Button onClick={newFor} className="min-h-11"><Plus className="mr-1 h-4 w-4" />Add</Button>
      </header>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {SHELVES.map((s) => (
          <button key={s.id} onClick={() => { setShelf(s.id); setStatusFilter("any"); }}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm ${shelf === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>
            <s.icon className="h-4 w-4" />{s.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your library" className="min-h-11 pl-9" />
        </div>
        {shelf !== "recipe" && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-h-11 rounded-md border border-input bg-background px-3 text-sm" aria-label="Status">
            <option value="any">Any status</option>
            {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
      </div>

      {shown.length === 0 && recipes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          Nothing here yet. Tap Add to start your shelf.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((i) => {
          const Icon = KIND_ICON[i.kind];
          return (
            <button key={i.id} onClick={() => setEdit(i)} className="flex gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/40">
              {i.cover_url ? <img src={i.cover_url} alt="" className="h-20 w-14 shrink-0 rounded-md object-cover" />
                : <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md bg-secondary/15"><Icon className="h-6 w-6 text-secondary" /></div>}
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug text-foreground break-words">{i.title}</p>
                {i.creator && <p className="truncate text-xs text-muted-foreground">{i.creator}</p>}
                <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{statusLabel(i.kind, i.status)}</span>
                {i.rating ? <Stars value={i.rating} /> : null}
              </div>
            </button>
          );
        })}
        {recipes.map((m) => (
          <div key={m.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
            {m.image_url ? <img src={m.image_url} alt="" className="h-20 w-14 shrink-0 rounded-md object-cover" />
              : <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xl">{m.icon ?? <ChefHat className="h-6 w-6 text-primary" />}</div>}
            <div className="min-w-0 flex-1">
              <button onClick={() => setRecipeEdit(m)} className="text-left font-medium leading-snug text-foreground break-words">{m.title}</button>
              <p className="text-xs text-muted-foreground">
                Recipe{m.prep_minutes || m.cook_minutes ? ` · ${(m.prep_minutes ?? 0) + (m.cook_minutes ?? 0)} min` : ""}{m.servings ? ` · serves ${m.servings}` : ""}
              </p>
              <Button size="sm" variant="outline" className="mt-2 min-h-9" onClick={() => setPlanFor(m)}>
                <CalendarPlus className="mr-1 h-4 w-4" />Add to meal plan
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ItemDialog edit={edit} setEdit={setEdit} onSave={saveItem} onDelete={removeItem} />
      <RecipeDialog r={recipeEdit} setR={setRecipeEdit} onSave={saveRecipe}
        onDelete={async (id) => { await meals.remove(id); setRecipeEdit(null); }} />
      <PlanDialog meal={planFor} onClose={() => setPlanFor(null)} />
    </div>
  );
}

function ItemDialog({ edit, setEdit, onSave, onDelete }: { edit: Partial<Item> | null; setEdit: (v: Partial<Item> | null) => void; onSave: () => void; onDelete: (id: string) => void }) {
  if (!edit) return null;
  const kind = (edit.kind ?? "book") as Kind;
  const set = (p: Partial<Item>) => setEdit({ ...edit, ...p });
  return (
    <Dialog open onOpenChange={(o) => !o && setEdit(null)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{edit.id ? "Edit" : "Add to library"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {!edit.id && (
            <div className="flex gap-2">
              {(["book", "film", "article"] as Kind[]).map((k) => (
                <Button key={k} type="button" size="sm" variant={kind === k ? "default" : "outline"} onClick={() => set({ kind: k, status: "want" })}>
                  {k === "book" ? "Book" : k === "film" ? "Movie/Show" : "Article"}
                </Button>
              ))}
            </div>
          )}
          <Input placeholder="Title" value={edit.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
          <Input placeholder={kind === "book" ? "Author" : kind === "film" ? "Director / creator" : "Publication"} value={edit.creator ?? ""} onChange={(e) => set({ creator: e.target.value })} />
          {kind === "article" && <ArticleLinkRow edit={edit} set={set} />}
          {kind === "book" && <Input placeholder="Format (Print, Audio, E-book)" value={edit.format ?? ""} onChange={(e) => set({ format: e.target.value })} />}
          {kind === "film" && <Input placeholder="Where to watch" value={edit.platform ?? ""} onChange={(e) => set({ platform: e.target.value })} />}
          <Input placeholder="Cover image link (optional)" value={edit.cover_url ?? ""} onChange={(e) => set({ cover_url: e.target.value })} />
          {kind === "article" && <ArticleExtras edit={edit} set={set} />}
          <select value={edit.status ?? "want"} onChange={(e) => set({ status: e.target.value })} className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm" aria-label="Status">
            {STATUSES[kind].map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <Stars value={edit.rating ?? null} onChange={(n) => set({ rating: n })} />
          <Textarea placeholder={kind === "article" ? "Highlights and takeaways" : "Notes, quotes, review"} value={edit.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} rows={4} />
          {edit.url && <a href={edit.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary"><ExternalLink className="h-4 w-4" />Open link</a>}
        </div>
        {edit.id && <ConnectionsPanel type="library" id={edit.id} />}
        <DialogFooter className="gap-2">
          {edit.id && <Button variant="ghost" onClick={() => onDelete(edit.id!)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>}
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const num = (s: string) => (s.trim() ? Number(s) || null : null);

function RecipeDialog({ r, setR, onSave, onDelete }: { r: Partial<LibraryMeal> | null; setR: (v: Partial<LibraryMeal> | null) => void; onSave: () => void; onDelete: (id: string) => void }) {
  if (!r) return null;
  const set = (p: Partial<LibraryMeal>) => setR({ ...r, ...p });
  return (
    <Dialog open onOpenChange={(o) => !o && setR(null)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{r.id ? "Edit recipe" : "New recipe"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Recipe name" value={r.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
          <Input placeholder="Source link or short description" value={r.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <Input inputMode="numeric" placeholder="Prep min" value={r.prep_minutes ?? ""} onChange={(e) => set({ prep_minutes: num(e.target.value) })} />
            <Input inputMode="numeric" placeholder="Cook min" value={r.cook_minutes ?? ""} onChange={(e) => set({ cook_minutes: num(e.target.value) })} />
            <Input inputMode="numeric" placeholder="Serves" value={r.servings ?? ""} onChange={(e) => set({ servings: num(e.target.value) })} />
          </div>
          <Textarea rows={4} placeholder="Ingredients, one per line" defaultValue={(r.ingredients ?? []).join("\n")} onBlur={(e) => set({ ingredients: lines(e.target.value) })} />
          <Textarea rows={4} placeholder="Steps, one per line" defaultValue={(r.steps ?? []).join("\n")} onBlur={(e) => set({ steps: lines(e.target.value) })} />
          <Textarea rows={2} placeholder="Notes" value={r.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
          <p className="text-xs text-muted-foreground">Recipes are shared with your Meals library.</p>
        </div>
        <DialogFooter className="gap-2">
          {r.id && <Button variant="ghost" onClick={() => onDelete(r.id!)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>}
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanDialog({ meal, onClose }: { meal: LibraryMeal | null; onClose: () => void }) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [slot, setSlot] = useState("dinner");
  if (!meal) return null;
  const add = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("meals").insert({
      user_id: u.user.id, date, slot, name: meal.title, prep_minutes: meal.prep_minutes ?? null,
      ingredients: meal.ingredients ?? [], steps: meal.steps ?? [], tags: meal.tags ?? [],
    });
    if (error) return toast.error("Couldn't add to meal plan");
    toast.success(`${meal.title} added to ${slot} on ${format(new Date(date + "T12:00"), "EEE, MMM d")}`);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add “{meal.title}” to meal plan</DialogTitle></DialogHeader>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-11" />
        <div className="flex flex-wrap gap-2">
          {["breakfast", "lunch", "dinner", "snack"].map((s) => (
            <Button key={s} size="sm" variant={slot === s ? "default" : "outline"} onClick={() => setSlot(s)} className="capitalize">{s}</Button>
          ))}
        </div>
        <DialogFooter><Button onClick={add}>Add to plan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArticleLinkRow({ edit, set }: { edit: Partial<Item>; set: (p: Partial<Item>) => void }) {
  const [busy, setBusy] = useState(false);
  const run = async (url = edit.url ?? "") => {
    if (!/^https?:\/\//i.test(url.trim())) return toast.error("Paste a full link starting with https://");
    setBusy(true);
    try {
      const a = await fetchArticle(url.trim());
      set({
        url: a.url, title: edit.title?.trim() ? edit.title : a.title ?? edit.title,
        creator: edit.creator || [a.author, a.site].filter(Boolean).join(" · ") || null,
        cover_url: edit.cover_url || a.image || null,
        tags: Array.from(new Set([...(edit.tags ?? []), ...a.tags])),
        details: { ...(edit.details ?? {}), summary: a.summary, takeaways: a.takeaways, publication: a.site, reading_minutes: a.reading_minutes },
      });
      if (a.warning) toast.message(a.warning); else toast.success("Details filled in — review and save");
    } catch (e: any) { toast.error(e?.message ?? "Couldn't read this article"); }
    finally { setBusy(false); }
  };
  return (
    <div className="flex gap-2">
      <Input placeholder="Link (https://…)" value={edit.url ?? ""} className="min-w-0 flex-1"
        onChange={(e) => set({ url: e.target.value })}
        onPaste={(e) => { const t = e.clipboardData.getData("text"); if (/^https?:\/\//i.test(t.trim()) && !edit.title) setTimeout(() => run(t), 0); }} />
      <Button type="button" variant="outline" className="min-h-10 shrink-0" disabled={busy} onClick={() => run()}>
        {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}Fetch details
      </Button>
    </div>
  );
}

function ArticleExtras({ edit, set }: { edit: Partial<Item>; set: (p: Partial<Item>) => void }) {
  const [cover, setCover] = useState(false);
  const [clipping, setClipping] = useState(false);
  const d = edit.details ?? {};
  const setD = (p: ArticleDetails) => set({ details: { ...d, ...p } });
  const makeCover = async () => {
    if (!edit.title?.trim()) return toast.error("Add a title first");
    setCover(true);
    try { const r = await generateCover(edit.title, d.summary); set({ cover_url: r.cover_url, details: { ...d, ai_cover: true } }); toast.success("Cover created"); }
    catch (e: any) { toast.error(e?.message ?? "Couldn't create a cover"); }
    finally { setCover(false); }
  };
  const clip = async () => {
    if (!edit.id) return toast.error("Save the article first");
    if (!edit.url) return toast.error("Add the article link first");
    setClipping(true);
    try { await clipToDailyNote({ id: edit.id, title: edit.title ?? "Article", url: edit.url, creator: edit.creator, details: d }); toast.success("Clipped to today's Daily Note"); }
    catch { toast.error("Couldn't clip to your Daily Note"); }
    finally { setClipping(false); }
  };
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3">
      <div className="flex gap-3">
        {edit.cover_url ? <img src={edit.cover_url} alt="" className="h-24 w-16 shrink-0 rounded-md object-cover" />
          : <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-md bg-secondary/15"><Newspaper className="h-6 w-6 text-secondary" /></div>}
        <div className="min-w-0 flex-1 space-y-2">
          {d.reading_minutes ? <p className="text-xs text-muted-foreground">{d.publication ? `${d.publication} · ` : ""}{d.reading_minutes} min read</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="min-h-10" disabled={cover} onClick={makeCover}>
              {cover ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}{edit.cover_url ? "New AI cover" : "Generate cover"}
            </Button>
            <Button type="button" size="sm" variant="outline" className="min-h-10" disabled={clipping || !edit.id} onClick={clip}>
              {clipping ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <NotebookPen className="mr-1 h-4 w-4" />}Clip to Daily Note
            </Button>
          </div>
          {!edit.id && <p className="text-xs text-muted-foreground">Save first to clip it into today's note.</p>}
        </div>
      </div>
      <Textarea rows={3} placeholder="Summary" value={d.summary ?? ""} onChange={(e) => setD({ summary: e.target.value })} />
      <Textarea rows={3} placeholder="Key takeaways, one per line" value={(d.takeaways ?? []).join("\n")}
        onChange={(e) => setD({ takeaways: e.target.value.split("\n") })}
        onBlur={(e) => setD({ takeaways: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) })} />
    </div>
  );
}
