import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AreaIconColorPicker, getAreaIcon } from "@/components/areas/AreaIconColorPicker";
import { AREAS } from "@/lib/types";
import { Plus, Pencil, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id?: string;          // present only for user-created (custom) areas
  name: string;
  icon?: string;
  color?: string;
  count: number;
  isBuiltIn: boolean;
};

function AreaForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: { name: string; icon?: string; color?: string };
  onSubmit: (v: { name: string; icon?: string; color?: string }) => Promise<void> | void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState<string | undefined>(initial?.icon);
  const [color, setColor] = useState<string | undefined>(initial?.color);
  const Icon = getAreaIcon(icon);
  return (
    <div className="space-y-3">
      <div>
        <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Garden" autoFocus />
      </div>
      <div>
        <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Icon & color</Label>
        <AreaIconColorPicker
          icon={icon}
          color={color}
          onChange={(p) => {
            if (p.icon !== undefined) setIcon(p.icon);
            if ("color" in p) setColor(p.color);
          }}
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Icon className="h-4 w-4" style={color ? { color } : undefined} />
              <span className="text-muted-foreground">Choose…</span>
            </button>
          }
        />
      </div>
      <DialogFooter>
        <Button
          onClick={async () => {
            if (!name.trim()) { toast.error("Name required"); return; }
            await onSubmit({ name: name.trim(), icon, color });
          }}
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AreasManager() {
  const { state, addArea, updateArea, deleteArea } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const rows: Row[] = useMemo(() => {
    const customAreas = state.areas ?? [];
    const taskCounts = new Map<string, number>();
    for (const t of state.tasks) {
      const key = (t.area ?? "").toLowerCase();
      if (!key) continue;
      taskCounts.set(key, (taskCounts.get(key) ?? 0) + 1);
    }
    const seen = new Set<string>();
    const list: Row[] = [];
    // built-ins first
    for (const name of AREAS) {
      const match = customAreas.find(a => a.name.toLowerCase() === name.toLowerCase());
      seen.add(name.toLowerCase());
      list.push({
        id: match?.id,
        name,
        icon: match?.icon,
        color: match?.color,
        count: taskCounts.get(name.toLowerCase()) ?? 0,
        isBuiltIn: true,
      });
    }
    // user-added customs
    for (const a of customAreas) {
      if (seen.has(a.name.toLowerCase())) continue;
      list.push({
        id: a.id,
        name: a.name,
        icon: a.icon,
        color: a.color,
        count: taskCounts.get(a.name.toLowerCase()) ?? 0,
        isBuiltIn: false,
      });
    }
    return list;
  }, [state.areas, state.tasks]);

  const handleAdd = async (v: { name: string; icon?: string; color?: string }) => {
    const exists = rows.some(r => r.name.toLowerCase() === v.name.toLowerCase());
    if (exists) { toast.error("An area with that name already exists"); return; }
    const rec = await addArea(v);
    if (rec) {
      toast.success(`Added “${v.name}”`);
      setAddOpen(false);
    } else {
      toast.error("Could not add area");
    }
  };

  const handleRename = async (row: Row, v: { name: string; icon?: string; color?: string }) => {
    if (v.name.toLowerCase() !== row.name.toLowerCase()) {
      const clash = rows.some(r => r.name.toLowerCase() === v.name.toLowerCase());
      if (clash) { toast.error("Another area already uses that name"); return; }
    }
    if (row.id) {
      await updateArea(row.id, { name: v.name, icon: v.icon, color: v.color });
    } else {
      // Built-in with no custom record yet — create an override so icon/color/rename persist.
      const rec = await addArea({ name: v.name, icon: v.icon, color: v.color });
      if (!rec) { toast.error("Could not save"); return; }
    }
    toast.success("Saved");
    setEditing(null);
  };

  const handleDelete = async (row: Row) => {
    if (!row.id) return;
    await deleteArea(row.id);
    toast.success(`Deleted “${row.name}”`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-28 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Areas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize tasks across the parts of your life. Add custom areas, tweak names, icons, and colors.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Add area</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>New area</DialogTitle></DialogHeader>
            <AreaForm onSubmit={handleAdd} submitLabel="Create" />
          </DialogContent>
        </Dialog>
      </header>

      <ul className="cozy-card divide-y divide-border/60 overflow-hidden">
        {rows.map((row) => {
          const Icon = getAreaIcon(row.icon);
          return (
            <li key={row.name} className="flex items-center gap-3 px-3 py-3 sm:px-4">
              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/60"
                style={row.color ? { backgroundColor: `${row.color}22`, borderColor: `${row.color}55` } : undefined}
              >
                <Icon className="h-4 w-4" style={row.color ? { color: row.color } : undefined} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/areas/${encodeURIComponent(row.name)}`}
                    className="truncate font-medium hover:text-primary"
                  >
                    {row.name}
                  </Link>
                  {row.isBuiltIn && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Built-in
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.count} {row.count === 1 ? "task" : "tasks"}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setEditing(row)}
                  aria-label={`Edit ${row.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {!row.isBuiltIn && row.id ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${row.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{row.name}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the area. {row.count > 0 ? `Its ${row.count} task${row.count === 1 ? "" : "s"} will keep the area name but won't appear under any custom area.` : "It has no tasks."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(row)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
                <Link
                  to={`/areas/${encodeURIComponent(row.name)}`}
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Open ${row.name}`}
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit area</DialogTitle>
          </DialogHeader>
          {editing && (
            <AreaForm
              initial={{ name: editing.name, icon: editing.icon, color: editing.color }}
              onSubmit={(v) => handleRename(editing, v)}
              submitLabel="Save"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}