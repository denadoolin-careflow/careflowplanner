import { useState } from "react";
import { Target, Clock, Type } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { countWords, readingMinutes } from "@/lib/writing-goals";

export function WordCountFooter({
  body,
  goal,
  onGoalChange,
  className,
}: {
  body: string;
  goal?: number | null;
  onGoalChange?: (next: number | null) => void;
  className?: string;
}) {
  const words = countWords(body);
  const chars = (body ?? "").length;
  const mins = readingMinutes(words);
  const [input, setInput] = useState(String(goal ?? ""));
  const pct = goal && goal > 0 ? Math.min(100, Math.round((words / goal) * 100)) : 0;

  return (
    <div
      className={cn(
        "mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-3 py-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <Type className="h-3 w-3" />
        <span className="font-medium text-foreground tabular-nums">{words.toLocaleString()}</span> words
      </span>
      <span className="text-muted-foreground/60">·</span>
      <span className="tabular-nums">{chars.toLocaleString()} chars</span>
      <span className="text-muted-foreground/60">·</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> {mins} min read
      </span>

      {onGoalChange && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "ml-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 transition hover:bg-background",
                goal && pct >= 100 && "border-primary/40 bg-primary/10 text-primary",
              )}
              aria-label="Set word goal"
            >
              <Target className="h-3 w-3" />
              {goal ? (
                <>
                  <ProgressRing pct={pct} />
                  <span className="tabular-nums">
                    {words}/{goal}
                  </span>
                </>
              ) : (
                <span>Set goal</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Target word count</label>
              <Input
                type="number"
                min={10}
                step={10}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. 500"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const n = parseInt(input, 10);
                    onGoalChange(Number.isFinite(n) && n > 0 ? n : null);
                  }}
                >
                  Save
                </Button>
                {goal && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setInput(""); onGoalChange(null); }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tracks progress for this note. Use the Journal page for daily goals across entries.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="-mr-0.5">
      <circle cx="8" cy="8" r={r} stroke="hsl(var(--border))" strokeWidth="2" fill="none" />
      <circle
        cx="8" cy="8" r={r}
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
}
