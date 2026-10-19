import { ArrowLeft } from "lucide-react";

export function PanelBack({ onClick }: { onClick?: () => void }) {
  if (!onClick) return null;
  return (
    <button type="button" onClick={onClick} aria-label="Back to previous panel"
      className="-ml-1 mb-1 inline-flex min-h-9 w-fit items-center gap-1 rounded-full px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}
