import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Sparkle } from "lucide-react";

type Mode = "5" | "15" | "full";
const LIMITS: Record<Mode, number | null> = { "5": 5, "15": 15, "full": null };

export function HomeResetQuickWidget() {
  const { state, toggleCleaning } = useStore();
  const [mode, setMode] = useState<Mode>("15");

  const items = useMemo(() => {
    const cap = LIMITS[mode];
    return state.cleaning
      .filter((c) => {
        if (cap == null) return true;
        const est = (c as any).estMinutes ?? 5;
        return est <= cap;
      })
      .slice(0, 6);
  }, [state.cleaning, mode]);

  const done = items.filter((c) => c.done).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-full bg-muted/60 p-1 text-[11px]">
        {(["5", "15", "full"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-full px-2 py-1 transition-colors",
              mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {m === "full" ? "Full" : `${m} min`}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{done} of {items.length} done</span>
        <Sparkle className="h-3.5 w-3.5 text-secondary-foreground" />
      </div>
      <Progress value={items.length ? (done / items.length) * 100 : 0} className="h-1.5" />
      <ul className="space-y-1">
        {items.map((c) => (
          <li key={c.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={c.done}
              onChange={() => toggleCleaning(c.id)}
              className="h-4 w-4 rounded accent-primary"
            />
            <span className={cn("truncate", c.done && "text-muted-foreground line-through")}>{c.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}