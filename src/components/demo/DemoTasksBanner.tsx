import { useEffect, useState } from "react";
import { Sparkles, Check, X } from "lucide-react";

const KEY = "careflow.demoTasks";

type DemoTask = { id: string; label: string; done: boolean };

function read(): DemoTask[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DemoTask[]) : [];
  } catch {
    return [];
  }
}

export function DemoTasksBanner() {
  const [tasks, setTasks] = useState<DemoTask[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [burstId, setBurstId] = useState<string | null>(null);

  useEffect(() => {
    setTasks(read());
    const onStorage = () => setTasks(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (dismissed || tasks.length === 0) return null;

  const toggle = (id: string) => {
    setTasks(prev => {
      const next = prev.map(t => (t.id === id ? { ...t, done: !t.done } : t));
      try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      const target = next.find(t => t.id === id);
      if (target?.done) {
        setBurstId(id);
        setTimeout(() => setBurstId(null), 700);
      }
      return next;
    });
  };

  const clear = () => {
    try { sessionStorage.removeItem(KEY); } catch {}
    setTasks([]);
    setDismissed(true);
  };

  return (
    <div className="animate-fade-in rounded-2xl border border-border/60 bg-card/80 p-3 shadow-[0_10px_30px_-12px_hsl(258_30%_50%/0.25)] backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Demo tasks from preview
        </div>
        <button
          type="button"
          onClick={clear}
          aria-label="Dismiss demo tasks"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="space-y-1.5">
        {tasks.map(task => (
          <li key={task.id} className="relative">
            <button
              type="button"
              onClick={() => toggle(task.id)}
              className="flex w-full items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-2.5 py-1.5 text-left text-sm transition-all hover:border-border/70 hover:bg-card"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                  task.done
                    ? "scale-110 border-secondary bg-secondary text-white"
                    : "border-muted-foreground/40"
                }`}
              >
                {task.done && <Check className="h-2.5 w-2.5" />}
              </span>
              <span className={`flex-1 text-[13px] ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {task.label}
              </span>
            </button>
            {burstId === task.id && (
              <span aria-hidden className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <span
                    key={i}
                    className="absolute block h-1 w-1 rounded-full bg-secondary"
                    style={{
                      transform: `rotate(${i * 60}deg) translateX(14px)`,
                      animation: "demo-burst 0.6s ease-out forwards",
                      animationDelay: `${i * 20}ms`,
                    }}
                  />
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
      <style>{`
        @keyframes demo-burst {
          0% { opacity: 1; transform: rotate(var(--r,0deg)) translateX(0) scale(1); }
          100% { opacity: 0; transform: rotate(var(--r,0deg)) translateX(22px) scale(0.4); }
        }
      `}</style>
    </div>
  );
}