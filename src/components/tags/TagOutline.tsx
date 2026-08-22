/**
 * Tana-style outline for a tag: one live document of everything wearing it.
 *
 * Nodes nest. Tab / Shift+Tab indent and outdent a task under its sibling,
 * Enter commits and opens a new sibling below, rows collapse (remembered per
 * tag), and any node can be zoomed into so it becomes the outline root.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2, ChevronDown, ChevronRight, Crosshair, FileText, Folder,
  ShoppingCart, Sparkles, CornerUpLeft,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { TagFieldsPopover } from "./TagFieldsPopover";
import { cn } from "@/lib/utils";

export interface OutlineNode {
  id: string;
  title: string;
  meta?: string;
  to?: string;
  done?: boolean;
  /** Parent node id — nests this row under another node in the same group. */
  parentId?: string | null;
  /** Tasks can be ticked, renamed, indented and nested from the outline. */
  editable?: boolean;
}

export interface OutlineGroup {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  nodes: OutlineNode[];
}

interface TreeNode extends OutlineNode { depth: number; children: TreeNode[] }

/** Build a depth-aware tree; orphaned parents fall back to the root level. */
function buildTree(nodes: OutlineNode[]): TreeNode[] {
  const byId = new Map(nodes.map(n => [n.id, { ...n, depth: 0, children: [] as TreeNode[] }]));
  const roots: TreeNode[] = [];
  for (const n of byId.values()) {
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    if (parent && parent.id !== n.id) parent.children.push(n);
    else roots.push(n);
  }
  const stamp = (list: TreeNode[], depth: number) => {
    for (const n of list) { n.depth = depth; stamp(n.children, depth + 1); }
  };
  stamp(roots, 0);
  return roots;
}

const collapseKey = (tag: string) => `careflow:outline:collapsed:${tag.toLowerCase()}`;

export function TagOutline({ tagName, accent, groups, onAddTask }: {
  tagName: string;
  accent: string;
  groups: OutlineGroup[];
  onAddTask: (title: string, opts?: { parentId?: string }) => Promise<void> | void;
}) {
  const { updateTask } = useStore() as any;
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [zoom, setZoom] = useState<{ id: string; title: string } | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);

  useEffect(() => {
    try { setCollapsed(JSON.parse(localStorage.getItem(collapseKey(tagName)) ?? "[]")); }
    catch { setCollapsed([]); }
  }, [tagName]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { localStorage.setItem(collapseKey(tagName), JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, [tagName]);

  const submit = async (parentId?: string) => {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    await onAddTask(t, parentId ? { parentId } : undefined);
  };

  const commitTitle = (id: string) => {
    const next = titleDraft.trim();
    setEditingId(null);
    if (next) void updateTask(id, { title: next });
  };

  /** Trees per group, honouring the zoom root when it lives in that group. */
  const trees = useMemo(() => groups.map(g => {
    const tree = buildTree(g.nodes);
    if (!zoom) return { group: g, roots: tree };
    const find = (list: TreeNode[]): TreeNode | null => {
      for (const n of list) {
        if (n.id === zoom.id) return n;
        const hit = find(n.children);
        if (hit) return hit;
      }
      return null;
    };
    const hit = find(tree);
    return { group: g, roots: hit ? hit.children : [] };
  }), [groups, zoom]);

  const total = groups.reduce((n, g) => n + g.nodes.length, 0);

  /** Indent under the previous sibling; outdent to the grandparent. */
  const reparent = (node: TreeNode, siblings: TreeNode[], direction: "in" | "out", parent?: TreeNode) => {
    if (direction === "in") {
      const idx = siblings.findIndex(s => s.id === node.id);
      const prev = siblings[idx - 1];
      if (!prev) return;
      void updateTask(node.id, { parentTaskId: prev.id });
    } else {
      if (!parent) return;
      void updateTask(node.id, { parentTaskId: parent.parentId ?? null });
    }
  };

  const renderNodes = (list: TreeNode[], parent: TreeNode | undefined, groupKey: string) =>
    list.map(n => {
      const isCollapsed = collapsed.includes(n.id);
      const hasKids = n.children.length > 0;
      return (
        <li key={n.id}>
          <div
            className="group/node flex items-start gap-1.5 rounded-lg py-1 pr-1 text-[13px] hover:bg-muted/50"
            style={{ paddingLeft: `${4 + n.depth * 16}px` }}
          >
            {hasKids ? (
              <button
                type="button"
                onClick={() => toggleCollapse(n.id)}
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${n.title}`}
                className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted"
              >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            ) : (
              <span className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            )}
            <span
              aria-hidden
              className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: accent, boxShadow: hasKids && isCollapsed ? `0 0 0 3px ${accent}33` : undefined }}
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
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitTitle(n.id);
                        // Enter opens a fresh sibling right below.
                        void onAddTask("New item", n.parentId ? { parentId: n.parentId } : undefined);
                      }
                      if (e.key === "Escape") setEditingId(null);
                      if (e.key === "Tab") {
                        e.preventDefault();
                        commitTitle(n.id);
                        reparent(n, list, e.shiftKey ? "out" : "in", parent);
                      }
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
                <button
                  type="button"
                  onClick={() => setZoom({ id: n.id, title: n.title })}
                  aria-label={`Zoom into ${n.title}`}
                  title="Zoom into node"
                  className="mt-0.5 hidden h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted group-hover/node:grid"
                >
                  <Crosshair className="h-3 w-3" />
                </button>
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
          </div>
          {hasKids && !isCollapsed && <ul>{renderNodes(n.children, n, groupKey)}</ul>}
        </li>
      );
    });

  return (
    <section className="rounded-2xl border border-border/60 bg-card/50" aria-label={`#${tagName} outline`}>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} aria-hidden />
        <span className="text-sm font-semibold">Outline</span>
        <span className="text-[11px] text-muted-foreground">{total} node{total === 1 ? "" : "s"}</span>
        {zoom && (
          <button
            type="button"
            onClick={() => setZoom(null)}
            className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] hover:bg-muted/70"
          >
            <CornerUpLeft className="h-3 w-3" aria-hidden /> #{tagName} / <strong className="font-medium">{zoom.title}</strong>
          </button>
        )}
      </div>

      <div className="border-b border-border/50 px-3 py-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void submit(zoom?.id); } }}
          placeholder={zoom ? `Add under “${zoom.title}” and press Enter…` : `Add to #${tagName} and press Enter…`}
          aria-label={`Add a node to ${tagName}`}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>

      <div className="divide-y divide-border/40">
        {trees.map(({ group: g, roots }) => (
          <div key={g.key} className="px-3 py-2">
            <h3 className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <g.icon className="h-3 w-3" aria-hidden /> {g.label}
              <span className="text-muted-foreground/60">· {g.nodes.length}</span>
            </h3>
            {roots.length === 0 ? (
              <p className="py-1 pl-4 text-[12px] text-muted-foreground/70">Nothing yet</p>
            ) : (
              <ul>{renderNodes(roots, undefined, g.key)}</ul>
            )}
          </div>
        ))}
      </div>
      <p className="border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground">
        Tab to indent · Shift+Tab to outdent · Enter for a new sibling
      </p>
    </section>
  );
}

export const OUTLINE_ICONS = { task: CheckCircle2, note: FileText, grocery: ShoppingCart, project: Folder };
