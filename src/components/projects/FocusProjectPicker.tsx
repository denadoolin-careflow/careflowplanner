import { useState } from "react";
import { Search, Star } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { projectPhase } from "@/lib/projects/phase";
import { weekKey, weeklyFocusPatches } from "@/lib/projects/weekly-focus";
import { RHYTHM_LABEL } from "@/lib/planner/rhythm-phase";
import { PhasePill } from "@/components/projects/ProgressRing";
import type { Project } from "@/lib/types";

export function useSetWeeklyFocus() {
  const { state, updateProject } = useStore();
  return async (id: string) => {
    const projects = (state.projects ?? []) as Project[];
    for (const p of weeklyFocusPatches(projects, id)) await updateProject(p.id, { details: p.details });
    const name = projects.find(p => p.id === id)?.name;
    toast.success(name ? `${name} is this week's focus` : "Focus set");
  };
}

export const isWeeklyFocus = (p: Project) => p.details?.weeklyFocus === weekKey();

export function FocusProjectPicker({ open, onOpenChange, projects, currentId }: { open: boolean; onOpenChange: (o: boolean) => void; projects: Project[]; currentId?: string }) {
  const [q, setQ] = useState("");
  const setFocus = useSetWeeklyFocus();
  const list = projects.filter(p => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-hidden rounded-[24px] p-0">
        <DialogHeader className="p-5 pb-2">
          <DialogTitle className="font-display text-2xl font-normal">This week's focus</DialogTitle>
          <DialogDescription>Pick the one project you want front and center this week.</DialogDescription>
        </DialogHeader>
        <div className="px-5">
          <label className="flex h-11 items-center gap-2 rounded-full bg-muted px-4">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search projects" aria-label="Search projects" className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
          </label>
        </div>
        <ul className="max-h-[50vh] space-y-1 overflow-y-auto p-3">
          {list.map(p => {
            const ph = projectPhase(p); const on = p.id === currentId;
            return (
              <li key={p.id}>
                <button type="button" onClick={async () => { await setFocus(p.id); onOpenChange(false); }}
                  className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-muted" aria-pressed={on}>
                  <Star className="h-4 w-4 shrink-0" style={{ color: on ? `hsl(var(--rhythm-${ph}-deep))` : undefined, fill: on ? "currentColor" : "none" }} aria-hidden />
                  <span className="min-w-0 flex-1 break-words font-semibold">{p.name}</span>
                  <PhasePill phase={ph}>{RHYTHM_LABEL[ph]}</PhasePill>
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="px-3 py-4 text-sm text-muted-foreground">No matching projects.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
