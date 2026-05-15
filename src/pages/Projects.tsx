import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, Plus } from "lucide-react";
import { AREAS } from "@/lib/types";
import { toast } from "sonner";
import { AreaIconColorPicker, getAreaIcon } from "@/components/areas/AreaIconColorPicker";
import { AreaDetailDialog } from "@/components/areas/AreaDetailDialog";

export default function Projects() {
  const { state, addProject, updateArea } = useStore();
  const projects = (state.projects ?? []).filter(p => p.status !== "done");
  const [name, setName] = useState("");
  const [areaName, setAreaName] = useState<string>("Personal");
  const [openArea, setOpenArea] = useState<string | null>(null);

  const grouped = AREAS.map(a => ({ area: a, items: projects.filter(p => p.areaName === a) })).filter(g => g.items.length);
  const noArea = projects.filter(p => !p.areaName);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Group related tasks under outcomes you care about.</p>
        </div>
      </header>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="New project name…"
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1"
        />
        <Select value={areaName} onValueChange={setAreaName}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
        <Button
          onClick={async () => {
            if (!name.trim()) return;
            const created = await addProject({ name: name.trim(), areaName });
            if (created) toast.success(`Project "${created.name}" created`);
            setName("");
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {projects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No projects yet. Create one above, or use Quick Add with <code className="rounded bg-muted px-1">+ProjectName</code>.
        </div>
      )}

      {grouped.map(({ area, items }) => {
        const rec = (state.areas ?? []).find(a => a.name === area);
        const AreaIcon = getAreaIcon(rec?.icon);
        return (
        <section key={area} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            {rec ? (
              <AreaIconColorPicker
                icon={rec.icon}
                color={rec.color}
                onChange={(p) => updateArea(rec.id, p)}
                trigger={
                  <button
                    type="button"
                    className="grid h-6 w-6 place-items-center rounded hover:bg-muted"
                    aria-label="Edit area icon and color"
                  >
                    <AreaIcon className="h-3.5 w-3.5" style={rec.color ? { color: rec.color } : undefined} />
                  </button>
                }
              />
            ) : null}
            <button
              onClick={() => setOpenArea(area)}
              className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
              title="Open area · goals & subtasks"
            >
              {area}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map(p => (
              (() => {
                const projTasks = state.tasks.filter(t => t.projectId === p.id && !t.parentTaskId);
                const total = projTasks.length;
                const done = projTasks.filter(t => t.done).length;
                const pct = total ? Math.round((done / total) * 100) : 0;
                const open = total - done;
                return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 p-3 transition hover:border-primary/40 hover:bg-card"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                      {open} open · {pct}% ·{" "}
                    {p.deadline ? `due ${p.deadline}` : p.status}
                  </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                </div>
              </Link>
                );
              })()
            ))}
          </div>
        </section>
        );
      })}

      {noArea.length > 0 && (
        <section className="space-y-2">
          <div className="px-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">No area</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {noArea.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 p-3 hover:border-primary/40">
                <FolderOpen className="h-4 w-4 text-primary" />
                <span className="truncate text-sm">{p.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {openArea && (
        <AreaDetailDialog area={openArea as any} open={!!openArea} onOpenChange={(o) => !o && setOpenArea(null)} />
      )}
    </div>
  );
}