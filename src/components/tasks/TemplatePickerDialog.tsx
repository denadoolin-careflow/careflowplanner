import { useEffect, useState } from "react";
import { BookTemplate, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { listTemplates, createTemplate, deleteTemplate, type TaskTemplate, type TaskTemplatePayload, type SectionTemplatePayload } from "@/lib/templates";
import type { Area, Energy } from "@/lib/types";

interface Props {
  trigger?: React.ReactNode;
  defaults?: { area?: Area; projectId?: string; tags?: string[]; energy?: Energy; estMinutes?: number; inbox?: boolean; dueDate?: string };
}

export function TemplatePickerDialog({ trigger, defaults }: Props) {
  const { addTask, addSection, state } = useStore();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newKind, setNewKind] = useState<"task" | "section">("task");
  const [newSectionTasks, setNewSectionTasks] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listTemplates().then(setItems).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [open]);

  const apply = async (tpl: TaskTemplate) => {
    try {
      if (tpl.kind === "task") {
        const p = tpl.payload as TaskTemplatePayload;
        await addTask({
          title: p.title || tpl.name,
          notes: p.notes,
          area: (p.area ?? defaults?.area ?? "Personal") as Area,
          tags: p.tags ?? defaults?.tags,
          energy: (p.energy ?? defaults?.energy) as Energy | undefined,
          estMinutes: p.estMinutes ?? defaults?.estMinutes,
          priority: (p.priority as any) ?? "medium",
          dueDate: defaults?.dueDate,
          inbox: defaults?.inbox ?? false,
          projectId: defaults?.projectId,
          done: false,
          status: "active",
        });
        toast.success(`Added “${p.title || tpl.name}”`);
      } else {
        const sp = tpl.payload as SectionTemplatePayload;
        if (defaults?.projectId && sp.sectionName) {
          const sec = await addSection({ projectId: defaults.projectId, name: sp.sectionName });
          for (const t of sp.tasks ?? []) {
            await addTask({
              title: t.title || "Untitled",
              area: (t.area ?? "Personal") as Area,
              tags: t.tags,
              energy: t.energy,
              estMinutes: t.estMinutes,
              priority: (t.priority as any) ?? "medium",
              projectId: defaults.projectId,
              sectionId: sec?.id,
              done: false,
              status: "active",
            });
          }
          toast.success(`Added section “${sp.sectionName}”`);
        } else {
          for (const t of sp.tasks ?? []) {
            await addTask({
              title: t.title || "Untitled",
              area: (t.area ?? defaults?.area ?? "Personal") as Area,
              tags: t.tags,
              energy: t.energy,
              estMinutes: t.estMinutes,
              priority: (t.priority as any) ?? "medium",
              inbox: defaults?.inbox ?? false,
              done: false,
              status: "active",
            });
          }
          toast.success(`Added ${sp.tasks?.length ?? 0} tasks`);
        }
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't apply template");
    }
  };

  const save = async () => {
    if (!newName.trim()) return;
    try {
      if (newKind === "task") {
        await createTemplate({
          name: newName.trim(),
          kind: "task",
          payload: { title: newTitle.trim() || newName.trim() },
        });
      } else {
        const tasks = newSectionTasks
          .split("\n").map(l => l.trim()).filter(Boolean)
          .map(title => ({ title }));
        await createTemplate({
          name: newName.trim(),
          kind: "section",
          payload: { sectionName: newName.trim(), tasks },
        });
      }
      setNewName(""); setNewTitle(""); setNewSectionTasks("");
      const fresh = await listTemplates();
      setItems(fresh);
      toast.success("Template saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteTemplate(id);
      setItems(s => s.filter(x => x.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-8 rounded-full text-xs">
            <BookTemplate className="mr-1 h-3.5 w-3.5" /> Templates
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Templates</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="apply">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="apply">Apply</TabsTrigger>
            <TabsTrigger value="create">New</TabsTrigger>
          </TabsList>
          <TabsContent value="apply" className="space-y-2">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>
            ) : items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No templates yet. Create one to reuse common tasks or sections.</p>
            ) : items.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t.kind === "task" ? "Task" : `Section · ${(t.payload as SectionTemplatePayload).tasks?.length ?? 0} tasks`}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" className="h-7 text-xs" onClick={() => apply(t)}>Apply</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(t.id)} aria-label="Delete template">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="create" className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${newKind === "task" ? "bg-primary text-primary-foreground" : "border-border/60"}`}
                onClick={() => setNewKind("task")}
              >Task</button>
              <button
                type="button"
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${newKind === "section" ? "bg-primary text-primary-foreground" : "border-border/60"}`}
                onClick={() => setNewKind("section")}
              >Section</button>
            </div>
            <Input placeholder="Template name" value={newName} onChange={e => setNewName(e.target.value)} />
            {newKind === "task" ? (
              <Input placeholder="Task title (defaults to template name)" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            ) : (
              <textarea
                className="w-full rounded-md border border-border/60 bg-background p-2 text-sm"
                rows={5}
                placeholder="One task per line"
                value={newSectionTasks}
                onChange={e => setNewSectionTasks(e.target.value)}
              />
            )}
            <Button onClick={save} disabled={!newName.trim()}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Save template
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}