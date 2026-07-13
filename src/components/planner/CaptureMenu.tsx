import { useState } from "react";
import { Plus, ChevronDown, ListTodo, CalendarClock, StickyNote, Heart, DollarSign, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

type Kind = "task" | "event" | "note" | "care" | "expense" | "meal";

export function CaptureMenu({ onCapture }: { onCapture: (kind?: Kind) => void }) {
  const navigate = useNavigate();
  const pick = (kind: Kind) => {
    if (kind === "note") { navigate("/notes"); return; }
    if (kind === "expense") { navigate("/moneyflow"); return; }
    if (kind === "meal") { navigate("/home?section=meals"); return; }
    onCapture(kind);
  };
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-sm">
      <button
        onClick={() => onCapture("task")}
        className="flex items-center gap-1 px-3 text-xs font-medium hover:bg-primary/90"
      >
        <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Capture</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button aria-label="Capture options" className="grid w-7 place-items-center border-l border-primary-foreground/20 hover:bg-primary/90">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Quick add</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => pick("task")}><ListTodo className="mr-2 h-3.5 w-3.5" />Task</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pick("event")}><CalendarClock className="mr-2 h-3.5 w-3.5" />Event</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pick("note")}><StickyNote className="mr-2 h-3.5 w-3.5" />Note</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pick("care")}><Heart className="mr-2 h-3.5 w-3.5" />Care item</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pick("expense")}><DollarSign className="mr-2 h-3.5 w-3.5" />Expense</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pick("meal")}><UtensilsCrossed className="mr-2 h-3.5 w-3.5" />Meal idea</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}