import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

const RECENT_KEY = "careflow:today:braindump:recent";
const MAX_RECENT = 5;

function readRecent(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch { return []; }
}

/** Quick capture: each non-empty line becomes a task in Inbox. */
export function BrainDumpWidget() {
  const { addTask } = useStore();
  const [value, setValue] = useState("");
  const [recent, setRecent] = useState<string[]>(readRecent);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  const capture = async () => {
    const lines = value.split("\n").map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    for (const title of lines) {
      await addTask({ title, inbox: true });
    }
    const next = [...lines.reverse(), ...recent].slice(0, MAX_RECENT);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* noop */ }
    setValue("");
    toast.success(lines.length === 1 ? "Captured to inbox" : `Captured ${lines.length} items`);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault(); void capture();
    } else if (e.key === "Escape") {
      setValue("");
    }
  };

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Brain dump</h3>
        </div>
        <Link
          to="/inbox"
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Inbox <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      <textarea
        ref={taRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={onKey}
        placeholder="One thought per line… ⌘↵ to capture"
        rows={2}
        className="w-full resize-none rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs leading-snug text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">
          {value.trim() ? `${value.split("\n").map(s => s.trim()).filter(Boolean).length} item${value.split("\n").map(s => s.trim()).filter(Boolean).length === 1 ? "" : "s"}` : "Lands in Inbox"}
        </span>
        <Button size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => void capture()} disabled={!value.trim()}>
          Capture
        </Button>
      </div>

      {recent.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-border/40 pt-2">
          {recent.map((r, i) => (
            <li key={i} className="truncate text-[11px] text-muted-foreground" title={r}>
              · {r}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}