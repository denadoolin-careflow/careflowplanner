import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRhythmPrompt, useRhythmForecastEnabled } from "@/lib/rhythm-forecast";
import { useMoonDataVersion } from "@/lib/moon-providers";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

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
  if (!on) return null;

  const prompt = getRhythmPrompt(date, scope);

  const saveToJournal = async () => {
    setSaving(true);
    try {
      await addJournal({
        type: scope === "weekly" ? "weekly" : "daily",
        title: scope === "weekly" ? "Weekly rhythm reflection" : "Rhythm prompt",
        body: `${prompt.text}\n\n`,
        date: date.toISOString().slice(0, 10),
      } as any);
      toast.success("Added to journal");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 p-3.5",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {scope === "weekly" ? "Weekly prompt" : "Today's prompt"}
        </p>
      </div>
      <p className="mt-1.5 font-display text-[15px] leading-snug">{prompt.text}</p>
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-7 rounded-full text-xs"
          onClick={saveToJournal}
          disabled={saving}
        >
          <NotebookPen className="mr-1 h-3.5 w-3.5" /> Add to journal
        </Button>
      </div>
    </div>
  );
}
