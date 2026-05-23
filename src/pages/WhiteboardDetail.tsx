import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { ArrowLeft, Plus, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getWhiteboard, updateWhiteboard, type Whiteboard } from "@/lib/whiteboards";

const STICKY_COLORS = ["#fde68a", "#fecaca", "#bbf7d0", "#bfdbfe", "#ddd6fe", "#fbcfe8"];

function StickyNode({ data }: { data: { label: string; color: string } }) {
  return (
    <div
      style={{ background: data.color }}
      className="min-w-[140px] max-w-[220px] rounded-xl border border-foreground/10 px-3 py-2 text-[13px] font-medium text-foreground shadow-md transition hover:shadow-lg"
    >
      {data.label || "Untitled note"}
    </div>
  );
}

const nodeTypes = { sticky: StickyNode };

function WhiteboardCanvas({ board }: { board: Whiteboard }) {
  const nav = useNavigate();
  const [title, setTitle] = useState(board.title);
  const [nodes, setNodes, onNodesChange] = useNodesState<any>(
    (board.data.nodes ?? []) as Node[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>(
    (board.data.edges ?? []) as Edge[],
  );
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);

  const onConnect = useCallback(
    (c: Connection) => setEdges(es => addEdge({ ...c, animated: true }, es)),
    [setEdges],
  );

  const addSticky = () => {
    const color = STICKY_COLORS[nodes.length % STICKY_COLORS.length];
    const n: Node = {
      id: crypto.randomUUID(),
      type: "sticky",
      position: { x: 120 + Math.random() * 240, y: 120 + Math.random() * 200 },
      data: { label: "New note", color },
    };
    setNodes(ns => [...ns, n]);
  };

  const editSelected = () => {
    const sel = nodes.find(n => n.selected);
    if (!sel) { toast.info("Select a note first"); return; }
    const next = window.prompt("Note text", sel.data?.label ?? "");
    if (next == null) return;
    setNodes(ns => ns.map(n => n.id === sel.id ? { ...n, data: { ...n.data, label: next } } : n));
  };

  // Autosave
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        setSaving(true);
        await updateWhiteboard(board.id, { title, data: { nodes, edges } });
      } catch (e: any) {
        toast.error(e?.message ?? "Save failed");
      } finally {
        setSaving(false);
      }
    }, 700);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [board.id, title, nodes, edges]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <header className="flex items-center gap-2 border-b border-border/40 bg-card/40 px-3 py-2 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={() => nav("/whiteboards")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Boards
        </Button>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 max-w-xs border-none bg-transparent text-sm font-semibold focus-visible:ring-1"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {saving ? "Saving…" : <span className="inline-flex items-center gap-1"><Save className="h-3 w-3" /> Saved</span>}
          </span>
          <Button size="sm" variant="outline" onClick={editSelected} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Edit selected
          </Button>
          <Button size="sm" onClick={addSticky} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Sticky
          </Button>
        </div>
      </header>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
          <MiniMap pannable zoomable className="!bg-card/60 !border !border-border/50" />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function WhiteboardDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [board, setBoard] = useState<Whiteboard | null>(null);

  useEffect(() => {
    if (!id) return;
    void getWhiteboard(id).then(b => {
      if (!b) { toast.error("Board not found"); nav("/whiteboards"); return; }
      setBoard(b);
    });
  }, [id, nav]);

  if (!board) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  return (
    <ReactFlowProvider>
      <WhiteboardCanvas board={board} />
    </ReactFlowProvider>
  );
}
