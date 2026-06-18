import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { Pin, Link2, Check, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveNoteIcon, getLucideIcon, NOTE_ICONS } from "@/lib/note-icons";
import { getNoteCoverCss } from "@/lib/note-covers";
import { fallbackColorFor } from "@/lib/tags";
import type { Note } from "@/lib/notes";
import type { Tag } from "@/lib/tags";
import { NoteHoverPreview } from "@/components/notes/NoteHoverPreview";
import { deleteNote, updateNote } from "@/lib/notes";
import { NoteMarkdownPreview } from "@/components/notes/NoteMarkdownPreview";
import { NoteIconPicker } from "@/components/notes/NoteIconPicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

function countLinks(body: string): number {
  const m = body?.match(/\[\[[^\]]+]]/g);
  return m ? m.length : 0;
}

function tagColor(name: string, tagsByName: Map<string, Tag>): string {
  return tagsByName.get(name.toLowerCase())?.color || fallbackColorFor(name);
}

export function NoteCardV2({
  note,
  tagsByName,
  selected,
  onSelect,
  onDelete,
  onChanged,
  compact = false,
  previewLines,
  previewChars,
}: {
  note: Note;
  tagsByName: Map<string, Tag>;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Fired after pin/archive/inline-edit mutations so the parent can refresh. */
  onChanged?: () => void;
  compact?: boolean;
  /** 0 = hide preview, otherwise number of preview lines (also drives char budget). */
  previewLines?: number;
  /** Optional explicit max characters in the preview. */
  previewChars?: number;
}) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(note.title || "");
  const [draftIcon, setDraftIcon] = useState<string | null>(note.icon ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraftTitle(note.title || "");
      setDraftIcon(note.icon ?? null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing, note.id, note.title, note.icon]);

  const handleOpen = (id: string) => onSelect?.(id);
  const handleEdit = (_id: string) => setEditing(true);
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteNote(id);
      toast.success("Note deleted");
      onDelete?.(id);
    } catch {
      toast.error("Could not delete note");
    }
  };
  const handlePin = async (id: string, next: boolean) => {
    try {
      await updateNote(id, { pinned: next });
      toast.success(next ? "Pinned" : "Unpinned");
      onChanged?.();
    } catch { toast.error("Could not update pin"); }
  };
  const handleArchive = async (id: string, next: boolean) => {
    try {
      await updateNote(id, { archived: next });
      toast.success(next ? "Archived" : "Restored");
      onChanged?.();
    } catch { toast.error("Could not update archive"); }
  };
  const saveInline = async () => {
    const nextTitle = draftTitle.trim();
    if (nextTitle === (note.title || "") && draftIcon === (note.icon ?? null)) {
      setEditing(false);
      return;
    }
    try {
      await updateNote(note.id, { title: nextTitle || "Untitled", icon: draftIcon });
      toast.success("Note updated");
      setEditing(false);
      onChanged?.();
    } catch { toast.error("Could not save"); }
  };
  const cancelInline = () => { setEditing(false); };

  const title = note.kind === "daily" && note.date
    ? format(parseISO(note.date), "EEEE, MMM d")
    : (note.title || "Untitled");
  const resolvedIconName = resolveNoteIcon(note);
  const Icon = getLucideIcon(resolvedIconName);
  const iconEntry = NOTE_ICONS.find((e) => e.name === resolvedIconName);
  const iconTooltip = iconEntry?.description
    ? `${iconEntry.label} — ${iconEntry.description}`
    : iconEntry?.label;
  const gradient = !note.coverUrl ? getNoteCoverCss(note.coverGradient) : null;
  const linkCount = countLinks(note.body);
  const wordCount = note.body ? note.body.split(/\s+/).filter(Boolean).length : 0;

  return (
    <NoteHoverPreview
      note={note}
      tagsByName={tagsByName}
      onOpen={handleOpen}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onPin={handlePin}
      onArchive={handleArchive}
    >
    <div
      role={editing ? undefined : "button"}
      tabIndex={editing ? -1 : 0}
      onClick={() => !editing && onSelect?.(note.id)}
      onKeyDown={(e) => {
        if (editing) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(note.id); }
      }}
      onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(true); }}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-card/70 text-left transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "border-primary/60 shadow-md ring-1 ring-primary/30"
          : "border-border/60 hover:border-primary/40",
        compact ? "h-44" : "h-60",
      )}
    >
      {/* Cover band */}
      {note.coverUrl ? (
        <div
          className="h-16 w-full shrink-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${note.coverUrl})`, backgroundPositionY: `${note.coverPosition ?? 50}%` }}
        />
      ) : gradient ? (
        <div className="h-14 w-full shrink-0" style={{ background: gradient }} />
      ) : (
        <div className="h-3 w-full shrink-0 bg-gradient-to-r from-primary/20 to-accent/20" />
      )}

      {/* Header */}
      <div
        className="flex items-start gap-2 px-3.5 pt-3"
        onClick={editing ? (e) => e.stopPropagation() : undefined}
      >
        {editing ? (
          <>
            <span onClick={(e) => e.stopPropagation()}>
              <NoteIconPicker
                value={draftIcon}
                resolved={resolveNoteIcon({ ...note, icon: draftIcon })}
                onChange={(n) => setDraftIcon(n)}
                align="start"
                size="sm"
              />
            </span>
            <Input
              ref={inputRef}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); void saveInline(); }
                else if (e.key === "Escape") { e.preventDefault(); cancelInline(); }
              }}
              className="h-7 flex-1 px-2 text-[14px] font-medium"
              placeholder="Note title"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); void saveInline(); }}
              title="Save"
            >
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); cancelInline(); }}
              title="Cancel"
            >
              <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <>
            <Tooltip delayDuration={400}>
              <TooltipTrigger asChild>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary cursor-help">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              {iconTooltip && (
                <TooltipContent side="top" className="max-w-[220px] text-xs leading-snug">
                  {iconTooltip}
                </TooltipContent>
              )}
            </Tooltip>
            <h3 className="line-clamp-2 flex-1 font-display text-[15px] font-semibold leading-snug">{title}</h3>
            {note.pinned && <Pin className="mt-1 h-3.5 w-3.5 shrink-0 fill-current text-amber-500" />}
          </>
        )}
      </div>

      {/* Preview */}
      {(() => {
        const lines = previewLines ?? (compact ? 2 : 3);
        if (lines <= 0) return null;
        const chars = previewChars ?? Math.max(80, lines * 80);
        const maxH = `${lines * 1.45}rem`;
        return (
          <div
            className="px-3.5 pt-1.5 text-[12.5px] leading-relaxed overflow-hidden"
            style={{ maxHeight: maxH }}
          >
            <NoteMarkdownPreview body={note.body || ""} maxChars={chars} />
          </div>
        );
      })()}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1 px-3.5 pt-2">
          {note.tags.slice(0, 3).map(t => {
            const c = tagColor(t, tagsByName);
            return (
              <span
                key={t}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: `${c}26`, color: c }}
              >
                {t}
              </span>
            );
          })}
          {note.tags.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/40 bg-background/30 px-3.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{format(parseISO(note.updatedAt), "MMM d")}</span>
        <div className="flex items-center gap-2 normal-case tracking-normal">
          {wordCount > 0 && <span>{wordCount}w</span>}
          {linkCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-primary/80">
              <Link2 className="h-2.5 w-2.5" /> {linkCount}
            </span>
          )}
        </div>
      </div>
    </div>
    </NoteHoverPreview>
  );
}