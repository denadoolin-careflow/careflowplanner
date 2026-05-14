import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FolderOpen, Plus, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, addTask, updateProject, deleteProject } = useStore();
  const project = (state.projects ?? []).find(p => p.id === id);
  const tasks = useMemo(
    () => state.tasks.filter(t => t.projectId === id && !t.parentTaskId).sort((a,b)=> Number(a.done)-Number(b.done)),
    [state.tasks, id]
  );
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const [newTitle, setNewTitle] = useState("");

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-sm text-muted-foreground">
        Project not found. <Link to="/projects" className="text-primary underline">Back to Projects</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Link>

      <header className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/40 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <Input
              value={project.name}
              onChange={(e) => updateProject(project.id, { name: e.target.value })}
              className="border-0 bg-transparent px-0 text-2xl font-semibold focus-visible:ring-0"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{project.areaName ?? "No area"}</span>
              <span>·</span>
              <span>{done}/{total} done</span>
            </div>
          </div>
          <Select value={project.status} onValueChange={(v) => updateProject(project.id, { status: v as any })}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["active","paused","someday","done"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={async () => { await deleteProject(project.id); toast.success("Project removed"); history.back(); }}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <Progress value={pct} className="h-1.5" />
        <Textarea
          value={project.notes ?? ""}
          placeholder="Notes about this project…"
          onChange={(e) => updateProject(project.id, { notes: e.target.value })}
          className="resize-none border-0 bg-transparent text-sm focus-visible:ring-0"
          rows={2}
        />
      </header>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-3 space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Add a task to this project…"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && newTitle.trim()) {
                await addTask({ title: newTitle.trim(), area: (project.areaName as any) ?? "Personal", projectId: project.id });
                setNewTitle("");
              }
            }}
          />
          <Button
            onClick={async () => {
              if (!newTitle.trim()) return;
              await addTask({ title: newTitle.trim(), area: (project.areaName as any) ?? "Personal", projectId: project.id });
              setNewTitle("");
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tasks.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No tasks yet. Add one above.</div>
        ) : (
          <div className="space-y-1">
            {tasks.map(t => <TaskRow key={t.id} task={t} showArea={false} />)}
          </div>
        )}
      </div>
    </div>
  );
}