import { useEffect, useRef, useState } from "react";
import { Brain, ChevronDown, ChevronUp, Coffee, GripVertical, Maximize2, Pause, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatPomoTime,
  pomoTotal,
  pomodoro,
  usePomodoro,
} from "@/lib/pomodoro-store";
import { openFullScreenFocus } from "./FullScreenFocus";

const POS_KEY = "floating-pomo-pos-v1";
const MARGIN = 8;

function loadPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.x === "number" && typeof p?.y === "number") return p;
  } catch {}
  return null;
}

export function FloatingPomodoro() {
  const s = usePomodoro();
  const [collapsed, setCollapsed] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => loadPos());
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  // Default to bottom-right once mounted (so we know element size).
  useEffect(() => {
    if (pos || !ref.current) return;
    const el = ref.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setPos({
      x: window.innerWidth - w - 16,
      y: window.innerHeight - h - 16,
    });
  }, [pos, collapsed, s.taskId]);

  // Keep within viewport on resize.
  useEffect(() => {
    const onResize = () => {
      setPos(p => {
        if (!p || !ref.current) return p;
        const w = ref.current.offsetWidth;
        const h = ref.current.offsetHeight;
        return {
          x: Math.min(Math.max(MARGIN, p.x), window.innerWidth - w - MARGIN),
          y: Math.min(Math.max(MARGIN, p.y), window.innerHeight - h - MARGIN),
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Hide entirely if no task is loaded.
  if (!s.taskId) return null;

  const total = pomoTotal(s.mode, s);
  const pct = ((total - s.remaining) / total) * 100;
  const isFocus = s.mode === "focus";

  // Mini circular ring
  const size = 36;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false };
    setDragging(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !ref.current) return;
    dragRef.current.moved = true;
    const w = ref.current.offsetWidth;
    const h = ref.current.offsetHeight;
    const x = Math.min(Math.max(MARGIN, e.clientX - dragRef.current.dx), window.innerWidth - w - MARGIN);
    const y = Math.min(Math.max(MARGIN, e.clientY - dragRef.current.dy), window.innerHeight - h - MARGIN);
    setPos({ x, y });
  };
  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    setPos(p => {
      if (p) {
        try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch {}
      }
      return p;
    });
  };

  return (
    <div
      ref={ref}
      className={cn(
        "fixed z-50 max-w-[calc(100vw-2rem)] animate-fade-in",
        dragging
          ? "transition-none cursor-grabbing"
          : "transition-[transform,box-shadow,left,top] duration-300 ease-out"
      )}
      style={
        pos
          ? { left: pos.x, top: pos.y, touchAction: "none" }
          : { right: 16, bottom: 16, touchAction: "none", visibility: "hidden" }
      }
      role="region"
      aria-label="Pomodoro timer"
    >
      <div className={cn(
        "cozy-card flex items-center gap-2 rounded-full border border-border/70 bg-card/95 p-2 pr-3 backdrop-blur transition-shadow",
        dragging ? "shadow-2xl scale-[1.02]" : "shadow-lg",
      )}>
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            "grid h-7 w-4 shrink-0 place-items-center text-muted-foreground hover:text-foreground",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
          aria-label="Drag pomodoro"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" opacity={0.5} />
            <circle
              cx={size/2} cy={size/2} r={r}
              stroke={isFocus ? "hsl(var(--primary))" : "hsl(var(--accent-foreground))"}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-700 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {isFocus ? <Brain className="h-3.5 w-3.5 text-primary" /> : <Coffee className="h-3.5 w-3.5" />}
          </div>
        </div>

        {!collapsed && (
          <div className="min-w-0 max-w-[180px]">
            <div className="truncate text-xs font-medium leading-tight">{s.taskTitle}</div>
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="font-display text-[13px] tabular-nums normal-case tracking-normal text-foreground">
                {formatPomoTime(s.remaining)}
              </span>
              · {isFocus ? "focus" : "break"}
            </div>
          </div>
        )}

        <div className="flex items-center gap-0.5">
          <Button
            size="icon" variant="ghost" className="h-7 w-7 rounded-full text-primary hover:bg-primary/10"
            onClick={openFullScreenFocus}
            aria-label="Open full screen focus"
            title="Full screen focus"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7 rounded-full"
            onClick={() => pomodoro.toggle()}
            aria-label={s.running ? "Pause" : "Resume"}
          >
            {s.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7 rounded-full"
            onClick={() => pomodoro.reset()} aria-label="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7 rounded-full"
            onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
            onClick={() => pomodoro.stop()} aria-label="End session"
          >
            <Square className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
