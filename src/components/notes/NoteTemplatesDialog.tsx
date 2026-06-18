import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookTemplate, FileText, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { createNote, updateNote } from "@/lib/notes";
import {
  applyTemplatePlaceholders,
  createNoteTemplate,
  deleteNoteTemplate,
  listNoteTemplates,
  TEMPLATE_PLACEHOLDER_HELP,
  updateNoteTemplate,
  type NoteTemplate,
} from "@/lib/note-templates";

interface Props {
  trigger?: React.ReactNode;
  /** When provided, shows a "Save current note" tab. */
  source?: {
    title: string;
    body: string;
    icon?: string | null;
    coverGradient?: string | null;
    tags?: string[];
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultTab?: "apply" | "save";
}

const ALL = "__all__";

export function NoteTemplatesDialog({ trigger, source, open: openProp, onOpenChange, defaultTab = "apply" }: Props) {
  const navigate = useNavigate();
  const [openInner, setOpenInner] = useState(false);
  const open = openProp ?? openInner;
  const setOpen = (v: boolean) => { onOpenChange?.(v); setOpenInner(v); };

  const [items, setItems] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>(ALL);
  const [editing, setEditing] = useState<NoteTemplate | null>(null);

  // Save form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listNoteTemplates().then(setItems).catch(e => toast.error(e.message)).finally(() => setLoading(false));
    setName(source?.title?.trim() || "");
    setCategory("");
    setDescription("");
    setQuery("");
    setActiveCat(ALL);
    setEditing(null);
  }, [open, source?.title]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of items) if (t.category && t.category.trim()) set.add(t.category.trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(t => {
      if (activeCat !== ALL) {
        const cat = (t.category ?? "").trim();
        if (activeCat === "__uncategorized__" ? cat : cat !== activeCat) return false;
      }
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q) ||
        t.tags.some(x => x.toLowerCase().includes(q)) ||
        t.body.toLowerCase().includes(q)
      );
    });
  }, [items, query, activeCat]);

  const apply = async (tpl: NoteTemplate) => {
    try {
      const now = new Date();
      const filledTitle = applyTemplatePlaceholders(tpl.name, now);
      const filledBody = applyTemplatePlaceholders(tpl.body, now);
      const n = await createNote({ title: filledTitle, body: filledBody });
      await updateNote(n.id, {
        icon: tpl.icon ?? undefined,
        coverGradient: tpl.coverGradient ?? undefined,
        tags: tpl.tags,
      });
      toast.success(`Created from “${tpl.name}”`);
      setOpen(false);
      navigate(`/notes/${n.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't apply template");
    }
  };

  const save = async () => {
    if (!source || !name.trim()) return;
    setSaving(true);
    try {
      await createNoteTemplate({
        name: name.trim(),
        body: source.body,
        icon: source.icon ?? null,
        coverGradient: source.coverGradient ?? null,
        tags: source.tags ?? [],
        category: category.trim() || null,
        description: description.trim() || null,
      });
      toast.success("Template saved");
      const fresh = await listNoteTemplates();
      setItems(fresh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save template");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await deleteNoteTemplate(id);
      setItems(s => s.filter(x => x.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await updateNoteTemplate(editing.id, {
        name: editing.name.trim() || "Untitled",
        description: editing.description?.trim() || null,
        category: editing.category?.trim() || null,
        body: editing.body,
      });
      toast.success("Template updated");
      const fresh = await listNoteTemplates();
      setItems(fresh);
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="h-4 w-4" /> Note templates
          </DialogTitle>
        </DialogHeader>

        {editing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Edit template</p>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                <X className="mr-1 h-3.5 w-3.5" /> Close
              </Button>
            </div>
            <Input
              placeholder="Template name"
              value={editing.name}
              onChange={e => setEditing({ ...editing, name: e.target.value })}
            />
            <Input
              placeholder="Category (optional)"
              value={editing.category ?? ""}
              onChange={e => setEditing({ ...editing, category: e.target.value })}
              list="note-template-categories"
            />
            <Input
              placeholder="Short description"
              value={editing.description ?? ""}
              onChange={e => setEditing({ ...editing, description: e.target.value })}
            />
            <Textarea
              rows={10}
              className="font-mono text-[12.5px]"
              value={editing.body}
              onChange={e => setEditing({ ...editing, body: e.target.value })}
            />
            <PlaceholderHint />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEdit}>Save changes</Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue={source ? defaultTab : "apply"}>
            <TabsList className={`grid w-full ${source ? "grid-cols-2" : "grid-cols-1"}`}>
              <TabsTrigger value="apply">Library</TabsTrigger>
              {source && <TabsTrigger value="save">Save current note</TabsTrigger>}
            </TabsList>

            <TabsContent value="apply" className="mt-3 space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search templates…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>

              {(categories.length > 0 || items.some(i => !i.category)) && (
                <div className="flex flex-wrap gap-1.5">
                  <CatChip active={activeCat === ALL} onClick={() => setActiveCat(ALL)} label="All" count={items.length} />
                  {categories.map(c => (
                    <CatChip
                      key={c}
                      active={activeCat === c}
                      onClick={() => setActiveCat(c)}
                      label={c}
                      count={items.filter(i => (i.category ?? "") === c).length}
                    />
                  ))}
                  {items.some(i => !i.category) && (
                    <CatChip
                      active={activeCat === "__uncategorized__"}
                      onClick={() => setActiveCat("__uncategorized__")}
                      label="Uncategorized"
                      count={items.filter(i => !i.category).length}
                    />
                  )}
                </div>
              )}

              {loading ? (
                <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </p>
              ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {items.length === 0
                    ? "No templates yet. Open any note and choose “Save as template” to start your library."
                    : "No templates match your search."}
                </p>
              ) : (
                <ScrollArea className="max-h-[360px] pr-2">
                  <div className="space-y-2">
                    {filtered.map(t => (
                      <div
                        key={t.id}
                        className="flex items-start justify-between gap-2 rounded-xl border border-border/60 bg-card/70 p-2.5 shadow-soft"
                      >
                        <button
                          type="button"
                          onClick={() => apply(t)}
                          className="flex min-w-0 flex-1 items-start gap-2 text-left"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted/60 text-base">
                            {t.icon ?? <FileText className="h-4 w-4 text-muted-foreground" />}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">{t.name}</span>
                              {t.category && (
                                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  {t.category}
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                              {t.description || (t.tags.length ? t.tags.map(x => `#${x}`).join(" ") : `${t.body.split(/\s+/).filter(Boolean).length} words`)}
                            </span>
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button size="sm" className="h-7 rounded-full text-xs" onClick={() => apply(t)}>Use</Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setEditing({ ...t })}
                            aria-label="Edit template"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => remove(t.id)}
                            aria-label="Delete template"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <PlaceholderHint />
            </TabsContent>

            {source && (
              <TabsContent value="save" className="mt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Saves the current note’s body, icon, cover gradient, and tags as a reusable template.
                </p>
                <Input
                  placeholder="Template name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                <Input
                  placeholder="Category (e.g. Meetings, Care, Journal)"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  list="note-template-categories"
                />
                <datalist id="note-template-categories">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
                <Input
                  placeholder="Short description (optional)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
                <Button onClick={save} disabled={!name.trim() || saving} className="w-full rounded-full">
                  {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
                  Save as template
                </Button>
                <PlaceholderHint />
              </TabsContent>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CatChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "border-primary/50 bg-primary/15 text-foreground"
          : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {label}
      <span className="text-[10px] opacity-70">{count}</span>
    </button>
  );
}

function PlaceholderHint() {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
      <span className="font-medium text-foreground">Tip:</span> use placeholders that auto-fill on creation —{" "}
      {TEMPLATE_PLACEHOLDER_HELP.map((p, i) => (
        <span key={p}>
          <code className="rounded bg-card/60 px-1 py-0.5 text-[10.5px] text-foreground">{p}</code>
          {i < TEMPLATE_PLACEHOLDER_HELP.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
}