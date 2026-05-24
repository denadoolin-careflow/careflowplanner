import { useState } from "react";
import { Plus, Wand2, Loader2, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Combined "Add subtask" + "Break down with AI" control. Replaces the two
 * separate hover buttons on a task row so the action rail stays compact.
 */
export function SubtaskAddMenu({
  onAddManual,
  onAddWithAI,
  aiLoading,
  className,
  size = "sm",
}: {
  onAddManual: () => void;
  onAddWithAI: () => void | Promise<void>;
  aiLoading?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const isMd = size === "md";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="Add subtask"
          title="Add subtask"
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full text-muted-foreground transition-all",
            "hover:bg-primary/10 hover:text-primary",
            isMd ? "h-8 px-2" : "h-7 px-1.5",
            className,
          )}
        >
          {aiLoading ? (
            <Loader2 className={cn(isMd ? "h-4 w-4" : "h-3.5 w-3.5", "animate-spin")} />
          ) : (
            <Plus className={cn(isMd ? "h-4 w-4" : "h-3.5 w-3.5")} />
          )}
          <ChevronDown className={cn(isMd ? "h-3 w-3" : "h-2.5 w-2.5", "opacity-70")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-56 rounded-2xl border-border/60 bg-card/95 p-1.5 shadow-xl backdrop-blur animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 rounded-xl"
          onClick={() => { setOpen(false); onAddManual(); }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add subtask
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 rounded-xl"
          disabled={aiLoading}
          onClick={async () => { setOpen(false); await onAddWithAI(); }}
        >
          {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 text-primary" />}
          Break down with AI
        </Button>
      </PopoverContent>
    </Popover>
  );
}