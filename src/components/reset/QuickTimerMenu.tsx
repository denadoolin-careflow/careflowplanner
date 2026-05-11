import { useState } from "react";
import { Timer } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pomodoro } from "@/lib/pomodoro-store";
import { toast } from "sonner";

const PRESETS = [5, 10, 15, 25];

export function QuickTimerMenu({ title, templateId = "reset-item" }: { title: string; templateId?: string }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const start = (mins: number) => {
    if (!mins || mins <= 0) return;
    pomodoro.startTemplate({
      label: title.slice(0, 60),
      focusSeconds: Math.round(mins * 60),
      breakSeconds: 5 * 60,
      templateId,
    });
    toast.success(`${mins}m focus started`, { description: title });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
          title="Start focus timer"
          onClick={(e) => e.stopPropagation()}
        >
          <Timer className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Focus on this</div>
        <div className="grid grid-cols-4 gap-1">
          {PRESETS.map(m => (
            <Button key={m} size="sm" variant="outline" className="h-8 px-0 text-xs" onClick={() => start(m)}>
              {m}m
            </Button>
          ))}
        </div>
        <form
          className="mt-2 flex gap-1"
          onSubmit={(e) => { e.preventDefault(); start(parseInt(custom, 10)); }}
        >
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom min"
            type="number"
            min={1}
            className="h-8 text-xs"
          />
          <Button size="sm" type="submit" className="h-8 text-xs">Go</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}