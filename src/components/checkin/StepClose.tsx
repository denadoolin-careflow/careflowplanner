import { Check, ChevronRight, Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CheckInAiPayload } from "@/lib/daily-checkin-store";

const EXHALE_LABELS: { key: keyof CheckInAiPayload["method"]["exhale"]; label: string }[] = [
  { key: "release", label: "Release" },
  { key: "boundary", label: "Boundary" },
  { key: "selfCare", label: "Self-care" },
  { key: "breathing", label: "Breathing" },
];

interface Props {
  payload: CheckInAiPayload;
  gratitude: string[];
  onGratitude: (next: string[]) => void;
  onSaveMantra: () => void;
  onBack: () => void;
  onComplete: () => void;
  completing: boolean;
}

export function StepClose({
  payload, gratitude, onGratitude, onSaveMantra, onBack, onComplete, completing,
}: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-lg font-semibold sm:text-xl">Close the loop</h2>
        <blockquote className="mt-3 font-display text-xl italic leading-snug text-foreground/90">
          "{payload.mantra}"
        </blockquote>
        <Button variant="ghost" size="sm" className="mt-2" onClick={onSaveMantra}>
          <Heart className="mr-1.5 h-4 w-4" /> Save to favorites
        </Button>
      </div>

      <div className="border-t border-border/40 pt-6">
        <h3 className="font-display text-lg font-semibold">Gratitude</h3>
        <div className="mt-3 space-y-2">
          {gratitude.map((g, i) => (
            <Input
              key={i}
              value={g}
              onChange={(e) => {
                const next = [...gratitude];
                next[i] = e.target.value;
                onGratitude(next);
              }}
              placeholder="I'm grateful for…"
              className="h-11 text-[15px]"
            />
          ))}
        </div>
        {gratitude.length < 5 && (
          <button
            type="button"
            onClick={() => onGratitude([...gratitude, ""])}
            className="mt-2 inline-flex items-center gap-1 text-[15px] font-medium text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add another
          </button>
        )}
      </div>

      <div className="border-t border-border/40 pt-6">
        <h3 className="font-display text-lg font-semibold">Exhale</h3>
        <ul className="mt-3 divide-y divide-border/40">
          {EXHALE_LABELS.map(({ key, label }) => (
            <li key={key} className="flex items-start gap-3 py-2.5 text-[15px]">
              <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium">{label}. </span>
                <span className="text-foreground/85">{payload.method.exhale[key]}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border/40 pt-6">
        <h3 className="font-display text-lg font-semibold">Carey's recommendations</h3>
        <ul className="mt-3 space-y-2 text-[15px]">
          {payload.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button size="lg" className="rounded-full shadow-lg" onClick={onComplete} disabled={completing}>
          <Check className="mr-1.5 h-4 w-4" /> Complete check-in
        </Button>
      </div>
    </div>
  );
}