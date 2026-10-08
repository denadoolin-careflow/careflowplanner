import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, FileText, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { Note } from "@/lib/notes";
import { noteDisplayTitle } from "@/lib/notes/periods";
import type { CustomSpace } from "./SpaceHub";
import { cn } from "@/lib/utils";

export function SpaceSideBranch({ space, custom, notes, active, onSelect, filter = "" }: {
  space: { name: string; tags: readonly string[]; customId?: string; icon: React.ComponentType<{ className?: string }> };
  custom?: CustomSpace; notes: Note[]; active: boolean; onSelect: () => void; filter?: string;
}) {
  const { state } = useStore();
  const key = custom?.id ?? space.name;
  const [expanded, setExpanded] = useState(() => { try { return localStorage.getItem(`careflow:notes:space-open:${key}`) === "1"; } catch { return false; } });
  const hidden = new Set(custom?.hiddenIds ?? []);
  const has = (tags?: string[]) => (tags ?? []).some(t => space.tags.some(s => s.toLowerCase() === t.toLowerCase()));
  const linked = notes.filter(n => !hidden.has(n.id) && (custom?.noteIds?.includes(n.id) || has(n.tags)));
  const noteProjects = new Set(linked.map(n => n.projectId));
  const projects = (state.projects ?? []).filter(p => !p.archivedAt && !hidden.has(p.id) && (custom?.projectIds?.includes(p.id) || noteProjects.has(p.id) || space.tags.some(t => t.toLowerCase() === p.name.toLowerCase()) || has((p as { tags?: string[] }).tags)));
  const q = filter.trim().toLowerCase();
  const nameMatches = !q || space.name.toLowerCase().includes(q);
  const shownNotes = linked.filter(n => nameMatches || noteDisplayTitle(n).toLowerCase().includes(q));
  const shownProjects = projects.filter(p => nameMatches || p.name.toLowerCase().includes(q));
  if (!nameMatches && !shownNotes.length && !shownProjects.length) return null;
  const allNotes = !custom && space.tags.length === 0;
  const open = expanded || Boolean(q);
  return <li>
    <div className="flex items-center">
      {!allNotes && <Button variant="ghost" size="icon" className="h-11 w-8 shrink-0 rounded-lg" aria-label={`${open ? "Collapse" : "Expand"} ${space.name} space`} aria-expanded={open} onClick={() => { setExpanded(!open); localStorage.setItem(`careflow:notes:space-open:${key}`, open ? "0" : "1"); }}><ChevronDown aria-hidden className={cn("h-3.5 w-3.5", !open && "-rotate-90")} /></Button>}
      <Button variant="ghost" onClick={onSelect} aria-current={active ? "page" : undefined} aria-label={`${space.name} space, ${allNotes ? notes.length : linked.length} notes`}
        className={cn("min-h-11 min-w-0 flex-1 justify-start rounded-lg px-2 text-sm", active && "bg-primary/15 font-medium text-foreground")}>
        <space.icon aria-hidden className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate text-left">{space.name}</span><span aria-hidden className="text-[10px] text-muted-foreground">{allNotes ? notes.length : linked.length}</span>
      </Button>
    </div>
    {!allNotes && open && <div className="ml-4 space-y-1 border-l border-border/60 pl-2">
      {shownNotes.length > 0 && <><h3 className="px-2 pt-2 text-[10px] font-semibold text-muted-foreground">Notes · {shownNotes.length}</h3><ul>{shownNotes.map(n => <li key={n.id}><Button asChild variant="ghost" className="min-h-11 w-full justify-start rounded-lg px-2 text-xs"><Link to={`/notes/${n.id}`}><FileText aria-hidden className="h-3.5 w-3.5" /><span className="truncate">{noteDisplayTitle(n, true)}</span></Link></Button></li>)}</ul></>}
      {shownProjects.length > 0 && <><h3 className="px-2 pt-2 text-[10px] font-semibold text-muted-foreground">Projects · {shownProjects.length}</h3><ul>{shownProjects.map(p => <li key={p.id}><Button asChild variant="ghost" className="min-h-11 w-full justify-start rounded-lg px-2 text-xs"><Link to={`/projects/${p.id}`}><FolderKanban aria-hidden className="h-3.5 w-3.5" /><span className="truncate">{p.name}</span></Link></Button></li>)}</ul></>}
      {!shownNotes.length && !shownProjects.length && <p className="px-2 py-2 text-xs text-muted-foreground">No linked notes or projects.</p>}
    </div>}
  </li>;
}