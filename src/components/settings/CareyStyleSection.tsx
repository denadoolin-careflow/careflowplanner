import { useEffect, useRef, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";

const MAX = 600;

const EXAMPLES = [
  "Keep it short and practical.",
  "Skip astrology language.",
  "Always check in on my caregiving load.",
  "Never mention weight or dieting.",
  "Call me by my first name.",
];

export function CareyStyleSection() {
  const { state, updateProfile } = useStore();
  const saved = state.settings?.careyStyle ?? "";
  const [value, setValue] = useState(saved);
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setValue(saved);
  }, [saved]);

  const commit = (next: string) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void updateProfile({ carey_style: next.slice(0, MAX) } as never);
    }, 600);
  };

  const addExample = (ex: string) => {
    const next = (value.trim() ? `${value.trim()} ${ex}` : ex).slice(0, MAX);
    commit(next);
  };

  return (
    <SectionCard
      title="How Carey talks to you"
      subtitle="Your own instructions for Carey — tone, focus areas, things to always or never mention."
      accent="calm"
    >
      <Textarea
        value={value}
        maxLength={MAX}
        rows={4}
        placeholder="e.g. Keep it gentle and brief. Focus on caregiving and rest. Don't use astrology language."
        onChange={(e) => commit(e.target.value)}
        aria-label="Custom instructions for Carey"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Saved automatically.</span>
        <span>{value.length}/{MAX}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <Badge
            key={ex}
            variant="secondary"
            role="button"
            tabIndex={0}
            className="cursor-pointer font-normal hover:bg-secondary/70"
            onClick={() => addExample(ex)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addExample(ex); } }}
          >
            + {ex}
          </Badge>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Applies to the morning check-in, Carey chat, cosmic and today guidance, exhale, journal prompts,
        mental-load support, and weekly / monthly reviews. Carey treats this as a style preference only —
        it won't change structure or accuracy.
      </p>
    </SectionCard>
  );
}