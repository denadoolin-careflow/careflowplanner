import { cloneElement, isValidElement, useState, type ReactElement } from "react";
import { NotebookPen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getNote, type Note, type PeriodKind } from "@/lib/notes";
import { periodTitle } from "@/lib/notes/periods";
import { NoteMarkdownPreview } from "./NoteMarkdownPreview";

export function PeriodNotePreviewTrigger({
  kind,
  periodKey,
  noteId,
  children,
  onOpenNote,
}: {
  kind: PeriodKind;
  periodKey: string;
  noteId?: string;
  children: ReactElement;
  onOpenNote: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Note | null | undefined>(undefined);

  const load = () => {
    if (!noteId || preview !== undefined) return;
    setPreview(null);
    void getNote(noteId).then(setPreview).catch(() => setPreview(null));
  };

  const triggerElement = children as ReactElement<{
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
    onFocus?: (event: React.FocusEvent) => void;
  }>;
  const trigger = isValidElement(triggerElement) ? cloneElement(triggerElement, {
    onMouseEnter: (event: React.MouseEvent) => {
      triggerElement.props.onMouseEnter?.(event);
      if (noteId) { load(); setOpen(true); }
    },
    onMouseLeave: (event: React.MouseEvent) => triggerElement.props.onMouseLeave?.(event),
    onFocus: (event: React.FocusEvent) => {
      triggerElement.props.onFocus?.(event);
      if (noteId) { load(); setOpen(true); }
    },
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation();
      const touch = window.matchMedia?.("(hover: none)").matches;
      if (touch && noteId && !open) {
        event.preventDefault();
        load();
        setOpen(true);
        return;
      }
      onOpenNote();
    },
  }) : children;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        collisionPadding={12}
        className="w-80 max-w-[calc(100vw-1.5rem)] p-3"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <NotebookPen className="h-3 w-3" aria-hidden />
          {periodTitle(kind, periodKey)}
        </div>
        {preview ? (
          <NoteMarkdownPreview body={preview.body ?? ""} maxChars={520} className="text-xs" />
        ) : (
          <p className="text-xs text-muted-foreground">{noteId ? "Loading note…" : "No note yet."}</p>
        )}
        <button type="button" onClick={onOpenNote} className="mt-2 text-[11px] font-medium text-primary hover:underline">
          {noteId ? "Open note →" : "Start note →"}
        </button>
      </PopoverContent>
    </Popover>
  );
}