import { Plus, ChevronDown, ListTodo, CalendarClock, StickyNote, NotebookPen, Heart, DollarSign, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { createWriteBlock, openWriteBlock } from "@/lib/planner/write-blocks";

type Kind = "task" | "event" | "note" | "journal" | "care" | "expense" | "meal";

/** Next half-hour slot, used as the default landing time for writing blocks. */
function nextSlot(): { start: string; end: string } {
  const now = new Date();
  const mins = now.getHours() * 60 + Math.ceil((now.getMinutes() + 1) / 30) * 30;
  const hm = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return { start: hm(mins), end: hm(mins + 30) };
}

export function CaptureMenu({ onCapture, writeDate }: { onCapture: (kind?: Kind) => void; writeDate?: Date }) {
  const navigate = useNavigate();
  const scheduleWrite = async (kind: "note" | "journal") => {
    if (!writeDate) { navigate(kind === "note" ? "/notes" : "/journal"); return; }
    const iso = format(writeDate, "yyyy-MM-dd");
    const { start, end } = nextSlot();
    try {
      const target = await createWriteBlock({
        kind,
        title: kind === "note" ? "Untitled note" : `Journal — ${format(writeDate, "MMM d")}`,
        date: iso,
        startTime: start,
        endTime: end,
      });
      openWriteBlock(target);
    } catch {
      toast.error("Couldn't create that. Try again?");
    }
  };

  const pick = (kind: Kind) => {
    if (kind === "note" || kind === "journal") { void scheduleWrite(kind); return; }
    if (kind === "expense") { navigate("/moneyflow"); return; }
    if (kind === "meal") { navigate("/home?section=meals"); return; }
    onCapture(kind);
  };
  return (
    <div className="inline-flex h-8 items-stretch overflow-hidden rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-sm">
      <button
        onClick={() => onCapture("task")}
        className="flex h-8 items-center gap-1.5 px-4 text-xs font-medium hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Capture</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button aria-label="Capture options" className="grid h-8 w-8 place-items-center border-l border-primary-foreground/20 hover:bg-primary/90">
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Quick add</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => pick("task")}><ListTodo className="mr-2 h-3.5 w-3.5" />Task</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pick("event")}><CalendarClock className="mr-2 h-3.5 w-3.5" />Event</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pick("note")}><StickyNote className="mr-2 h-3.5 w-3.5" />Note block</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pick("journal")}><NotebookPen className="mr-2 h-3.5 w-3.5" />Journal block</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pick("care")}><Heart className="mr-2 h-3.5 w-3.5" />Care item</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pick("expense")}><DollarSign className="mr-2 h-3.5 w-3.5" />Expense</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pick("meal")}><UtensilsCrossed className="mr-2 h-3.5 w-3.5" />Meal idea</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}