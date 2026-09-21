import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger,
} from "@/components/ui/sheet";
import { NoteMarkdownPreview } from "@/components/notes/NoteMarkdownPreview";
import { listNoteVersions, type NoteVersion } from "@/lib/notes/versions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Saved history for a note: every stored version, with a formatted preview and
 * the option to bring an older version back into the editor.
 */
export function NoteHistorySheet({
  noteId,
  currentTitle,
  currentBody,
  onRestore,
}: {
  noteId: string;
  currentTitle: string;
  currentBody: string;
  onRestore: (version: NoteVersion) => void;
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<NoteVersion[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setVersions(null);
    listNoteVersions(noteId)
      .then(v => { setVersions(v); setActiveId(v[0]?.id ?? null); })
      .catch(() => setVersions([]));
  }, [open, noteId]);

  const active = versions?.find(v => v.id === activeId) ?? null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Saved history" title="Saved history">
          <History className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-3 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-display">Saved history</SheetTitle>
          <SheetDescription>Past versions of this note. Open one to read it, or bring it back.</SheetDescription>
        </SheetHeader>

        <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-[13rem_1fr]">
          <div className="max-h-48 overflow-auto rounded-xl border border-border/60 p-1 sm:max-h-none">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className={cn(
                "w-full rounded-lg px-2 py-1.5 text-left text-xs",
                activeId === null ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <span className="font-medium">Current version</span>
              <span className="block text-[10px]">what you see in the editor</span>
            </button>
            {versions === null && <p className="px-2 py-2 text-xs text-muted-foreground">Loading…</p>}
            {versions?.length === 0 && (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                No saved versions yet. They start collecting as you write.
              </p>
            )}
            {versions?.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveId(v.id)}
                className={cn(
                  "w-full rounded-lg px-2 py-1.5 text-left text-xs",
                  activeId === v.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="font-medium">{format(parseISO(v.createdAt), "MMM d, yyyy")}</span>
                <span className="block text-[10px]">
                  {format(parseISO(v.createdAt), "h:mm a")} · {v.body.split(/\s+/).filter(Boolean).length} words
                </span>
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-col gap-2">
            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/60 bg-card/50 p-3">
              <h3 className="mb-2 font-display text-sm font-semibold">
                {active ? (active.title || "Untitled") : (currentTitle || "Untitled")}
              </h3>
              <NoteMarkdownPreview body={active ? active.body : currentBody} maxChars={20000} />
            </div>
            {active && (
              <Button
                size="sm"
                className="self-end gap-1"
                onClick={() => {
                  onRestore(active);
                  setOpen(false);
                  toast.success("Version restored", {
                    description: format(parseISO(active.createdAt), "MMM d, h:mm a"),
                  });
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restore this version
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
