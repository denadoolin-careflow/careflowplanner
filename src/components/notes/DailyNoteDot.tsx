import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  DAILY_TEMPLATES,
  openDailyNoteWithTemplate,
  useDefaultDailyTemplate,
  type DailyNoteMark,
} from "@/lib/notes/daily";

/**
 * Small "did I write today?" indicator for planner day cells.
 * Filled = note written. Faint = nothing yet — tap to pick a layout.
 */
export function DailyNoteDot({ date, mark, className, size = 14 }: {
  date: Date;
  mark?: DailyNoteMark;
  className?: string;
  size?: number;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [defaultId, setDefaultId] = useDefaultDailyTemplate();
  const iso = format(date, "yyyy-MM-dd");
  const written = !!mark?.written;

  const openNote = async (templateId?: string | null) => {
    try {
      const note = await openDailyNoteWithTemplate(iso, templateId);
      setOpen(false);
      navigate(`/notes/${note.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open the note");
    }
  };

  const label = written
    ? `Daily note written for ${format(date, "MMMM d")} — open it`
    : `No daily note for ${format(date, "MMMM d")} — choose a layout`;

  if (written) {
    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={(e) => { e.stopPropagation(); void openNote(null); }}
        className={cn("grid shrink-0 place-items-center rounded-full text-primary hover:bg-primary/10", className)}
        style={{ height: size + 8, width: size + 8 }}
      >
        <NotebookPen style={{ height: size, width: size }} aria-hidden />
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className={cn("grid shrink-0 place-items-center rounded-full text-muted-foreground/45 hover:bg-muted hover:text-foreground", className)}
          style={{ height: size + 8, width: size + 8 }}
        >
          <NotebookPen style={{ height: size, width: size }} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2" onClick={(e) => e.stopPropagation()}>
        <div className="px-1 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          {format(date, "EEEE, MMM d")} · pick a layout
        </div>
        <div className="space-y-1">
          {DAILY_TEMPLATES.map(t => (
            <div key={t.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void openNote(t.id)}
                className="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted"
              >
                <span aria-hidden className="text-base leading-none">{t.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{t.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{t.description}</span>
                </span>
              </button>
              <DefaultStar id={t.id} current={defaultId} onPick={setDefaultId} />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DefaultStar({ id, current, onPick }: { id: string; current: string; onPick: (id: string) => void }) {
  const active = current === id;
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      title={active ? "Default layout" : "Make this my default layout"}
      aria-label={active ? "Default layout" : "Make this my default layout"}
      className={cn("shrink-0 rounded-full px-1.5 py-1 text-xs", active ? "text-amber-500" : "text-muted-foreground/40 hover:text-foreground")}
    >
      {active ? "★" : "☆"}
    </button>
  );
}
