import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { PeriodKind } from "@/lib/notes";
import { periodTitle } from "@/lib/notes/periods";
import {
  TEMPLATES_BY_KIND,
  openPeriodNoteWithTemplate,
  useDefaultPeriodTemplate,
  type PeriodNoteMark,
} from "@/lib/notes/daily";

/**
 * "Did I write this week / month?" indicator for planner headers.
 * Filled = written. Faint = nothing yet — tap to pick a layout.
 */
export function PeriodNoteDot({ kind, keyISO, mark, className, size = 14, showLabel = false }: {
  kind: PeriodKind;
  keyISO: string;
  mark?: PeriodNoteMark;
  className?: string;
  size?: number;
  /** Show "Weekly note" text next to the icon. */
  showLabel?: boolean;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [defaultId, setDefaultId] = useDefaultPeriodTemplate(kind);
  const written = !!mark?.written;
  const noun = kind === "weekly" ? "Weekly note" : kind === "monthly" ? "Monthly note" : "Daily note";
  const title = periodTitle(kind, keyISO, { short: true });

  const openNote = async (templateId?: string | null) => {
    try {
      const note = await openPeriodNoteWithTemplate(kind, keyISO, templateId);
      setOpen(false);
      navigate(`/notes/${note.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open the note");
    }
  };

  const label = written ? `${noun} written for ${title} — open it` : `No ${noun.toLowerCase()} for ${title} — choose a layout`;
  const btnCls = cn(
    "inline-flex shrink-0 items-center gap-1 rounded-full",
    showLabel ? "px-2 py-1 text-[11px]" : "grid place-items-center",
    written ? "text-primary hover:bg-primary/10" : "text-muted-foreground/50 hover:bg-muted hover:text-foreground",
    className,
  );
  const style = showLabel ? undefined : { height: size + 8, width: size + 8 };
  const inner = (
    <>
      <NotebookPen style={{ height: size, width: size }} aria-hidden />
      {showLabel && <span>{noun}</span>}
    </>
  );

  if (written) {
    return (
      <button type="button" title={label} aria-label={label} onClick={(e) => { e.stopPropagation(); void openNote(null); }} className={btnCls} style={style}>
        {inner}
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" title={label} aria-label={label} onClick={(e) => e.stopPropagation()} className={btnCls} style={style}>
          {inner}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2" onClick={(e) => e.stopPropagation()}>
        <div className="px-1 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          {title} · pick a layout
        </div>
        <div className="space-y-1">
          {TEMPLATES_BY_KIND[kind].map(t => {
            const active = defaultId === t.id;
            return (
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
                <button
                  type="button"
                  onClick={() => setDefaultId(t.id)}
                  title={active ? "Default layout" : "Make this my default layout"}
                  aria-label={active ? "Default layout" : "Make this my default layout"}
                  className={cn("shrink-0 rounded-full px-1.5 py-1 text-xs", active ? "text-amber-500" : "text-muted-foreground/40 hover:text-foreground")}
                >
                  {active ? "★" : "☆"}
                </button>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
