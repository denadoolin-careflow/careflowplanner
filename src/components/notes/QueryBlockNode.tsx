/**
 * `queryBlock` — a live saved-view embed inside a note.
 *
 * Stores the saved view id (or an ad-hoc filter payload) plus every display
 * setting — source, layout, grouping, columns, sort, limit and height — so a
 * block reopens exactly as it was configured. Results are recomputed from the
 * live stores on every render.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Node as TiptapNode } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  ListFilter, RefreshCw, Table2, List as ListIcon, Settings2, Columns3, BookmarkPlus,
  RotateCcw, ChevronUp, ChevronDown, Save, GripHorizontal,
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
const MIN_H = 120;
const MAX_H = 900;

function QueryView({ node, updateAttributes, selected }: NodeViewProps) {
  const viewId: string | null = node.attrs.viewId || null;
  const { views, add, update } = useSavedViews();
  const view = views.find(v => v.id === viewId);

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
  const height: number | null = node.attrs.height ? Number(node.attrs.height) : null;

  const inline = parseFilters(node.attrs.filters);
  const filters = view ? view.filters : { ...EMPTY_WEEK_FILTERS, ...inline };
  const name = view?.name ?? node.attrs.label ?? "Open tasks";

  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const onCount = useCallback((n: number) => setCount(n), []);

  // Auto-heal older embeds: blocks saved before every setting round-tripped
  // only kept the view id, so pull the missing display settings back in once.
  const healedRef = useRef(false);
  useEffect(() => {
    if (healedRef.current || !view) return;
    const s = view.settings ?? {};
    if (!s || Object.keys(s).length === 0) return;
    const patch: Record<string, unknown> = {};
    if (!node.attrs.source && s.source) patch.source = s.source;
    if (!node.attrs.group && s.group) patch.group = s.group;
    if (!node.attrs.sort && s.sort) patch.sort = s.sort;
    if (!node.attrs.limit && s.limit) patch.limit = s.limit;
    if (!node.attrs.columns && s.columns) patch.columns = JSON.stringify(s.columns);
    healedRef.current = true;
    if (Object.keys(patch).length) updateAttributes(patch);
  }, [view, node.attrs, updateAttributes]);

  const setInline = (patch: Partial<WeekFilterState>) =>
    updateAttributes({ filters: JSON.stringify({ ...inline, ...patch }) });

  const toggleColumn = (c: RunnerColumn) => {
    const next = columns.includes(c) ? columns.filter(x => x !== c) : [...columns, c];
    updateAttributes({ columns: JSON.stringify(next) });
  };

  const moveColumn = (c: RunnerColumn, dir: -1 | 1) => {
    const i = columns.indexOf(c);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= columns.length) return;
    const next = columns.slice();
    [next[i], next[j]] = [next[j], next[i]];
    updateAttributes({ columns: JSON.stringify(next) });
  };

  const resetBlock = () => {
    updateAttributes({
      viewId: null, layout: "list", source: "tasks", group: "none", sort: "due",
      limit: 25, columns: null, height: null, filters: JSON.stringify({ hideDone: true, dueRange: "any" }),
    });
    toast.success("Query reset");
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

  const updateView = async () => {
    if (!view) return;
    setSaving(true);
    try {
      await update(view.id, {
        layout: layout as SavedViewLayout,
        filters: { ...EMPTY_WEEK_FILTERS, ...filters } as WeekFilterState,
        settings: { source, group, columns, sort, limit },
      });
      toast.success(`Updated “${view.name}”`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update the view");
    } finally {
      setSaving(false);
    }
  };

  // Drag the bottom edge to set the embed height; the results scroll inside.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = height ?? bodyRef.current?.offsetHeight ?? 240;
    const move = (ev: PointerEvent) => {
      const next = Math.max(MIN_H, Math.min(MAX_H, startH + (ev.clientY - startY)));
      if (bodyRef.current) bodyRef.current.style.height = `${next}px`;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const final = bodyRef.current?.offsetHeight ?? startH;
      updateAttributes({ height: Math.round(final) });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const suggested = columnsForSource(source);

  return (
    <NodeViewWrapper
      className={cn(
        "not-prose group/query my-3 overflow-hidden rounded-2xl border border-border/60 bg-card/50",
        selected && "ring-2 ring-primary/40",
      )}
      data-query-block
    >
      <div contentEditable={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-1.5">
          <ListFilter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="text-[12px] font-semibold">{name}</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {RUNNER_SOURCE_LABEL[source]} · live{count !== null ? ` · ${count}` : ""}
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
              <PopoverContent align="end" className="max-h-[70vh] w-80 space-y-4 overflow-y-auto p-3">
                {/* ---- Source ---- */}
                <section className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source</p>
                  <select
                    aria-label="Data source"
                    value={source}
                    onChange={e => updateAttributes({ source: e.target.value })}
                    className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                  >
                    {RUNNER_SOURCES.map(s => <option key={s} value={s}>{RUNNER_SOURCE_LABEL[s]}</option>)}
                  </select>
                  <select
                    aria-label="Saved view"
                    value={viewId ?? ""}
                    onChange={e => pickView(e.target.value)}
                    className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                  >
                    <option value="">Ad-hoc filter</option>
                    {views.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </section>

                {/* ---- Filters ---- */}
                {!view && (
                  <section className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Filters</p>
                    <input
                      aria-label="Filter by text"
                      value={inline.search ?? ""}
                      onChange={e => setInline({ search: e.target.value })}
                      placeholder="Any word in the title"
                      className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                    />
                    {source === "tasks" && (
                      <select
                        aria-label="Due range"
                        value={inline.dueRange ?? "any"}
                        onChange={e => setInline({ dueRange: e.target.value as WeekDueRange })}
                        className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px] capitalize"
                      >
                        {DUE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                    <label className="flex items-center gap-2 text-[12px]">
                      <Checkbox
                        checked={inline.hideDone !== false}
                        onCheckedChange={v => setInline({ hideDone: !!v })}
                      />
                      Hide completed
                    </label>
                  </section>
                )}

                {/* ---- Display ---- */}
                <section className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Display</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Layout</Label>
                      <select
                        aria-label="Layout"
                        value={layout}
                        onChange={e => updateAttributes({ layout: e.target.value })}
                        className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px] capitalize"
                      >
                        {LAYOUTS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Sort by</Label>
                      <select
                        aria-label="Sort results"
                        value={sort}
                        onChange={e => updateAttributes({ sort: e.target.value })}
                        className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                      >
                        {Object.entries(RUNNER_SORT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    </div>
                    {layout === "board" && (
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Group by</Label>
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
                      <Label htmlFor="query-limit" className="text-[10px] text-muted-foreground">Max results</Label>
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
                    <div className="space-y-1">
                      <Label htmlFor="query-height" className="text-[10px] text-muted-foreground">Height</Label>
                      <input
                        id="query-height"
                        type="number"
                        min={MIN_H}
                        max={MAX_H}
                        step={20}
                        placeholder="Auto"
                        value={height ?? ""}
                        onChange={e => {
                          const v = Number(e.target.value);
                          updateAttributes({ height: v ? Math.max(MIN_H, Math.min(MAX_H, v)) : null });
                        }}
                        className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                      />
                    </div>
                  </div>
                </section>

                {/* ---- Columns ---- */}
                <section className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Columns</p>
                  <p className="text-[10px] text-muted-foreground">Tick to show, arrows to reorder.</p>
                  <div className="space-y-0.5">
                    {[...columns, ...RUNNER_COLUMNS.filter(c => !columns.includes(c))].map(c => {
                      const on = columns.includes(c);
                      return (
                        <div key={c} className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/50">
                          <Checkbox checked={on} onCheckedChange={() => toggleColumn(c)} aria-label={`Show ${RUNNER_COLUMN_LABEL[c]}`} />
                          <span className={cn("flex-1 text-[12px]", !suggested.includes(c) && "text-muted-foreground")}>
                            {RUNNER_COLUMN_LABEL[c]}
                          </span>
                          {on && (
                            <>
                              <button type="button" aria-label={`Move ${RUNNER_COLUMN_LABEL[c]} up`}
                                onClick={() => moveColumn(c, -1)}
                                className="rounded p-0.5 text-muted-foreground hover:bg-muted">
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button type="button" aria-label={`Move ${RUNNER_COLUMN_LABEL[c]} down`}
                                onClick={() => moveColumn(c, 1)}
                                className="rounded p-0.5 text-muted-foreground hover:bg-muted">
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* ---- Save ---- */}
                <section className="space-y-1 border-t border-border/50 pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Save</p>
                  <div className="flex items-center gap-2">
                    <input
                      id="query-save-name"
                      aria-label="New view name"
                      value={saveName}
                      onChange={e => setSaveName(e.target.value)}
                      placeholder={name}
                      className="min-w-0 flex-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
                    />
                    <Button size="sm" variant="secondary" className="h-7 shrink-0 text-[11px]" disabled={saving} onClick={saveAsView}>
                      <BookmarkPlus className="mr-1 h-3 w-3" /> Save as
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {view && (
                      <Button size="sm" variant="outline" className="h-7 flex-1 text-[11px]" disabled={saving} onClick={updateView}>
                        <Save className="mr-1 h-3 w-3" /> Update “{view.name}”
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground" onClick={resetBlock}>
                      <RotateCcw className="mr-1 h-3 w-3" /> Reset
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Keeps the filters, columns, sort, limit and board setup.
                  </p>
                </section>
              </PopoverContent>
            </Popover>

            <span className="rounded-md p-1 text-muted-foreground" title="Results refresh automatically">
              <RefreshCw className="h-3 w-3" aria-hidden />
            </span>
          </span>
        </div>

        <div
          ref={bodyRef}
          style={height ? { height } : undefined}
          className={cn(height && "overflow-y-auto")}
        >
          <SavedViewRunner
            filters={filters}
            layout={layout}
            sort={sort}
            limit={limit}
            columns={columns}
            source={source}
            group={group}
            onCount={onCount}
          />
        </div>

        <div
          role="separator"
          aria-label="Resize query block"
          onPointerDown={startResize}
          onDoubleClick={() => updateAttributes({ height: null })}
          title="Drag to resize · double-click for auto height"
          className="flex h-3 cursor-ns-resize items-center justify-center border-t border-border/40 text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground group-hover/query:opacity-100"
        >
          <GripHorizontal className="h-3 w-3" aria-hidden />
        </div>
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
      height: {
        default: null,
        parseHTML: el => Number((el as HTMLElement).getAttribute("data-height")) || null,
        renderHTML: attrs => (attrs.height ? { "data-height": String(attrs.height) } : {}),
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

/** Every attribute that must survive the markdown round trip. */
export const QUERY_BLOCK_ATTRS = [
  "view-id", "layout", "source", "group", "sort", "limit", "height", "columns", "label", "filters",
] as const;

/** Default filter payload for a fresh "open tasks" embed. */
export const DEFAULT_QUERY_FILTERS = JSON.stringify({ hideDone: true, dueRange: "any" });
/** Filter payload for the cleaning / caretaking presets. */
export const DEFAULT_CHORE_FILTERS = JSON.stringify({ hideDone: true });
