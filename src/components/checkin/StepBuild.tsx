import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CheckInAiPayload } from "@/lib/daily-checkin-store";

interface Props {
  payload: CheckInAiPayload;
  intention: string;
  onIntention: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function StepBuild({ payload, intention, onIntention, onBack, onContinue }: Props) {
  const { anchor, rhythm } = payload.method;
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-lg font-semibold sm:text-xl">Build your day</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">{anchor.why}</p>
        <label htmlFor="checkin-intention" className="mt-5 block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Today's intention
        </label>
        <Input
          id="checkin-intention"
          value={intention}
          onChange={(e) => onIntention(e.target.value)}
          placeholder={anchor.intention}
          className="mt-2 h-11 text-[15px]"
        />
      </div>

      <div className="border-t border-border/40 pt-6">
        <h3 className="font-display text-lg font-semibold">Top 3 priorities</h3>
        <ol className="mt-3 space-y-2 text-[15px]">
          {rhythm.priorities.slice(0, 3).map((p, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="text-primary">{i + 1}.</span>{p}
            </li>
          ))}
        </ol>
      </div>

      <div className="border-t border-border/40 pt-6">
        <h3 className="font-display text-lg font-semibold">Your rhythm</h3>
        <ul className="mt-3 divide-y divide-border/40">
          {rhythm.blocks.map((b, i) => (
            <li key={i} className="flex items-center gap-3 py-2.5 text-[15px]">
              <span className="w-16 shrink-0 tabular-nums text-muted-foreground">{b.time}</span>
              <span className="flex-1">{b.label}</span>
              <Badge variant="outline" className="font-normal opacity-70">{b.kind}</Badge>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button size="lg" className="rounded-full" onClick={onContinue}>Continue</Button>
      </div>
    </div>
  );
}