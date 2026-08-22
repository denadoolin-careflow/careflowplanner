/**
 * Tana-style outline for a tag: one live document of everything wearing it.
 *
 * Type at the top to add a node, tick tasks inline, rename in place, and open
 * each item's tag fields from the chip beside it.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileText, Folder, ShoppingCart, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { TagFieldsPopover } from "./TagFieldsPopover";
import { cn } from "@/lib/utils";

export interface OutlineNode {
  id: string;
  title: string;
  meta?: string;
  to?: string;
  done?: boolean;
  /** Tasks can be ticked and renamed straight from the outline. */
  editable?: boolean;
}

export interface OutlineGroup {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  nodes: OutlineNode[];
}

export function TagOutline({ tagName, accent, groups, onAddTask }: {
  tagName: string;
  accent: string;
  groups: OutlineGroup[];
  onAddTask: (title: string) => Promise<void> | void;
}) {
  const { updateTask } = useStore() as any;
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");

  const submit = async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    await onAddTask(t);
  };

  const commitTitle = (id: string) => {
    const next = titleDraft.trim();
    setEditingId(null);
    if (next) void updateTask(id, { title: next });
  };

  const total = groups.reduce((n, g) => n + g.nodes.length, 0);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/50" aria-label={`#${tagName} outline`}>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} aria-hidden />
        <span className="text-sm font-semibold">Outline</span>
        <span className="text-[11px] text-muted-foreground">{total} node{total === 1 ? "" : "s"}</span>
      </div>

      <div className="border-b border-border/50 px-3 py-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void submit(); } }}
          placeholder={`Add to #${tagName} and press Enter…`}
          aria-label={`Add a node to ${tagName}`}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>

      <div className="divide-y divide-border/40">
        {groups.map(g => (
          <div key={g.key} className="px-3 py-2">
            <h3 className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <g.icon className="h-3 w-3" aria-hidden /> {g.label}
              <span className="text-muted-foreground/60">· {g.nodes.length}</span>
            </h3>
            {g.nodes.length === 0 ? (
              <p className="py-1 pl-4 text-[12px] text-muted-foreground/70">Nothing yet</p>
            ) : (
              <ul>
                {g.nodes.map(n => (
                  <li
                    key={n.id}
                    className="group/node flex items-start gap-2 rounded-lg py-1 pl-1 pr-1 text-[13px] hover:bg-muted/50"
                  >
                    <span
                      aria-hidden
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: accent }}
                    />
                    {n.editable ? (
                      <>
                        <input
                          type="checkbox"
                          checked={!!n.done}
                          onChange={() => updateTask(n.id, { done: !n.done })}
                          aria-label={`Mark ${n.title} ${n.done ? "not done" : "done"}`}
                          className="mt-1 h-3.5 w-3.5 shrink-0 accent-current"
                          style={{ color: accent }}
                        />
                        {editingId === n.id ? (
                          <input
                            autoFocus
                            value={titleDraft}
                            onChange={e => setTitleDraft(e.target.value)}
                            onBlur={() => commitTitle(n.id)}
                            onKeyDown={e => {
                              if (e.key === "Enter") commitTitle(n.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            aria-label="Rename item"
                            className="min-w-0 flex-1 rounded border border-border/60 bg-background px-1 py-0.5 text-[13px]"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setEditingId(n.id); setTitleDraft(n.title); }}
                            className={cn(
                              "min-w-0 flex-1 truncate text-left",
                              n.done && "text-muted-foreground line-through",
                            )}
                          >
                            {n.title}
                          </button>
                        )}
                        <TagFieldsPopover
                          tagName={tagName}
                          entityId={n.id}
                          className="shrink-0 rounded px-1 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover/node:opacity-100"
                        >
                          <span>Fields</span>
                        </TagFieldsPopover>
                      </>
                    ) : n.to ? (
                      <Link to={n.to} className="min-w-0 flex-1 truncate hover:underline">{n.title}</Link>
                    ) : (
                      <span className="min-w-0 flex-1 truncate">{n.title}</span>
                    )}
                    {n.meta && <span className="shrink-0 text-[11px] text-muted-foreground">{n.meta}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export const OUTLINE_ICONS = { task: CheckCircle2, note: FileText, grocery: ShoppingCart, project: Folder };
