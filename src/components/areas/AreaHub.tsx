import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink, Link2, Plus, Trash2, Target, Sparkles, BookOpen, NotebookPen } from "lucide-react";
import {
  listAreaResources, createAreaResource, deleteAreaResource, updateAreaResource,
  type AreaResource,
} from "@/lib/area-resources";
import { toast } from "sonner";

function ResourceForm({ areaName, existing, onSaved }: { areaName: string; existing?: AreaResource; onSaved: () => void; }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [desc, setDesc] = useState(existing?.description ?? "");

  const submit = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    try {
      if (existing) {
        await updateAreaResource(existing.id, { title: title.trim(), url: url.trim() || undefined, description: desc.trim() || undefined });
      } else {
        await createAreaResource(areaName, { title: title.trim(), url: url.trim() || undefined, description: desc.trim() || undefined, kind: "link" });
      }
      onSaved();
      setOpen(false);
      if (!existing) { setTitle(""); setUrl(""); setDesc(""); }
    } catch (e: any) {
      toast.error("Save failed", { description: e?.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {existing
          ? <button className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary">Edit</button>
          : <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add resource</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{existing ? "Edit resource" : "New resource"}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Input placeholder="URL (optional)" value={url} onChange={e => setUrl(e.target.value)} />
          <Input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>{existing ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Card({ children, title, icon: Icon }: { children: React.ReactNode; title: string; icon: any }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function AreaHub({ areaName }: { areaName: string }) {
  const { state } = useStore();
  const [resources, setResources] = useState<AreaResource[]>([]);

  const load = async () => {
    try { setResources(await listAreaResources(areaName)); } catch {}
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [areaName]);

  const relatedGoals = (state.goals ?? []).filter(g =>
    (g.category ?? "").toLowerCase() === areaName.toLowerCase()
    || (g.title ?? "").toLowerCase().includes(areaName.toLowerCase())
  );
  const relatedHabits = (state.habits ?? []).filter(h =>
    (h.category ?? "").toLowerCase() === areaName.toLowerCase()
  );
  const relatedJournal = (state.journal ?? [])
    .filter(j => (j.tags ?? []).some(t => t.toLowerCase() === areaName.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Pinned resources" icon={Link2}>
        {resources.length === 0 ? (
          <p className="mb-2 text-xs italic text-muted-foreground">No resources yet — pin links, references, or guides for this area.</p>
        ) : (
          <ul className="mb-2 space-y-1.5">
            {resources.map(r => (
              <li key={r.id} className="group flex items-center gap-2 rounded-lg border border-border/40 px-2 py-1.5">
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-2 truncate text-sm hover:text-primary">
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{r.title}</span>
                  </a>
                ) : (
                  <span className="flex-1 truncate text-sm">{r.title}</span>
                )}
                <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <ResourceForm areaName={areaName} existing={r} onSaved={load} />
                  <button
                    onClick={async () => { await deleteAreaResource(r.id); load(); }}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <ResourceForm areaName={areaName} onSaved={load} />
      </Card>

      <Card title="Linked goals" icon={Target}>
        {relatedGoals.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No goals match this area yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {relatedGoals.map(g => (
              <li key={g.id} className="rounded-lg border border-border/40 px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{g.title}</span>
                  <span className="text-[10px] text-muted-foreground">{g.progress ?? 0}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${g.progress ?? 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link to="/goals" className="mt-2 inline-block text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary">Open goals →</Link>
      </Card>

      <Card title="Linked habits" icon={Sparkles}>
        {relatedHabits.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No habits in this category.</p>
        ) : (
          <ul className="space-y-1.5">
            {relatedHabits.map(h => (
              <li key={h.id} className="flex items-center justify-between rounded-lg border border-border/40 px-2.5 py-1.5 text-sm">
                <span className="truncate">{h.title}</span>
                <span className="text-[10px] text-muted-foreground">🔥 {h.streak}</span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/habits" className="mt-2 inline-block text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary">Open habits →</Link>
      </Card>

      <Card title="Journal & notes" icon={NotebookPen}>
        {relatedJournal.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">Tag a journal entry with "{areaName}" to surface it here.</p>
        ) : (
          <ul className="space-y-1.5">
            {relatedJournal.map(j => (
              <li key={j.id} className="rounded-lg border border-border/40 px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{j.title || j.body.slice(0, 60)}</span>
                  <span className="text-[10px] text-muted-foreground">{j.date}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link to="/journal" className="mt-2 inline-block text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary">Open journal →</Link>
      </Card>
    </div>
  );
}