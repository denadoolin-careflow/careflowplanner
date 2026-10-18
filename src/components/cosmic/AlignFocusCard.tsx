import { useState } from "react";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { usePriorities } from "@/lib/planner/use-priorities";
import { rulerFor, pickRulerTask } from "@/lib/rhythm-guidance";

/** One tap: pin today's task that best fits the day's ruling planet as a top priority. */
export function AlignFocusCard({ date }: { date: Date }) {
  const { state } = useStore();
  const { pin, isPinned, full } = usePriorities(date, "day");
  const [busy, setBusy] = useState(false);
  const ruler = rulerFor(date);
  const iso = format(date, "yyyy-MM-dd");

  const align = async () => {
    const open = state.tasks.filter(t => !t.done && (t.dueDate === iso || !t.dueDate));
    const today = open.filter(t => t.dueDate === iso);
    const match = pickRulerTask(date, today) ?? pickRulerTask(date, open);
    if (!match) { toast(`No task fits ${ruler.planet}'s day yet. Try adding one about ${ruler.focus}.`); return; }
    if (isPinned("task", match.id)) { toast.success(`“${match.title}” is already a top priority`); return; }
    if (full) { toast(`Your Top 3 is full. ${ruler.planet} suggests “${match.title}”.`); return; }
    setBusy(true);
    try {
      const ok = await pin({ type: "task", id: match.id, title: match.title });
      if (ok) toast.success(`Added “${match.title}” to today's Top 3`);
      else toast.error("Couldn't add it to your Top 3");
    } finally { setBusy(false); }
  };

  return (
    <section className="cozy-card p-4" aria-label="Align today's focus">
      <p className="text-sm font-medium">Today is ruled by {ruler.planet}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">A good focus: {ruler.focus}.</p>
      <Button size="sm" className="mt-3 min-h-9" onClick={align} disabled={busy}>
        <Sparkles className="mr-1.5 h-4 w-4" aria-hidden /> Align my focus
      </Button>
    </section>
  );
}
