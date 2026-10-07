/**
 * Connected Spaces. A space is a named group of tags; when one is active the
 * hub shows the notes, open tasks and projects that share it, so a space
 * connects notes ↔ tasks ↔ projects. Custom spaces are device-local.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckSquare, FileText, FolderKanban, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { openTaskQuickEdit } from "@/lib/open-task-quick-edit";
import type { Note } from "@/lib/notes";

export type CustomSpace = { id: string; name: string; tags: string[] };
const KEY = "careflow:note-spaces:v1";
export function readCustomSpaces(): CustomSpace[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function useCustomSpaces(): [CustomSpace[], (next: CustomSpace[]) => void] {
  const [spaces, setSpaces] = useState<CustomSpace[]>(readCustomSpaces);
  return [spaces, (next) => { setSpaces(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ } }];
}

export function NewSpaceForm({ onCreate }: { onCreate: (s: CustomSpace) => void }) {
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const submit = () => {
    const n = name.trim(); if (!n) return;
    const t = (tags.trim() ? tags.split(",") : [n]).map(x => x.trim().replace(/^#/, "").toLowerCase()).filter(Boolean);
    onCreate({ id: crypto.randomUUID(), name: n, tags: t });
    setName(""); setTags("");
  };
  return (
    <form className="mt-2 space-y-2 rounded-xl border border-border/50 p-2" onSubmit={e => { e.preventDefault(); submit(); }}>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Space name (e.g. Garden)" className="h-9 text-sm" aria-label="Space name" />
      <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags, comma separated (optional)" className="h-9 text-sm" aria-label="Space tags" />
      <Button type="submit" size="sm" className="h-9 w-full gap-1"><Plus className="h-3.5 w-3.5" />Create space</Button>
    </form>
  );
}

export function SpaceHub({ name, tags, notes, onClose }: { name: string; tags: string[]; notes: Note[]; onClose: () => void }) {
  const { state, addTask } = useStore();
  const [draft, setDraft] = useState("");
  const set = useMemo(() => new Set(tags.map(t => t.toLowerCase())), [tags]);
  const has = (arr?: string[]) => (arr ?? []).some(t => set.has(t.toLowerCase()));
  const spaceNotes = useMemo(() => notes.filter(n => has(n.tags)), [notes, set]); // eslint-disable-line react-hooks/exhaustive-deps
  const tasks = useMemo(() => (state.tasks ?? []).filter(t => !t.done && has(t.tags)).slice(0, 8), [state.tasks, set]); // eslint-disable-line react-hooks/exhaustive-deps
  const projects = useMemo(() => {
    const ids = new Set(spaceNotes.map(n => n.projectId).filter(Boolean) as string[]);
    return (state.projects ?? []).filter((p: any) => !p.archivedAt && (ids.has(p.id) || set.has(String(p.name).toLowerCase()) || has(p.tags)));
  }, [state.projects, spaceNotes, set]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    const title = draft.trim(); if (!title) return;
    await addTask({ title, tags: [tags[0] ?? name.toLowerCase()] } as any);
    setDraft(""); toast.success(`Task added to ${name}`);
  };

  return (
    <section aria-label={`${name} space`} className="mb-4 rounded-2xl border border-border/60 bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-display text-lg font-semibold">{name}</h2>
        <span className="text-xs text-muted-foreground">{spaceNotes.length} notes · {tasks.length} open tasks · {projects.length} projects</span>
        <Button variant="ghost" size="icon" className="ml-auto h-9 w-9" onClick={onClose} aria-label="Leave space"><X className="h-4 w-4" /></Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <h3 className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground"><FileText className="h-3 w-3" />Recent notes</h3>
          <ul className="space-y-0.5">{spaceNotes.slice(0, 5).map(n => <li key={n.id}><Link to={`/notes/${n.id}`} className="block min-h-9 truncate rounded px-1.5 py-2 text-sm hover:bg-muted">{n.title || "Untitled"}</Link></li>)}
            {!spaceNotes.length && <li className="px-1.5 text-xs text-muted-foreground">Tag a note #{tags[0]} to add it.</li>}</ul>
        </div>
        <div>
          <h3 className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground"><CheckSquare className="h-3 w-3" />Open tasks</h3>
          <ul className="space-y-0.5">{tasks.map(t => <li key={t.id}><button type="button" onClick={() => openTaskQuickEdit(t.id)} className="block min-h-9 w-full truncate rounded px-1.5 py-2 text-left text-sm hover:bg-muted">{t.title}</button></li>)}</ul>
          <form className="mt-1 flex gap-1" onSubmit={e => { e.preventDefault(); void add(); }}>
            <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a task here…" className="h-9 text-sm" aria-label={`Add a task to ${name}`} />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0" aria-label="Add task"><Plus className="h-4 w-4" /></Button>
          </form>
        </div>
        <div>
          <h3 className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground"><FolderKanban className="h-3 w-3" />Projects</h3>
          <ul className="space-y-0.5">{projects.map((p: any) => <li key={p.id}><Link to={`/projects/${p.id}`} className="block min-h-9 truncate rounded px-1.5 py-2 text-sm hover:bg-muted">{p.name}</Link></li>)}
            {!projects.length && <li className="px-1.5 text-xs text-muted-foreground">Set a note’s Project property to connect one.</li>}</ul>
        </div>
      </div>
    </section>
  );
}
