import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, NotebookPen, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getRhythmPrompt,
  useRhythmForecastEnabled,
  getElementMeta,
  getElementRecommendation,
} from "@/lib/rhythm-forecast";
import { getMoonData } from "@/lib/moon-providers";
import { useMoonDataVersion } from "@/lib/moon-providers";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  date?: Date;
  scope?: "daily" | "weekly";
  className?: string;
}

/**
 * Optional rhythm-aware journal prompt. Caregiver-friendly, practical tone.
 * One prompt per day / per week, deterministic by date.
 */
export function RhythmJournalPrompt({ date = new Date(), scope = "daily", className }: Props) {
  const [on] = useRhythmForecastEnabled();
  useMoonDataVersion();
  const { addJournal } = useStore();
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reflection, setReflection] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  if (!on) return null;

  const prompt = getRhythmPrompt(date, scope);
  const element = getElementMeta(date);
  const moon = getMoonData(date);
  const energyTheme = `${moon.label} · ${element.label} (${element.verb})`;
  const recommendation = getElementRecommendation(date);

  const saveToJournal = async () => {
    setSaving(true);
    try {
      const body = [
        `Energy theme — ${energyTheme}`,
        recommendation ? `Suggestion: ${recommendation}` : null,
        "",
        `Prompt: ${prompt.text}`,
        "",
        reflection.trim() || "(reflect here later)",
      ].filter(Boolean).join("\n");
      await addJournal({
        type: scope === "weekly" ? "weekly" : "daily",
        title: scope === "weekly" ? `Weekly rhythm — ${element.label}` : `Rhythm — ${element.label}`,
        body,
        date: date.toISOString().slice(0, 10),
        template: "rhythm-prompt",
        prompts: [prompt.text],
        tags: ["rhythm", `moon:${moon.phase}`, `element:${element.id}`],
      } as any);
      setSavedId(date.toISOString());
      toast.success(reflection.trim() ? "Saved to journal" : "Prompt saved — open Journal to add your reflection");
      setExpanded(false);
      setReflection("");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 p-3.5 transition-colors",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => !savedId && setExpanded((v) => !v)}
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={expanded}
      >
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {scope === "weekly" ? "Weekly prompt" : "Today's prompt"}
            </span>
            <span
              className="rounded-full border border-border/60 bg-background/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground"
              title="Energy theme linked to this entry"
            >
              {energyTheme}
            </span>
          </div>
          <p className="mt-1 font-display text-[15px] leading-snug">{prompt.text}</p>
          {!expanded && !savedId && (
            <p className="mt-1 text-[11px] text-muted-foreground">Tap to reflect — saved to Journal with today's energy theme.</p>
          )}
        </div>
      </button>

      {expanded && !savedId && (
        <div className="mt-3 space-y-2">
          <Textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="A line or two is enough…"
            rows={3}
            className="resize-none text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm" variant="ghost" className="h-7 rounded-full text-xs"
              onClick={() => { setExpanded(false); setReflection(""); }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm" className="h-7 rounded-full text-xs"
              onClick={saveToJournal}
              disabled={saving}
            >
              <NotebookPen className="mr-1 h-3.5 w-3.5" /> Save to journal
            </Button>
          </div>
        </div>
      )}

      {savedId && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-primary" /> Saved with energy theme · open Journal to keep writing.
        </div>
      )}
    </div>
  );
}
