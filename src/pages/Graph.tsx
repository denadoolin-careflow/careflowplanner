import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D from "react-force-graph-2d";
import { useStore } from "@/lib/store";
import { listNotes, extractBacklinks, type Note } from "@/lib/notes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Search, Pin, Maximize2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type NodeKind = "note" | "task" | "project" | "habit" | "goal" | "tag" | "date";

type GNode = {
  id: string;
  kind: NodeKind;
  label: string;
  ref?: string; // route to navigate
  val?: number;
  fx?: number; fy?: number;
  x?: number; y?: number;
};
type GLink = { source: string; target: string; kind: string };

const COLORS: Record<NodeKind, string> = {
  note: "#a78bfa",
  task: "#60a5fa",
  project: "#34d399",
  habit: "#fbbf24",
  goal: "#f472b6",
  tag: "#94a3b8",
  date: "#f87171",
};

const DEFAULT_FILTERS: Record<NodeKind, boolean> = {
  note: true, task: true, project: true, habit: true, goal: true, tag: true, date: false,
};

export default function Graph() {
  const { state } = useStore();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<any>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [notes, setNotes] = useState<Note[]>([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancel = false;
    listNotes().then(n => { if (!cancel) setNotes(n); }).catch(() => {});
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graph = useMemo(() => {
    const nodes: GNode[] = [];
    const links: GLink[] = [];
    const seen = new Set<string>();
    const add = (n: GNode) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };

    const tasks = (state.tasks ?? []).filter(t => !t.parentTaskId);
    const projects = state.projects ?? [];
    const habits = state.habits ?? [];
    const goals = state.goals ?? [];

    // Tags universe
    const tagSet = new Set<string>();
    if (filters.tag) {
      tasks.forEach(t => (t.tags ?? []).forEach(tg => tagSet.add(tg)));
      notes.forEach(n => (n.tags ?? []).forEach(tg => tagSet.add(tg)));
      tagSet.forEach(tg => add({ id: `tag:${tg}`, kind: "tag", label: `#${tg}`, val: 3 }));
    }

    // Dates universe
    const dateSet = new Set<string>();

    if (filters.project) {
      projects.forEach(p => add({ id: `project:${p.id}`, kind: "project", label: p.name, ref: `/projects/${p.id}`, val: 8 }));
    }
    if (filters.goal) {
      goals.forEach(g => add({ id: `goal:${g.id}`, kind: "goal", label: g.title, ref: `/goals`, val: 7 }));
    }
    if (filters.habit) {
      habits.forEach(h => add({ id: `habit:${h.id}`, kind: "habit", label: h.title, ref: `/habits`, val: 5 }));
    }
    if (filters.task) {
      tasks.forEach(t => {
        add({ id: `task:${t.id}`, kind: "task", label: t.title, ref: `/inbox`, val: 4 });
        if (filters.project && t.projectId) links.push({ source: `task:${t.id}`, target: `project:${t.projectId}`, kind: "task-project" });
        if (filters.goal && t.goalId) links.push({ source: `task:${t.id}`, target: `goal:${t.goalId}`, kind: "task-goal" });
        if (filters.tag) (t.tags ?? []).forEach(tg => links.push({ source: `task:${t.id}`, target: `tag:${tg}`, kind: "task-tag" }));
        if (filters.date && t.dueDate) { dateSet.add(t.dueDate); links.push({ source: `task:${t.id}`, target: `date:${t.dueDate}`, kind: "task-date" }); }
      });
    }
    if (filters.note) {
      const byTitle = new Map(notes.map(n => [n.title.toLowerCase(), n]));
      notes.forEach(n => {
        add({ id: `note:${n.id}`, kind: "note", label: n.title || "(untitled)", ref: `/notes/${n.id}`, val: 5 });
        if (filters.project && n.projectId) links.push({ source: `note:${n.id}`, target: `project:${n.projectId}`, kind: "note-project" });
        if (filters.tag) (n.tags ?? []).forEach(tg => links.push({ source: `note:${n.id}`, target: `tag:${tg}`, kind: "note-tag" }));
        if (filters.date && n.date) { dateSet.add(n.date); links.push({ source: `note:${n.id}`, target: `date:${n.date}`, kind: "note-date" }); }
        // wiki links
        const refs = extractBacklinks(n.body);
        refs.forEach(title => {
          const target = byTitle.get(title.toLowerCase());
          if (target && target.id !== n.id) links.push({ source: `note:${n.id}`, target: `note:${target.id}`, kind: "wikilink" });
        });
      });
    }
    if (filters.date) {
      dateSet.forEach(d => add({ id: `date:${d}`, kind: "date", label: d, val: 2 }));
    }

    // Drop links whose endpoints aren't in the node set
    const validLinks = links.filter(l => seen.has(l.source as string) && seen.has(l.target as string));
    return { nodes, links: validLinks };
  }, [state.tasks, state.projects, state.habits, state.goals, notes, filters]);

  // Apply pins
  useEffect(() => {
    graph.nodes.forEach(n => {
      if (pinned.has(n.id)) {
        if (n.x != null) n.fx = n.x;
        if (n.y != null) n.fy = n.y;
      } else {
        n.fx = undefined; n.fy = undefined;
      }
    });
  }, [graph, pinned]);

  const q = query.trim().toLowerCase();
  const matches = (n: GNode) => !q || n.label.toLowerCase().includes(q);

  const toggleFilter = (k: NodeKind) => setFilters(f => ({ ...f, [k]: !f[k] }));

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Knowledge Graph</h1>
        <span className="text-xs text-muted-foreground">
          {graph.nodes.length} nodes · {graph.links.length} links
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search nodes…" className="h-8 w-44 pl-7 text-xs" />
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => fgRef.current?.zoomToFit(400, 40)}>
            <Maximize2 className="h-3.5 w-3.5" /> Fit
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setPinned(new Set()); graph.nodes.forEach(n => { n.fx = undefined; n.fy = undefined; }); fgRef.current?.d3ReheatSimulation(); }}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2">
        {(Object.keys(DEFAULT_FILTERS) as NodeKind[]).map(k => (
          <label key={k} className="flex cursor-pointer items-center gap-1.5 text-xs">
            <Checkbox checked={filters[k]} onCheckedChange={() => toggleFilter(k)} />
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[k] }} />
            <span className="capitalize">{k}s</span>
          </label>
        ))}
      </div>

      <Card ref={containerRef as any} className="relative flex-1 overflow-hidden bg-background">
        <ForceGraph2D
          ref={fgRef}
          width={size.w}
          height={size.h}
          graphData={graph as any}
          backgroundColor="hsl(var(--background))"
          cooldownTicks={120}
          nodeRelSize={5}
          linkColor={() => "hsla(var(--foreground-raw, 220 10% 50%), 0.18)"}
          linkWidth={(l: any) => l.kind === "wikilink" ? 1.5 : 0.6}
          linkDirectionalParticles={(l: any) => l.kind === "wikilink" ? 2 : 0}
          linkDirectionalParticleWidth={2}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const n = node as GNode;
            const r = Math.max(3, (n.val ?? 4));
            const isMatch = matches(n);
            const isHover = hoverId === n.id;
            const alpha = q && !isMatch ? 0.15 : 1;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI);
            ctx.fillStyle = COLORS[n.kind];
            ctx.fill();
            if (pinned.has(n.id)) {
              ctx.strokeStyle = "#fff";
              ctx.lineWidth = 1.5 / globalScale;
              ctx.stroke();
            }
            if (isHover || globalScale > 1.6 || isMatch && q) {
              const label = n.label.length > 28 ? n.label.slice(0, 27) + "…" : n.label;
              ctx.font = `${10 / globalScale}px Inter, sans-serif`;
              ctx.fillStyle = "hsl(var(--foreground))";
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillText(label, n.x!, n.y! + r + 2 / globalScale);
            }
            ctx.globalAlpha = 1;
          }}
          onNodeHover={(node: any) => setHoverId(node?.id ?? null)}
          onNodeClick={(node: any) => {
            const n = node as GNode;
            if (n.ref) navigate(n.ref);
          }}
          onNodeRightClick={(node: any) => {
            const id = (node as GNode).id;
            setPinned(prev => {
              const s = new Set(prev);
              if (s.has(id)) { s.delete(id); (node as any).fx = undefined; (node as any).fy = undefined; }
              else { s.add(id); (node as any).fx = (node as any).x; (node as any).fy = (node as any).y; }
              return s;
            });
          }}
          onNodeDragEnd={(node: any) => {
            // pin where dragged
            (node as any).fx = (node as any).x;
            (node as any).fy = (node as any).y;
            setPinned(prev => new Set(prev).add((node as GNode).id));
          }}
        />
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-card/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
          Click → open · Drag → pin · Right-click → unpin
        </div>
      </Card>
    </div>
  );
}