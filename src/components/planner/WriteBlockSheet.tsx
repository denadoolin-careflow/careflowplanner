import { useCallback, useEffect, useRef, useState } from "react";
import { NotebookPen, StickyNote, ExternalLink, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BlockEditor } from "@/components/notes/BlockEditor";
import {
  WRITE_BLOCK_EVENT,
  loadWriteRecord,
  renameWriteBlock,
  saveWriteBody,
  type WriteBlockTarget,
} from "@/lib/planner/write-blocks";

/**
 * Global host: listens for `openWriteBlock(...)` and slides in a writing
 * surface (full block editor) so a scheduled note/journal can be written
 * without leaving the planner.
 */
export function WriteBlockSheet() {
  const navigate = useNavigate();
  const [target, setTarget] = useState<WriteBlockTarget | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<WriteBlockTarget>).detail;
      if (!detail?.recordId) return;
      setTarget(detail);
      setTitle(detail.title ?? "");
      setBody("");
      setLoading(true);
      void loadWriteRecord(detail).then(rec => {
        if (rec) { setTitle(rec.title); setBody(rec.body); }
        setLoading(false);
      });
    };
    window.addEventListener(WRITE_BLOCK_EVENT, handler as EventListener);
    return () => window.removeEventListener(WRITE_BLOCK_EVENT, handler as EventListener);
  }, []);

  const queueSave = useCallback((markdown: string) => {
    setBody(markdown);
    if (!target) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = window.setTimeout(() => {
      void saveWriteBody(target, markdown).finally(() => setSaving(false));
    }, 700);
  }, [target]);

  const commitTitle = () => {
    if (!target) return;
    void renameWriteBlock(target, title);
  };

  const close = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    if (target) void saveWriteBody(target, body);
    setTarget(null);
  };

  const isNote = target?.kind === "note";

  return (
    <Sheet open={!!target} onOpenChange={(o) => { if (!o) close(); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="space-y-2 border-b border-border/60 px-4 py-3 text-left">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              {isNote ? <StickyNote className="h-3.5 w-3.5" /> : <NotebookPen className="h-3.5 w-3.5" />}
            </span>
            <SheetTitle className="flex-1 truncate font-display text-sm">
              {isNote ? "Note" : "Journal entry"}
            </SheetTitle>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {target && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 rounded-full px-2 text-[11px]"
                onClick={() => {
                  const to = isNote ? `/notes/${target.recordId}` : "/journal";
                  close();
                  navigate(to);
                }}
              >
                <ExternalLink className="h-3 w-3" /> Open full
              </Button>
            )}
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitTitle(); } }}
            placeholder={isNote ? "Note title" : "Entry title"}
            className="h-9 border-none bg-transparent px-0 font-display text-lg font-semibold shadow-none focus-visible:ring-0"
          />
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : target ? (
            <BlockEditor
              key={target.recordId}
              body={body}
              onChange={(md) => queueSave(md)}
              noteId={isNote ? target.recordId : undefined}
              minHeight="50vh"
              showFooter={false}
              placeholder={isNote ? "Press / for blocks…" : "How is this moment landing?"}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}