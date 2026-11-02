import { CareLoopIndicator } from "@/components/care/CareLoopIndicator";

export function CareLoopCard() {
  return (
    <section className="cozy-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-foreground">Care Loop</h3>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">In Rhythm</span>
      </div>
      <CareLoopIndicator active="rhythm" compact />
      <p className="mt-2 text-center text-xs italic text-muted-foreground">
        You're in Rhythm today.
      </p>
    </section>
  );
}