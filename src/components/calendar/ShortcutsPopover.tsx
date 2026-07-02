import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const ROWS: [string, string][] = [
  ["g d", "Go to Today"],
  ["g w", "Go to Week"],
  ["g m", "Go to Month"],
  ["g y", "Go to Year"],
  ["g a", "Go to Plan / Agenda"],
  ["t",   "Today"],
  ["[  ]","Previous / Next period"],
  ["n",   "New task or event"],
  ["⌘ K", "Quick add"],
  ["?",   "Show this cheat sheet"],
];

export function ShortcutsPopover({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" /> Keyboard shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border/50 rounded-xl border border-border/60 bg-card/60">
          {ROWS.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-muted-foreground">{v}</span>
              <kbd className="rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 font-mono text-[11px]">{k}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}