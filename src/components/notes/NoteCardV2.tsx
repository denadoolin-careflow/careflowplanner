import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Pin, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveNoteIcon, getLucideIcon } from "@/lib/note-icons";
import { getNoteCoverCss } from "@/lib/note-covers";
import { fallbackColorFor } from "@/lib/tags";
import type { Note } from "@/lib/notes";
import type { Tag } from "@/lib/tags";
import { NoteHoverPreview } from "@/components/notes/NoteHoverPreview";

function stripMd(s: string): string {
  if (!s) return "";
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/\[\[([^\]]+)]]/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+\[[ xX]]\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

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
  compact = false,
}: {
  note: Note;
  tagsByName: Map<string, Tag>;
  selected?: boolean;
  onSelect?: (id: string) => void;
  compact?: boolean;
}) {
  const title = note.kind === "daily" && note.date
    ? format(parseISO(note.date), "EEEE, MMM d")
    : (note.title || "Untitled");
  const Icon = getLucideIcon(resolveNoteIcon(note));
  const gradient = !note.coverUrl ? getNoteCoverCss(note.coverGradient) : null;
  const preview = stripMd(note.body).slice(0, 180);
  const linkCount = countLinks(note.body);
  const wordCount = note.body ? note.body.split(/\s+/).filter(Boolean).length : 0;

  return (
    <NoteHoverPreview note={note} tagsByName={tagsByName}>
    <button
      type="button"
      onClick={() => onSelect?.(note.id)}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-card/70 text-left transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg",
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
      <div className="flex items-start gap-2 px-3.5 pt-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="line-clamp-2 flex-1 font-display text-[15px] font-semibold leading-snug">{title}</h3>
        {note.pinned && <Pin className="mt-1 h-3.5 w-3.5 shrink-0 fill-current text-amber-500" />}
      </div>

      {/* Preview */}
      <p className={cn(
        "px-3.5 pt-1.5 text-[12.5px] leading-relaxed text-muted-foreground",
        compact ? "line-clamp-2" : "line-clamp-3",
      )}>
        {preview || <span className="italic opacity-60">Empty note</span>}
      </p>

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
    </button>
    </NoteHoverPreview>
  );
}