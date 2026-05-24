import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lightbulb, Plus, Target, Trash2, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { TagPicker } from "@/components/tags/TagPicker";
import { TagChip } from "@/components/tags/TagChip";
import { useTags } from "@/hooks/use-tags";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const IDEA_TAG = "idea";

export default function Ideas() {
  const { state, addTask, updateTask, deleteTask, toggleTask, deleteIdea, addGoal } = useStore();
  const { ensure } = useTags();
  const [title, setTitle] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<string>("all");

  const ideaTasks = useMemo(
    () => (state.tasks ?? []).filter(t => (t.tags ?? []).some(n => n.toLowerCase() === IDEA_TAG)),
    [state.tasks],
  );

  // Build list of secondary tag names actually used on idea tasks, for grouping
  const groupTagOptions = useMemo(() => {
    const set = new Set<string>();
    ideaTasks.forEach(t => (t.tags ?? []).forEach(n => {
      if (n.toLowerCase() !== IDEA_TAG) set.add(n);
    }));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ideaTasks]);

  const grouped = useMemo(() => {
    if (groupBy === "all") return [{ label: "All ideas", items: ideaTasks }];
    if (groupBy === "untagged") {
      return [{ label: "Untagged", items: ideaTasks.filter(t => (t.tags ?? []).filter(n => n.toLowerCase() !== IDEA_TAG).length === 0) }];
    }
    const lc = groupBy.toLowerCase();
    return [{ label: groupBy, items: ideaTasks.filter(t => (t.tags ?? []).some(n => n.toLowerCase() === lc)) }];
  }, [ideaTasks, groupBy]);

  const capture = async () => {
    const t = title.trim();
    if (!t) return;
    try {
      await ensure(IDEA_TAG);
    } catch { /* ignore — fall back to plain string tag */ }
    const tags = [IDEA_TAG, ...draftTags.filter(n => n.toLowerCase() !== IDEA_TAG)];
    await addTask({ title: t, tags, area: "Personal" });
    setTitle(""); setDraftTags([]);
    toast.success("Captured");
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 md:p-6">
      <div className="cozy-card gradient-sage p-6">
        <h2 className="font-display text-3xl font-semibold flex items-center gap-2">
          <Lightbulb className="h-6 w-6" /> Idea inbox
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Catch the spark. Tag it. Sort it later.</p>
      </div>

      {/* Capture row */}
      <div className="rounded-2xl border border-border/60 bg-card/70 p-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="A new spark…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void capture(); }}
            className="h-9"
          />
          <Button onClick={() => void capture()} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="mt-2">
          <TagPicker value={draftTags} onChange={setDraftTags} triggerLabel="Add a tag" />
        </div>
      </div>

      {/* Group switcher */}
      {groupTagOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Group:</span>
          <GroupChip active={groupBy === "all"} onClick={() => setGroupBy("all")}>All</GroupChip>
          <GroupChip active={groupBy === "untagged"} onClick={() => setGroupBy("untagged")}>Untagged</GroupChip>
          {groupTagOptions.map(name => (
            <button key={name} onClick={() => setGroupBy(name)} className="contents">
              <TagChip name={name} size="sm" className={cn(groupBy === name && "ring-2 ring-foreground/40")} />
            </button>
          ))}
        </div>
      )}

      {/* Idea task list */}
      <div className="space-y-4">
        {grouped.map(g => (
          <section key={g.label}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label} <span className="text-muted-foreground/60">· {g.items.length}</span>
            </h3>
            {g.items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 bg-card/40 p-4 text-center text-xs text-muted-foreground">
                Nothing here yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/60">
                {g.items.map(t => (
                  <li key={t.id} className="group flex items-center gap-2 px-3 py-2">
                    <Checkbox checked={t.done} onCheckedChange={() => toggleTask(t.id)} />
                    <span className={cn("flex-1 truncate text-sm", t.done && "text-muted-foreground line-through")}>{t.title}</span>
                    <div className="hidden items-center gap-1 sm:flex">
                      {(t.tags ?? []).filter(n => n.toLowerCase() !== IDEA_TAG).slice(0, 3).map(n => (
                        <TagChip key={n} name={n} size="xs" />
                      ))}
                    </div>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition group-hover:opacity-100"
                      title="Promote to goal"
                      onClick={async () => { await addGoal({ title: t.title }); await deleteTask(t.id); toast.success("Promoted to goal"); }}
                    >
                      <Target className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition group-hover:opacity-100"
                      title="Convert to task (remove idea tag)"
                      onClick={async () => {
                        const next = (t.tags ?? []).filter(n => n.toLowerCase() !== IDEA_TAG);
                        await updateTask(t.id, { tags: next });
                        toast.success("Converted to task");
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition group-hover:opacity-100"
                      onClick={async () => { await deleteTask(t.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* Legacy ideas (pre-tag system) */}
      {state.ideas.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
              <ChevronDown className="h-3.5 w-3.5" /> Older ideas ({state.ideas.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ul className="space-y-1.5">
              {state.ideas.map(i => (
                <li key={i.id} className="group flex items-start gap-2 rounded-xl border border-border/40 bg-muted/30 p-2.5 text-sm">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
                  <span className="flex-1">
                    {i.title}
                    {i.category && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">{i.category}</span>}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7" title="Migrate to tagged idea"
                      onClick={async () => {
                        try { await ensure(IDEA_TAG); } catch {}
                        await addTask({ title: i.title, tags: [IDEA_TAG], area: "Personal" });
                        await deleteIdea(i.id);
                        toast.success("Migrated");
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteIdea(i.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function GroupChip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition",
        active
          ? "border-foreground/30 bg-foreground/10 text-foreground"
          : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground",
      )}
    >{children}</button>
  );
}
