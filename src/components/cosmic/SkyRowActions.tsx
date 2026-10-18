import { CalendarPlus, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { appendToTodaysNote } from "@/lib/astro-suite/tarot-pulls";

/** "Send to Planner" + "Journal this" for any sky/transit row. */
export function SkyRowActions({ title, date, note }: { title: string; date?: Date | null; note?: string }) {
  const { addTask } = useStore() as any;
  return (
    <div className="flex gap-1">
      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Send to Planner" onClick={async () => {
        await addTask?.({ title, dueDate: date ? date.toLocaleDateString("en-CA") : undefined, cosmic_tag: "sky" });
        toast.success("Added to Planner");
      }}><CalendarPlus className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Journal this" onClick={async () => {
        try { await appendToTodaysNote(`✦ ${title}${note ? ` — ${note}` : ""}\n\n`); toast.success("Added to today's note"); }
        catch { toast.error("Couldn't add to today's note"); }
      }}><NotebookPen className="h-4 w-4" /></Button>
    </div>
  );
}
