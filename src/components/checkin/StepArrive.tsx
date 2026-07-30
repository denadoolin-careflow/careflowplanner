import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MOODS: { key: string; emoji: string; label: string }[] = [
  { key: "great", emoji: "😊", label: "Great" },
  { key: "good", emoji: "🙂", label: "Good" },
  { key: "okay", emoji: "😐", label: "Okay" },
  { key: "low", emoji: "😔", label: "Low" },
  { key: "overwhelmed", emoji: "😣", label: "Overwhelmed" },
];

interface Props {
  mood: string | null;
  onMood: (mood: string) => void;
  captureText: string;
  onCaptureText: (text: string) => void;
  onContinue: () => void;
  busy: boolean;
}

export function StepArrive({ mood, onMood, captureText, onCaptureText, onContinue, busy }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-lg font-semibold sm:text-xl">How are you arriving today?</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Carey uses this to shape the rest of your check-in.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onMood(m.key)}
              aria-pressed={mood === m.key}
              className={cn(
                "rounded-full border px-4 py-2 text-[15px] transition-colors",
                mood === m.key
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/60 hover:bg-secondary/40",
              )}
            >
              <span className="mr-1.5">{m.emoji}</span>{m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border/40 pt-6">
        <label htmlFor="checkin-capture" className="font-display text-lg font-semibold">
          What's on your mind?
        </label>
        <p className="mt-1 text-[15px] text-muted-foreground">Optional — a sentence is plenty.</p>
        <Textarea
          id="checkin-capture"
          value={captureText}
          onChange={(e) => onCaptureText(e.target.value)}
          placeholder="Anything you're carrying into today…"
          className="mt-3 min-h-[110px] text-[15px]"
        />
      </div>

      <div className="flex justify-end">
        <Button size="lg" className="rounded-full" onClick={onContinue} disabled={busy || !mood}>
          Continue
        </Button>
      </div>
    </div>
  );
}