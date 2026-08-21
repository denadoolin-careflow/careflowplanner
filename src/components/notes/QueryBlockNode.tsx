/**
 * `queryBlock` — a live saved-view embed inside a note.
 *
 * Stores only the saved view id (or an ad-hoc filter payload), so results are
 * recomputed from the live task store every render. Editing the saved view
 * updates every note that embeds it.
 */
import { Node as TiptapNode } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { ListFilter, RefreshCw, Table2, List as ListIcon } from "lucide-react";
import { useSavedViews } from "@/lib/saved-views";
import { EMPTY_WEEK_FILTERS, type WeekFilterState } from "@/lib/planner/week-filters";
import { SavedViewRunner } from "@/components/planner/SavedViewRunner";
import { cn } from "@/lib/utils";

function parseFilters(raw: string | null): Partial<WeekFilterState> {
  if (!raw) return {};
  try { return JSON.parse(raw) as Partial<WeekFilterState>; } catch { return {}; }
}

function QueryView({ node, updateAttributes, selected }: NodeViewProps) {
  const viewId: string | null = node.attrs.viewId || null;
  const layout: "list" | "table" = node.attrs.layout === "table" ? "table" : "list";
  const inline = parseFilters(node.attrs.filters);
  const { views } = useSavedViews();
  const view = views.find(v => v.id === viewId);
  const filters = view ? view.filters : { ...EMPTY_WEEK_FILTERS, ...inline };
  const name = view?.name ?? node.attrs.label ?? "Open tasks";

  return (
    <NodeViewWrapper
      className={cn(
        "not-prose my-3 overflow-hidden rounded-2xl border border-border/60 bg-card/50",
        selected && "ring-2 ring-primary/40",
      )}
      data-query-block
    >
      <div contentEditable={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-1.5">
          <ListFilter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="text-[12px] font-semibold">{name}</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">live</span>
          <span className="ml-auto flex items-center gap-1">
            <select
              aria-label="Saved view"
              value={viewId ?? ""}
              onChange={e => updateAttributes({ viewId: e.target.value || null })}
              className="rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-[11px]"
            >
              <option value="">Ad-hoc filter</option>
              {views.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <button
              type="button"
              aria-label={layout === "list" ? "Show as table" : "Show as list"}
              onClick={() => updateAttributes({ layout: layout === "list" ? "table" : "list" })}
              className="rounded-md border border-border/60 p-1 text-muted-foreground hover:bg-muted"
            >
              {layout === "list" ? <Table2 className="h-3 w-3" /> : <ListIcon className="h-3 w-3" />}
            </button>
            <span className="rounded-md p-1 text-muted-foreground" title="Results refresh automatically">
              <RefreshCw className="h-3 w-3" aria-hidden />
            </span>
          </span>
        </div>
        <SavedViewRunner filters={filters} layout={layout} />
      </div>
    </NodeViewWrapper>
  );
}

export const QueryBlock = TiptapNode.create({
  name: "queryBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      viewId: {
        default: null,
        parseHTML: el => (el as HTMLElement).getAttribute("data-view-id") || null,
        renderHTML: attrs => (attrs.viewId ? { "data-view-id": attrs.viewId } : {}),
      },
      layout: {
        default: "list",
        parseHTML: el => (el as HTMLElement).getAttribute("data-layout") || "list",
        renderHTML: attrs => ({ "data-layout": attrs.layout ?? "list" }),
      },
      label: {
        default: "Open tasks",
        parseHTML: el => (el as HTMLElement).getAttribute("data-label") || "Open tasks",
        renderHTML: attrs => ({ "data-label": attrs.label ?? "Open tasks" }),
      },
      filters: {
        default: null,
        parseHTML: el => (el as HTMLElement).getAttribute("data-filters"),
        renderHTML: attrs => (attrs.filters ? { "data-filters": attrs.filters } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-query-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-query-block": "", ...HTMLAttributes }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(QueryView);
  },
});

/** Default filter payload for a fresh "open tasks" embed. */
export const DEFAULT_QUERY_FILTERS = JSON.stringify({ hideDone: true, dueRange: "any" });
