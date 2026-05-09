import { ReactNode } from "react";

export function EmptyState({ icon, title, hint, children }: { icon?: ReactNode; title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
      {icon && <div className="text-2xl">{icon}</div>}
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
