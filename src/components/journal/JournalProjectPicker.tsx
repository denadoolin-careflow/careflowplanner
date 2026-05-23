import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderOpen, Plus, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { JournalEntry } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { haptics } from "@/lib/haptics";

/**
 * Compact chip row + popover picker for linking a journal entry to projects.
 * Persists into `journal_entries.linked_ids` as `[{ type: "project", id, label }]`.
 */
export function JournalProjectPicker({ entry }: { entry: JournalEntry }) {
  const { state, updateJournal } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const projects = (state.projects ?? []).filter(p => !p.archivedAt);
  const linkedIds = (entry.linkedIds ?? []).filter(l => l.type === "project");
  const linkedSet = new Set(linkedIds.map(l => l.id));

  const toggle = (pid: string, label: string) => {
    const others = (entry.linkedIds ?? []).filter(l => !(l.type === "project" && l.id === pid));
    const next = linkedSet.has(pid)
      ? others
      : [...(entry.linkedIds ?? []), { type: "project", id: pid, label }];
    updateJournal(entry.id, { linkedIds: next });
    haptics.tap();
  };

  const filtered = q
    ? projects.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
    : projects;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {linkedIds.map(l => {
        const p = projects.find(x => x.id === l.id);
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => navigate(`/projects/${l.id}`)}
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/15"
          >
            <FolderOpen className="h-3 w-3" />
            <span className="max-w-[120px] truncate">{p?.name ?? l.label ?? "Project"}</span>
            <span
              role="button"
              aria-label="Remove link"
              onClick={(e) => { e.stopPropagation(); toggle(l.id, l.label ?? ""); }}
              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          </button>
        );
      })}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 gap-1 rounded-full px-2 text-[11px] text-muted-foreground hover:text-foreground">
            <Plus className="h-3 w-3" /> Link project
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects…"
            className="h-8 text-xs"
          />
          <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-2 text-xs text-muted-foreground">No projects.</div>
            )}
            {filtered.map(p => {
              const on = linkedSet.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id, p.name)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60 ${on ? "bg-muted/60" : ""}`}
                >
                  <span className="flex items-center gap-1.5">
                    <FolderOpen className="h-3 w-3 opacity-70" />
                    <span className="truncate">{p.name}</span>
                  </span>
                  {on && <span className="text-primary">✓</span>}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}