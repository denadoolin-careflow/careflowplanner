import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookTemplate, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createNote, updateNote } from "@/lib/notes";
import {
  createNoteTemplate, deleteNoteTemplate, listNoteTemplates, type NoteTemplate,
} from "@/lib/note-templates";

interface Props {
  trigger?: React.ReactNode;
  /** When provided, shows a "Save current note" tab to capture the note as a template. */
  source?: {
    title: string;
    body: string;
    icon?: string | null;
    coverGradient?: string | null;
    tags?: string[];
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Default tab. */
  defaultTab?: "apply" | "save";
}

export function NoteTemplatesDialog({ trigger, source, open: openProp, onOpenChange, defaultTab = "apply" }: Props) {
  const navigate = useNavigate();
  const [openInner, setOpenInner] = useState(false);
  const open = openProp ?? openInner;
  const setOpen = (v: boolean) => { onOpenChange?.(v); setOpenInner(v); };

  const [items, setItems] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listNoteTemplates().then(setItems).catch(e => toast.error(e.message)).finally(() => setLoading(false));
    setName(source?.title?.trim() || "");
  }, [open, source?.title]);

  const apply = async (tpl: NoteTemplate) => {
    try {
      const n = await createNote({ title: tpl.name, body: tpl.body });
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
    try {
      await deleteNoteTemplate(id);
      setItems(s => s.filter(x => x.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="h-4 w-4" /> Note templates
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={source ? defaultTab : "apply"}>
          <TabsList className={`grid w-full ${source ? "grid-cols-2" : "grid-cols-1"}`}>
            <TabsTrigger value="apply">Apply</TabsTrigger>
            {source && <TabsTrigger value="save">Save current note</TabsTrigger>}
          </TabsList>

          <TabsContent value="apply" className="mt-3">
            {loading ? (
              <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No templates yet. Open any note and choose “Save as template” to start your library.
              </p>
            ) : (
              <ScrollArea className="max-h-[360px] pr-2">
                <div className="space-y-2">
                  {items.map(t => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/70 p-2.5 shadow-soft"
                    >
                      <button
                        type="button"
                        onClick={() => apply(t)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted/60 text-base">
                          {t.icon ?? <FileText className="h-4 w-4 text-muted-foreground" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{t.name}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {t.tags.length ? t.tags.map(x => `#${x}`).join(" ") : `${t.body.split(/\s+/).filter(Boolean).length} words`}
                          </span>
                        </span>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button size="sm" className="h-7 rounded-full text-xs" onClick={() => apply(t)}>Use</Button>
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
              <Button onClick={save} disabled={!name.trim() || saving} className="w-full rounded-full">
                {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
                Save as template
              </Button>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}