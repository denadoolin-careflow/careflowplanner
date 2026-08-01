/** Small labelled number tile used in the progress cards. */
export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/40 px-2 py-2">
      <div className="font-display text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}