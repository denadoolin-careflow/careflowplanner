import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowUp, ArrowDown, Undo2, Redo2, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { NoteHistorySheet } from "@/components/notes/NoteHistorySheet";
import { SaveStatus } from "@/components/notes/SaveStatus";
import { timestampedEntries, moveTimestampedEntry, editEntryTimestamp } from "@/lib/notes/timestamped-entries";
import type { useTodayNotebook } from "@/hooks/useTodayNotebook";

export function TodayNotebookPane({ notebook }: { notebook: ReturnType<typeof useTodayNotebook> }) {
  const [orderOpen, setOrderOpen] = useState(false);
  const entries = timestampedEntries(notebook.body);
  return (
    <section aria-label="Today's notebook note" className="notes-editor-experience min-w-0 space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
        <div><h2 className="flex items-center gap-2 font-display text-xl"><BookOpen className="h-4 w-4 text-primary" />Today's notebook note</h2><p className="mt-1 text-xs text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p></div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" disabled={!notebook.canUndo} aria-label="Undo" title="Undo" onClick={notebook.undo}><Undo2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" disabled={!notebook.canRedo} aria-label="Redo" title="Redo" onClick={notebook.redo}><Redo2 className="h-4 w-4" /></Button>
          {notebook.note && <NoteHistorySheet noteId={notebook.note.id} currentTitle={notebook.note.title} currentBody={notebook.body} onRestore={v => notebook.changeBody(v.body, { checkpoint: true })} />}
          <SaveStatus state={notebook.status} onRetry={() => { void notebook.flush(); }} />
        </div>
      </header>
      {notebook.note ? <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" aria-expanded={orderOpen} onClick={() => setOrderOpen(v => !v)}>Timestamped entries ({entries.length})</Button>
          <Button asChild variant="ghost" size="sm"><Link to={`/notes?view=notebook&month=${format(new Date(), "yyyy-MM")}`}><ExternalLink className="mr-1 h-3.5 w-3.5" />Notebook</Link></Button>
        </div>
        {orderOpen && <ol aria-label="Timestamped entries" className="space-y-2 border-b border-border pb-3">
          {entries.map((entry, index) => <li key={index} className="flex items-center gap-1.5">
            <Input key={`${index}-${entry.time}`} defaultValue={entry.time} aria-label={`Entry ${index + 1} timestamp`} className="h-10 min-w-0 flex-1" onBlur={e => notebook.changeBody(editEntryTimestamp(notebook.body, index, e.target.value), { checkpoint: true })} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} />
            <Button variant="ghost" size="icon" disabled={index === 0} aria-label={`Move entry ${index + 1} up`} title="Move entry up" onClick={() => notebook.changeBody(moveTimestampedEntry(notebook.body, index, -1), { checkpoint: true })}><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" disabled={index === entries.length - 1} aria-label={`Move entry ${index + 1} down`} title="Move entry down" onClick={() => notebook.changeBody(moveTimestampedEntry(notebook.body, index, 1), { checkpoint: true })}><ArrowDown className="h-4 w-4" /></Button>
          </li>)}
        </ol>}
        <BlockEditor body={notebook.body} noteId={notebook.note.id} defaultDueDate={notebook.note.date} showFooter={false} minHeight="min-h-[340px]" toolbarPlacement="top" onChange={md => notebook.changeBody(md)} />
        <Button asChild variant="ghost" size="sm"><Link to={`/notes/${notebook.note.id}`}>Open full note<ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
      </> : <div className="py-8 text-sm text-muted-foreground">Opening today's notebook note…<Button variant="ghost" size="sm" onClick={() => { void notebook.load().catch(() => {}); }}>Retry</Button></div>}
    </section>
  );
}