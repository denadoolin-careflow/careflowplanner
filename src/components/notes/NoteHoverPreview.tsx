import { format, parseISO } from "date-fns";
import { Pin, PinOff, Link2, Tag as TagIcon, ExternalLink, Pencil, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { resolveNoteIcon, getLucideIcon } from "@/lib/note-icons";
import { getNoteCoverCss } from "@/lib/note-covers";
import { fallbackColorFor } from "@/lib/tags";
import type { Note } from "@/lib/notes";
import type { Tag } from "@/lib/tags";
import { NoteMarkdownPreview } from "@/components/notes/NoteMarkdownPreview";

export function NoteHoverPreview({
  note,
  tagsByName,
  children,
  side = "right",
  openDelay = 350,
  onOpen,
  onEdit,
  onDelete,
  onPin,
  onArchive,
}: {
  note: Note;
  tagsByName: Map<string, Tag>;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  openDelay?: number;
  onOpen?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPin?: (id: string, next: boolean) => void;
  onArchive?: (id: string, next: boolean) => void;
}) {
  const title = note.kind === "daily" && note.date
    ? format(parseISO(note.date), "EEEE, MMM d")
    : (note.title || "Untitled");
  const Icon = getLucideIcon(resolveNoteIcon(note));
  const gradient = !note.coverUrl ? getNoteCoverCss(note.coverGradient) : null;
  const linkMatches = note.body?.match(/\[\[[^\]]+]]/g);
  const linkCount = linkMatches ? linkMatches.length : 0;
  const wordCount = note.body ? note.body.split(/\s+/).filter(Boolean).length : 0;

  return (
    <HoverCard openDelay={openDelay} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align="start"
        sideOffset={10}
        className="w-80 overflow-hidden rounded-2xl border-border/60 bg-card/95 p-0 shadow-xl backdrop-blur"
      >
        {note.coverUrl ? (
          <div
            className="h-20 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${note.coverUrl})`, backgroundPositionY: `${note.coverPosition ?? 50}%` }}
          />
        ) : gradient ? (
          <div className="h-14 w-full" style={{ background: gradient }} />
        ) : (
          <div className="h-2 w-full bg-gradient-to-r from-primary/30 to-accent/30" />
        )}

        <div className="space-y-2 p-3.5">
          <div className="flex items-start gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <h4 className="line-clamp-2 flex-1 font-display text-sm font-semibold leading-snug">{title}</h4>
            {note.pinned && <Pin className="mt-1 h-3.5 w-3.5 shrink-0 fill-current text-amber-500" />}
          </div>

          <div className="max-h-44 overflow-hidden text-[12.5px] leading-relaxed">
            <NoteMarkdownPreview body={note.body || ""} maxChars={420} />
          </div>

          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <TagIcon className="h-3 w-3 text-muted-foreground/70" />
              {note.tags.slice(0, 6).map(t => {
                const c = tagsByName.get(t.toLowerCase())?.color || fallbackColorFor(t);
                return (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: `${c}26`, color: c }}
                  >
                    {t}
                  </span>
                );
              })}
              {note.tags.length > 6 && (
                <span className="text-[10px] text-muted-foreground">+{note.tags.length - 6}</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Updated {format(parseISO(note.updatedAt), "MMM d, yyyy")}</span>
            <div className="flex items-center gap-2 normal-case tracking-normal">
              {wordCount > 0 && <span>{wordCount} words</span>}
              {linkCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-primary/80">
                  <Link2 className="h-2.5 w-2.5" /> {linkCount}
                </span>
              )}
            </div>
          </div>

          {/* Quick actions */}
          {(onOpen || onEdit || onDelete || onPin || onArchive) && (
            <div className="flex flex-wrap items-center gap-1 border-t border-border/40 pt-2">
              {onOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 flex-1 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); onOpen(note.id); }}
                >
                  <ExternalLink className="h-3 w-3" /> Open
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 flex-1 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); onEdit(note.id); }}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              )}
              {onPin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 flex-1 gap-1 text-[11px] ${note.pinned ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={(e) => { e.stopPropagation(); onPin(note.id, !note.pinned); }}
                  title={note.pinned ? "Unpin" : "Pin to top"}
                >
                  {note.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                  {note.pinned ? "Unpin" : "Pin"}
                </Button>
              )}
              {onArchive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 flex-1 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); onArchive(note.id, !note.archived); }}
                  title={note.archived ? "Restore from archive" : "Archive note"}
                >
                  {note.archived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                  {note.archived ? "Restore" : "Archive"}
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 flex-1 gap-1 text-[11px] text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}