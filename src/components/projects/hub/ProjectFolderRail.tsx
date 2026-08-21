/**
 * Folder rail — ClickUp-style grouping above the project grid.
 * Chips filter the grid and double as drop targets: drag a project card onto a
 * folder to file it there.
 */
import { useState } from "react";
import { Folder, FolderPlus, FolderOpen, Pencil, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProjectFolders } from "@/lib/project-folders";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export const PROJECT_DND_TYPE = "application/x-careflow-project";

export function ProjectFolderRail({
  projects,
  value,
  onChange,
  onFileProject,
}: {
  projects: Project[];
  /** "all" | "none" | folder id */
  value: string;
  onChange: (next: string) => void;
  onFileProject: (projectId: string, folderId: string | null) => void;
}) {
  const { folders, add, update, remove } = useProjectFolders();
  const [draft, setDraft] = useState("");
  const [over, setOver] = useState<string | null>(null);

  const countIn = (id: string | null) =>
    projects.filter(p => (p.folderId ?? null) === id).length;

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData(PROJECT_DND_TYPE) || e.dataTransfer.getData("text/plain");
    if (id) onFileProject(id, folderId);
  };

  const dropProps = (key: string, folderId: string | null) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(key); },
    onDragLeave: () => setOver(o => (o === key ? null : o)),
    onDrop: (e: React.DragEvent) => handleDrop(e, folderId),
  });

  const chip = (active: boolean, isOver: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition",
      active ? "border-transparent bg-primary text-primary-foreground shadow-sm" : "border-border/60 hover:bg-muted/50",
      isOver && "ring-2 ring-primary/50",
    );

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/60 bg-card/60 p-2">
      <span className="pl-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Folders</span>

      <button type="button" onClick={() => onChange("all")} className={chip(value === "all", false)}>
        <FolderOpen className="h-3 w-3" aria-hidden /> All
        <span className="opacity-70">{projects.length}</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("none")}
        className={chip(value === "none", over === "none")}
        {...dropProps("none", null)}
      >
        <Inbox className="h-3 w-3" aria-hidden /> Unfiled
        <span className="opacity-70">{countIn(null)}</span>
      </button>

      {folders.map(f => (
        <span key={f.id} className="inline-flex items-center">
          <button
            type="button"
            onClick={() => onChange(f.id)}
            className={chip(value === f.id, over === f.id)}
            style={value === f.id && f.color ? { background: f.color, borderColor: f.color } : undefined}
            {...dropProps(f.id, f.id)}
          >
            <Folder className="h-3 w-3" aria-hidden /> {f.name}
            <span className="opacity-70">{countIn(f.id)}</span>
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Edit folder ${f.name}`}
                className="ml-0.5 rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 space-y-2 p-2">
              <Input
                defaultValue={f.name}
                aria-label="Folder name"
                className="h-8 text-xs"
                onBlur={e => {
                  const name = e.target.value.trim();
                  if (name && name !== f.name) void update(f.id, { name });
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs text-destructive"
                onClick={async () => {
                  await remove(f.id);
                  if (value === f.id) onChange("all");
                  toast.success("Folder deleted — its projects moved to Unfiled");
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete folder
              </Button>
            </PopoverContent>
          </Popover>
        </span>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border/70 px-3 py-1 text-[11px] text-muted-foreground hover:bg-muted/50">
            <FolderPlus className="h-3 w-3" aria-hidden /> New folder
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-2">
          <form
            className="flex items-center gap-1.5"
            onSubmit={async e => {
              e.preventDefault();
              const name = draft.trim();
              if (!name) return;
              const created = await add({ name });
              setDraft("");
              onChange(created.id);
              toast.success(`Folder “${name}” created`);
            }}
          >
            <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Folder name" className="h-8 text-xs" autoFocus />
            <Button type="submit" size="sm" className="h-8 shrink-0 text-xs" disabled={!draft.trim()}>Add</Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
