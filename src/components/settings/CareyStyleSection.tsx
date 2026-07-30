import { useEffect, useRef, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

const MAX = 600;

function StylePreview({ style, surface }: { style: string; surface: "shared" | "checkin" }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    setText("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-style-preview", {
        body: { style: style.slice(0, MAX), surface },
      });
      if (fnError) throw fnError;
      const preview = (data as { preview?: string; error?: string })?.preview;
      if (!preview) throw new Error((data as { error?: string })?.error || "No preview returned");
      setText(preview);
    } catch (e) {
      setError((e as Error).message || "Couldn't generate a preview. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <Button type="button" variant="outline" size="sm" onClick={run} disabled={loading}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {loading ? "Listening…" : "Preview this style"}
      </Button>
      {text && (
        <p className="mt-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-sm italic text-foreground/90">
          "{text}"
        </p>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

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
  const savedCheckin = state.settings?.checkinStyle ?? "";
  const [value, setValue] = useState(saved);
  const [checkinValue, setCheckinValue] = useState(savedCheckin);
  const [overrideOn, setOverrideOn] = useState(!!savedCheckin);
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const checkinTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setValue(saved);
    setCheckinValue(savedCheckin);
    setOverrideOn(!!savedCheckin);
  }, [saved, savedCheckin]);

  const commit = (next: string) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void updateProfile({ carey_style: next.slice(0, MAX) } as never);
    }, 600);
  };

  const commitCheckin = (next: string) => {
    setCheckinValue(next);
    if (checkinTimer.current) clearTimeout(checkinTimer.current);
    checkinTimer.current = setTimeout(() => {
      void updateProfile({ checkin_style: next.slice(0, MAX) } as never);
    }, 600);
  };

  const toggleOverride = (on: boolean) => {
    setOverrideOn(on);
    if (!on) {
      setCheckinValue("");
      if (checkinTimer.current) clearTimeout(checkinTimer.current);
      void updateProfile({ checkin_style: "" } as never);
    }
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
      <StylePreview style={value} surface="shared" />

      <div className="mt-6 border-t border-border/60 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="checkin-style-toggle" className="text-sm font-medium">
              Different style for the Morning Check-In
            </Label>
            <p className="text-xs text-muted-foreground">
              When on, the morning check-in uses this instead of the shared style.
            </p>
          </div>
          <Switch id="checkin-style-toggle" checked={overrideOn} onCheckedChange={toggleOverride} />
        </div>

        {overrideOn && (
          <div className="mt-3">
            <Textarea
              value={checkinValue}
              maxLength={MAX}
              rows={3}
              placeholder="e.g. Mornings: very short, no astrology, one clear first step."
              onChange={(e) => commitCheckin(e.target.value)}
              aria-label="Custom instructions for the Morning Check-In"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Saved automatically.</span>
              <span>{checkinValue.length}/{MAX}</span>
            </div>
            <StylePreview style={checkinValue || value} surface="checkin" />
          </div>
        )}
      </div>
    </SectionCard>
  );
}