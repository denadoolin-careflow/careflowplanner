/**
 * `queryBlock` — a live saved-view embed inside a note.
 *
 * Stores only the saved view id (or an ad-hoc filter payload) plus display
 * settings, so results are recomputed from the live stores every render.
 * Each embed keeps its own source, layout, grouping, columns, sort and limit,
 * and can be saved to `saved_views` for reuse elsewhere.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Node as TiptapNode } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  ListFilter, RefreshCw, Table2, List as ListIcon, Settings2, Columns3, BookmarkPlus,
  RotateCcw, ChevronUp, ChevronDown, Save,
} from "lucide-react";
import { toast } from "sonner";
import { useSavedViews, type SavedViewLayout } from "@/lib/saved-views";
import { EMPTY_WEEK_FILTERS, type WeekFilterState, type WeekDueRange } from "@/lib/planner/week-filters";
import {
  SavedViewRunner, RUNNER_COLUMNS, RUNNER_COLUMN_LABEL, RUNNER_SORT_LABEL,
  RUNNER_SOURCES, RUNNER_SOURCE_LABEL, RUNNER_GROUPS, RUNNER_GROUP_LABEL,
  DEFAULT_RUNNER_COLUMNS, columnsForSource,
  type RunnerColumn, type RunnerSort, type RunnerSource, type RunnerGroup, type RunnerLayout,
} from "@/components/planner/SavedViewRunner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function parseFilters(raw: string | null): Partial<WeekFilterState> {
  if (!raw) return {};
  try { return JSON.parse(raw) as Partial<WeekFilterState>; } catch { return {}; }
}

function parseColumns(raw: string | null): RunnerColumn[] {
  if (!raw) return DEFAULT_RUNNER_COLUMNS;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return DEFAULT_RUNNER_COLUMNS;
    const valid = arr.filter((c: any) => (RUNNER_COLUMNS as readonly string[]).includes(c));
    return valid.length ? (valid as RunnerColumn[]) : DEFAULT_RUNNER_COLUMNS;
  } catch { return DEFAULT_RUNNER_COLUMNS; }
}

const DUE_RANGES: WeekDueRange[] = ["any", "today", "overdue", "unscheduled", "scheduled"];
const LAYOUTS: RunnerLayout[] = ["list", "table", "board"];

function QueryView({ node, updateAttributes, selected }: NodeViewProps) {
  const viewId: string | null = node.attrs.viewId || null;
  const { views, add } = useSavedViews();
  const view = views.find(v => v.id === viewId);
  const saved = view?.settings ?? {};

  const layout: RunnerLayout = (LAYOUTS.includes(node.attrs.layout) ? node.attrs.layout : "list") as RunnerLayout;
  const sort: RunnerSort = (node.attrs.sort ?? "due") as RunnerSort;
  const limit: number = Number(node.attrs.limit ?? 25) || 25;
  const columns = parseColumns(node.attrs.columns);
  const source: RunnerSource = (RUNNER_SOURCES as readonly string[]).includes(node.attrs.source)
    ? node.attrs.source as RunnerSource
    : "tasks";
  const group: RunnerGroup = (RUNNER_GROUPS as readonly string[]).includes(node.attrs.group)
    ? node.attrs.group as RunnerGroup
    : "none";

  const inline = parseFilters(node.attrs.filters);
  const filters = view ? view.filters : { ...EMPTY_WEEK_FILTERS, ...inline };
  const name = view?.name ?? node.attrs.label ?? "Open tasks";

  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  const setInline = (patch: Partial<WeekFilterState>) =>
    updateAttributes({ filters: JSON.stringify({ ...inline, ...patch }) });

  const toggleColumn = (c: RunnerColumn) => {
    const next = columns.includes(c) ? columns.filter(x => x !== c) : [...columns, c];
    updateAttributes({ columns: JSON.stringify(next) });
  };

  /** Picking a saved view pulls its stored display settings back into the block. */
  const pickView = (id: string) => {
    if (!id) { updateAttributes({ viewId: null }); return; }
    const v = views.find(x => x.id === id);
    const s = v?.settings ?? {};
    updateAttributes({
      viewId: id,
      label: v?.name ?? name,
      layout: v && (v.layout === "board" || v.layout === "table" || v.layout === "list") ? v.layout : layout,
      source: s.source ?? source,
      group: s.group ?? group,
      sort: s.sort ?? sort,
      limit: s.limit ?? limit,
      columns: s.columns ? JSON.stringify(s.columns) : node.attrs.columns,
    });
  };

  const saveAsView = async () => {
    const label = (saveName || name).trim();
    if (!label) { toast.error("Give the view a name"); return; }
    setSaving(true);
    try {
      const created = await add({
        name: label,
        layout: layout as SavedViewLayout,
        scope: "week",
        filters: { ...EMPTY_WEEK_FILTERS, ...filters } as WeekFilterState,
        settings: { source, group, columns, sort, limit },
      });
      updateAttributes({ viewId: created.id, label: created.name });
      setSaveName("");
      toast.success("Saved as a view");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save the view");
    } finally {
      setSaving(false);
    }
  };

  const suggested = columnsForSource(source);

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
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {RUNNER_SOURCE_LABEL[source]} · live
          </span>
          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              aria-label={`Layout: ${layout}. Switch layout`}
              onClick={() => updateAttributes({ layout: LAYOUTS[(LAYOUTS.indexOf(layout) + 1) % LAYOUTS.length] })}
              className="rounded-md border border-border/60 p-1 text-muted-foreground hover:bg-muted"
            >
              {layout === "list" ? <ListIcon className="h-3 w-3" /> : layout === "table" ? <Table2 className="h-3 w-3" /> : <Columns3 className="h-3 w-3" />}
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Query settings"
                  className="rounded-md border border-border/60 p-1 text-muted-foreground hover:bg-muted"
                >
                  <Settings2 className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="max-h-[70vh] w-72 space-y-3 overflow-y-auto p-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Data</Label>
                  <select
                    aria-label="Data source"
                    value={source}
                    onChange={e => updateAttributes({ source: e.target.value })}
                    className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                  >
                    {RUNNER_SOURCES.map(s => <option key={s} value={s}>{RUNNER_SOURCE_LABEL[s]}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Saved view</Label>
                  <select
                    aria-label="Saved view"
                    value={viewId ?? ""}
                    onChange={e => pickView(e.target.value)}
                    className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                  >
                    <option value="">Ad-hoc filter</option>
                    {views.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                {!view && (
                  <div className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Search</Label>
                      <input
                        aria-label="Filter by text"
                        value={inline.search ?? ""}
                        onChange={e => setInline({ search: e.target.value })}
                        placeholder="Any word in the title"
                        className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                      />
                    </div>
                    {source === "tasks" && (
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Due</Label>
                        <select
                          aria-label="Due range"
                          value={inline.dueRange ?? "any"}
                          onChange={e => setInline({ dueRange: e.target.value as WeekDueRange })}
                          className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px] capitalize"
                        >
                          {DUE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-[12px]">
                      <Checkbox
                        checked={inline.hideDone !== false}
                        onCheckedChange={v => setInline({ hideDone: !!v })}
                      />
                      Hide completed
                    </label>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Layout</Label>
                  <select
                    aria-label="Layout"
                    value={layout}
                    onChange={e => updateAttributes({ layout: e.target.value })}
                    className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px] capitalize"
                  >
                    {LAYOUTS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {layout === "board" && (
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Group by</Label>
                    <select
                      aria-label="Group board by"
                      value={group}
                      onChange={e => updateAttributes({ group: e.target.value })}
                      className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                    >
                      {RUNNER_GROUPS.map(g => <option key={g} value={g}>{RUNNER_GROUP_LABEL[g]}</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sort by</Label>
                  <select
                    aria-label="Sort results"
                    value={sort}
                    onChange={e => updateAttributes({ sort: e.target.value })}
                    className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                  >
                    {Object.entries(RUNNER_SORT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Columns</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {RUNNER_COLUMNS.map(c => (
                      <label
                        key={c}
                        className={cn("flex items-center gap-2 text-[12px]", !suggested.includes(c) && "text-muted-foreground")}
                      >
                        <Checkbox checked={columns.includes(c)} onCheckedChange={() => toggleColumn(c)} />
                        {RUNNER_COLUMN_LABEL[c]}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="query-limit" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Max results
                  </Label>
                  <input
                    id="query-limit"
                    type="number"
                    min={1}
                    max={200}
                    value={limit}
                    onChange={e => updateAttributes({ limit: Math.max(1, Math.min(200, Number(e.target.value) || 25)) })}
                    className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                  />
                </div>

                <div className="space-y-1 border-t border-border/50 pt-2">
                  <Label htmlFor="query-save-name" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Save as view
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="query-save-name"
                      value={saveName}
                      onChange={e => setSaveName(e.target.value)}
                      placeholder={name}
                      className="min-w-0 flex-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                    />
                    <Button size="sm" variant="secondary" className="h-7 shrink-0 text-[11px]" disabled={saving} onClick={saveAsView}>
                      <BookmarkPlus className="mr-1 h-3 w-3" /> Save
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Keeps the filters, columns, sort, limit and board setup.
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            <span className="rounded-md p-1 text-muted-foreground" title="Results refresh automatically">
              <RefreshCw className="h-3 w-3" aria-hidden />
            </span>
          </span>
        </div>
        <SavedViewRunner
          filters={filters}
          layout={layout}
          sort={sort}
          limit={limit}
          columns={columns}
          source={source}
          group={group}
        />
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
      source: {
        default: "tasks",
        parseHTML: el => (el as HTMLElement).getAttribute("data-source") || "tasks",
        renderHTML: attrs => ({ "data-source": attrs.source ?? "tasks" }),
      },
      group: {
        default: "none",
        parseHTML: el => (el as HTMLElement).getAttribute("data-group") || "none",
        renderHTML: attrs => ({ "data-group": attrs.group ?? "none" }),
      },
      sort: {
        default: "due",
        parseHTML: el => (el as HTMLElement).getAttribute("data-sort") || "due",
        renderHTML: attrs => ({ "data-sort": attrs.sort ?? "due" }),
      },
      limit: {
        default: 25,
        parseHTML: el => Number((el as HTMLElement).getAttribute("data-limit")) || 25,
        renderHTML: attrs => ({ "data-limit": String(attrs.limit ?? 25) }),
      },
      columns: {
        default: null,
        parseHTML: el => (el as HTMLElement).getAttribute("data-columns"),
        renderHTML: attrs => (attrs.columns ? { "data-columns": attrs.columns } : {}),
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
/** Filter payload for the cleaning / caretaking presets. */
export const DEFAULT_CHORE_FILTERS = JSON.stringify({ hideDone: true });
