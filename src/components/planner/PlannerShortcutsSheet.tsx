import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GROUPS: { label: string; items: [string, string][] }[] = [
  {
    label: "Move around",
    items: [
      ["[", "Previous period"],
      ["]", "Next period"],
      ["T", "Jump to today"],
    ],
  },
  {
    label: "Ranges",
    items: [
      ["1", "Day"],
      ["2", "3 days"],
      ["3", "Week"],
      ["4", "Month"],
      ["5", "Year"],
    ],
  },
  {
    label: "Day views",
    items: [
      ["Shift + G", "Grid"],
      ["Shift + S", "Schedule"],
      ["Shift + D", "Time of day"],
    ],
  },
  {
    label: "Actions",
    items: [
      ["C", "Quick capture"],
      ["⌘ / Ctrl + K", "Command bar"],
      ["?", "This list"],
    ],
  },
];

/** Discoverable list of the planner keyboard shortcuts. */
export function PlannerShortcutsSheet({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base">Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GROUPS.map(g => (
            <div key={g.label} className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{g.label}</div>
              {g.items.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <kbd className="rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">{key}</kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}