import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Repeat, X } from "lucide-react";
import type { RecurrenceRule } from "@/lib/types";
import { describeRule } from "@/lib/recurrence";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function RepeatSelector({ value, onChange }: { value?: RecurrenceRule; onChange: (v: RecurrenceRule | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RecurrenceRule>(value ?? { freq: "weekly", interval: 1 });

  const toggleDay = (d: number) => {
    const cur = draft.byWeekday ?? [];
    const next = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d].sort();
    setDraft({ ...draft, byWeekday: next.length ? next : undefined });
  };

  const apply = () => { onChange(draft); setOpen(false); };
  const clear = () => { onChange(undefined); setOpen(false); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 justify-start gap-2">
          <Repeat className="h-3.5 w-3.5" />
          <span className="truncate text-xs">{describeRule(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-3">
        <div>
          <Label className="text-xs">Repeats</Label>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Every</span>
            <Input type="number" min={1} max={99} value={draft.interval ?? 1}
              onChange={(e) => setDraft({ ...draft, interval: Math.max(1, Number(e.target.value) || 1) })}
              className="h-8 w-16" />
            <Select value={draft.freq} onValueChange={(v) => setDraft({ ...draft, freq: v as any })}>
              <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">day(s)</SelectItem>
                <SelectItem value="weekly">week(s)</SelectItem>
                <SelectItem value="monthly">month(s)</SelectItem>
                <SelectItem value="yearly">year(s)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {draft.freq === "weekly" && (
          <div>
            <Label className="text-xs">On days</Label>
            <div className="mt-1 flex gap-1">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={i} type="button" onClick={() => toggleDay(i)}
                  className={cn(
                    "h-8 w-8 rounded-full border text-xs transition-colors",
                    draft.byWeekday?.includes(i)
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  )}
                >{d}</button>
              ))}
            </div>
          </div>
        )}
        <div>
          <Label className="text-xs">Ends</Label>
          <Input type="date" value={draft.until ?? ""}
            onChange={(e) => setDraft({ ...draft, until: e.target.value || undefined })}
            className="h-8" />
        </div>
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
            <X className="mr-1 h-3.5 w-3.5" /> Don't repeat
          </Button>
          <Button type="button" size="sm" onClick={apply}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}