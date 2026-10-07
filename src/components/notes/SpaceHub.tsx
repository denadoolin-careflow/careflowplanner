/**
 * Connected Spaces. A space is a named group of tags plus explicitly linked
 * notes, tasks and projects. Custom spaces sync via the note_spaces table.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckSquare, FileText, FolderKanban, Link2, Plus, Unlink, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { openTaskQuickEdit } from "@/lib/open-task-quick-edit";
import type { Note } from "@/lib/notes";

export type CustomSpace = {
  id: string; name: string; tags: string[];
  noteIds?: string[]; taskIds?: string[]; projectIds?: string[]; hiddenIds?: string[];
};
const LEGACY_KEY = "careflow:note-spaces:v1";
const db = supabase as any;
const fromRow = (r: any): CustomSpace => ({ id: r.id, name: r.name, tags: r.tags ?? [], noteIds: r.note_ids ?? [], taskIds: r.task_ids ?? [], projectIds: r.project_ids ?? [], hiddenIds: r.hidden_ids ?? [] });

export function useCustomSpaces() {
  const [spaces, setSpaces] = useState<CustomSpace[]>([]);
  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    // One-time migration of device-local spaces.
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
      if (Array.isArray(legacy) && legacy.length) {
        await db.from("note_spaces").insert(legacy.map((s: CustomSpace) => ({ user_id: u.user!.id, name: s.name, tags: s.tags ?? [] })));
        localStorage.removeItem(LEGACY_KEY);
      }
    } catch { /* ignore */ }
    const { data } = await db.from("note_spaces").select("*").order("created_at");
    setSpaces((data ?? []).map(fromRow));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async (s: { name: string; tags: string[] }) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    const { data, error } = await db.from("note_spaces").insert({ user_id: u.user.id, name: s.name, tags: s.tags }).select().single();
    if (error) return toast.error("Could not create space");
    setSpaces(prev => [...prev, fromRow(data)]);
  };
  const remove = async (id: string) => {
    setSpaces(prev => prev.filter(s => s.id !== id));
    await db.from("note_spaces").delete().eq("id", id);
  };
  const update = async (id: string, patch: Partial<CustomSpace>) => {
    setSpaces(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    const row: any = {};
    if (patch.noteIds) row.note_ids = patch.noteIds;
    if (patch.taskIds) row.task_ids = patch.taskIds;
    if (patch.projectIds) row.project_ids = patch.projectIds;
    if (patch.hiddenIds) row.hidden_ids = patch.hiddenIds;
    const { error } = await db.from("note_spaces").update(row).eq("id", id);
    if (error) toast.error("Could not save space");
  };
  return { spaces, create, remove, update };
}

export function NewSpaceForm({ onCreate }: { onCreate: (s: { name: string; tags: string[] }) => void }) {
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const submit = () => {
    const n = name.trim(); if (!n) return;
    const t = (tags.trim() ? tags.split(",") : [n]).map(x => x.trim().replace(/^#/, "").toLowerCase()).filter(Boolean);
    onCreate({ name: n, tags: t });
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

function LinkPicker({ label, items, onPick }: { label: string; items: { id: string; title: string }[]; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const shown = items.filter(i => i.title.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1 text-xs" aria-label={`Link a ${label}`}><Link2 className="h-3.5 w-3.5" />Link</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${label}s…`} className="mb-2 h-9 text-sm" aria-label={`Search ${label}s`} />
        <ul className="max-h-64 overflow-y-auto">
          {shown.map(i => <li key={i.id}><button type="button" className="block min-h-9 w-full truncate rounded px-2 py-2 text-left text-sm hover:bg-muted" onClick={() => { onPick(i.id); setOpen(false); setQ(""); }}>{i.title || "Untitled"}</button></li>)}
          {!shown.length && <li className="px-2 py-2 text-xs text-muted-foreground">Nothing to link.</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function SpaceHub({ name, tags, notes, space, onUpdate, onClose }: {
  name: string; tags: string[]; notes: Note[];
  space?: CustomSpace; onUpdate?: (id: string, patch: Partial<CustomSpace>) => void; onClose: () => void;
}) {
  const { state, addTask } = useStore();
  const [draft, setDraft] = useState("");
  const set = useMemo(() => new Set(tags.map(t => t.toLowerCase())), [tags]);
  const has = (arr?: string[]) => (arr ?? []).some(t => set.has(t.toLowerCase()));
  const hidden = new Set(space?.hiddenIds ?? []);
  const nIds = new Set(space?.noteIds ?? []);
  const tIds = new Set(space?.taskIds ?? []);
  const pIds = new Set(space?.projectIds ?? []);

  const spaceNotes = notes.filter(n => !hidden.has(n.id) && (nIds.has(n.id) || has(n.tags)));
  const tasks = (state.tasks ?? []).filter(t => !hidden.has(t.id) && !t.done && (tIds.has(t.id) || has(t.tags))).slice(0, 12);
  const noteProjectIds = new Set(spaceNotes.map(n => n.projectId).filter(Boolean) as string[]);
  const projects = (state.projects ?? []).filter((p: any) => !p.archivedAt && !hidden.has(p.id) && (pIds.has(p.id) || noteProjectIds.has(p.id) || set.has(String(p.name).toLowerCase()) || has(p.tags)));

  const editable = !!space && !!onUpdate;
  const link = (kind: "noteIds" | "taskIds" | "projectIds", id: string) => {
    if (!space || !onUpdate) return;
    onUpdate(space.id, { [kind]: [...new Set([...(space[kind] ?? []), id])], hiddenIds: (space.hiddenIds ?? []).filter(h => h !== id) });
    toast.success(`Linked to ${name}`);
  };
  const unlink = (kind: "noteIds" | "taskIds" | "projectIds", id: string) => {
    if (!space || !onUpdate) return;
    onUpdate(space.id, { [kind]: (space[kind] ?? []).filter(x => x !== id), hiddenIds: [...new Set([...(space.hiddenIds ?? []), id])] });
    toast.success(`Unlinked from ${name}`);
  };

  const add = async () => {
    const title = draft.trim(); if (!title) return;
    await addTask({ title, tags: [tags[0] ?? name.toLowerCase()] } as any);
    setDraft(""); toast.success(`Task added to ${name}`);
  };

  const UnlinkBtn = ({ kind, id, title }: { kind: "noteIds" | "taskIds" | "projectIds"; id: string; title: string }) => editable
    ? <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={`Unlink ${title}`} onClick={() => unlink(kind, id)}><Unlink className="h-3.5 w-3.5" /></Button>
    : null;
  const Head = ({ icon: I, label, picker }: { icon: any; label: string; picker?: React.ReactNode }) => (
    <div className="mb-1 flex items-center justify-between"><h3 className="flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground"><I className="h-3 w-3" />{label}</h3>{editable && picker}</div>
  );
  const shownNoteIds = new Set(spaceNotes.map(n => n.id));
  const shownTaskIds = new Set(tasks.map(t => t.id));
  const shownProjectIds = new Set(projects.map((p: any) => p.id));

  return (
    <section aria-label={`${name} space`} className="mb-4 rounded-2xl border border-border/60 bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-display text-lg font-semibold">{name}</h2>
        <span className="text-xs text-muted-foreground">{spaceNotes.length} notes · {tasks.length} open tasks · {projects.length} projects</span>
        <Button variant="ghost" size="icon" className="ml-auto h-9 w-9" onClick={onClose} aria-label="Leave space"><X className="h-4 w-4" /></Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Head icon={FileText} label="Notes" picker={<LinkPicker label="note" items={notes.filter(n => !shownNoteIds.has(n.id)).map(n => ({ id: n.id, title: n.title }))} onPick={id => link("noteIds", id)} />} />
          <ul className="space-y-0.5">{spaceNotes.slice(0, 8).map(n => <li key={n.id} className="flex items-center"><Link to={`/notes/${n.id}`} className="block min-h-9 min-w-0 flex-1 truncate rounded px-1.5 py-2 text-sm hover:bg-muted">{n.title || "Untitled"}</Link><UnlinkBtn kind="noteIds" id={n.id} title={n.title || "note"} /></li>)}
            {!spaceNotes.length && <li className="px-1.5 text-xs text-muted-foreground">Link a note or tag it #{tags[0]}.</li>}</ul>
        </div>
        <div>
          <Head icon={CheckSquare} label="Open tasks" picker={<LinkPicker label="task" items={(state.tasks ?? []).filter(t => !t.done && !shownTaskIds.has(t.id)).map(t => ({ id: t.id, title: t.title }))} onPick={id => link("taskIds", id)} />} />
          <ul className="space-y-0.5">{tasks.map(t => <li key={t.id} className="flex items-center"><button type="button" onClick={() => openTaskQuickEdit(t.id)} className="block min-h-9 min-w-0 flex-1 truncate rounded px-1.5 py-2 text-left text-sm hover:bg-muted">{t.title}</button><UnlinkBtn kind="taskIds" id={t.id} title={t.title} /></li>)}</ul>
          <form className="mt-1 flex gap-1" onSubmit={e => { e.preventDefault(); void add(); }}>
            <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a task here…" className="h-9 text-sm" aria-label={`Add a task to ${name}`} />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0" aria-label="Add task"><Plus className="h-4 w-4" /></Button>
          </form>
        </div>
        <div>
          <Head icon={FolderKanban} label="Projects" picker={<LinkPicker label="project" items={(state.projects ?? []).filter((p: any) => !p.archivedAt && !shownProjectIds.has(p.id)).map((p: any) => ({ id: p.id, title: p.name }))} onPick={id => link("projectIds", id)} />} />
          <ul className="space-y-0.5">{projects.map((p: any) => <li key={p.id} className="flex items-center"><Link to={`/projects/${p.id}`} className="block min-h-9 min-w-0 flex-1 truncate rounded px-1.5 py-2 text-sm hover:bg-muted">{p.name}</Link><UnlinkBtn kind="projectIds" id={p.id} title={p.name} /></li>)}
            {!projects.length && <li className="px-1.5 text-xs text-muted-foreground">Link a project to connect it.</li>}</ul>
        </div>
      </div>
      {!editable && <p className="mt-2 text-[11px] text-muted-foreground">Built-in spaces follow tags. Create your own space to link items directly.</p>}
    </section>
  );
}
