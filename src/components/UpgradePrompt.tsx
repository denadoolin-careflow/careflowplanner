import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function UpgradePrompt({ open, onClose, title, message }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-cozy" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-primary">
          <Sparkles className="h-3 w-3" /> CareFlow Pro
        </div>
        <h3 className="mt-3 font-display text-2xl">{title ?? "You've reached your free limit"}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {message ?? "Upgrade to Pro for unlimited habits and routines, the full mental load toolkit, cycle planning, and 300 AI actions per month."}
        </p>
        <div className="mt-5 flex gap-2">
          <Button asChild className="flex-1">
            <Link to="/pricing" onClick={onClose}>See plans</Link>
          </Button>
          <Button variant="ghost" onClick={onClose}>Not now</Button>
        </div>
      </div>
    </div>
  );
}