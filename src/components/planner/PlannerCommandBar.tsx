import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { CalendarDays, Sparkles, Plus, Star, Inbox, Timer, MessageCircle, LayoutGrid, Calendar as CalendarIcon } from "lucide-react";
import type { PlannerView } from "@/lib/planner-prefs";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCapture: () => void;
  onPlanMyDay: () => void;
  onSetView: (v: PlannerView) => void;
  onGoToday: () => void;
}

export function PlannerCommandBar({ open, onOpenChange, onCapture, onPlanMyDay, onSetView, onGoToday }: Props) {
  const navigate = useNavigate();
  const run = (fn: () => void) => { onOpenChange(false); fn(); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => run(onCapture)}><Plus className="mr-2 h-4 w-4" />Create task</CommandItem>
          <CommandItem onSelect={() => run(onPlanMyDay)}><Sparkles className="mr-2 h-4 w-4" />Plan my day</CommandItem>
          <CommandItem onSelect={() => run(onGoToday)}><CalendarDays className="mr-2 h-4 w-4" />Go to today</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Views">
          <CommandItem onSelect={() => run(() => onSetView("day"))}><CalendarIcon className="mr-2 h-4 w-4" />Day view<kbd className="ml-auto text-[10px] text-muted-foreground">1</kbd></CommandItem>
          <CommandItem onSelect={() => run(() => onSetView("3day"))}><LayoutGrid className="mr-2 h-4 w-4" />3-day view<kbd className="ml-auto text-[10px] text-muted-foreground">2</kbd></CommandItem>
          <CommandItem onSelect={() => run(() => onSetView("week"))}><LayoutGrid className="mr-2 h-4 w-4" />Week view<kbd className="ml-auto text-[10px] text-muted-foreground">3</kbd></CommandItem>
          <CommandItem onSelect={() => run(() => onSetView("month"))}><LayoutGrid className="mr-2 h-4 w-4" />Month view<kbd className="ml-auto text-[10px] text-muted-foreground">4</kbd></CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Shortcuts">
          {[
            ["c", "Capture a task"],
            ["t", "Jump to today"],
            ["[ / ]", "Previous / next day"],
            ["1–4", "Day · 3-day · Week · Month"],
            ["g / s / d", "Grid · Schedule · Time of day"],
          ].map(([key, label]) => (
            <CommandItem key={key} disabled className="text-muted-foreground">
              {label}<kbd className="ml-auto text-[10px]">{key}</kbd>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Jump to">
          <CommandItem onSelect={() => run(() => navigate("/inbox"))}><Inbox className="mr-2 h-4 w-4" />Open Inbox</CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/today"))}><Star className="mr-2 h-4 w-4" />View Top Priorities</CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/focus"))}><Timer className="mr-2 h-4 w-4" />Start Focus Timer</CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/carey"))}><MessageCircle className="mr-2 h-4 w-4" />Ask Carey</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
