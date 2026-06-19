import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, File as FileIcon, Image as ImageIcon, Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { listNotes, type Note } from "@/lib/notes";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getAllPdfSummaries, type PdfSummary } from "@/lib/pdf-summaries";

const BUCKET = "attachments";

type Row = Attachment & { noteId: string; noteTitle: string; noteUpdatedAt: string };

function isImage(a: Pick<Attachment, "mimeType" | "name">) {
  if (a.mimeType?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|avif|heic|svg)$/i.test(a.name ?? "");
}

function isPdf(a: Pick<Attachment, "mimeType" | "name">) {
  if ((a.mimeType ?? "").includes("pdf")) return true;
  return /\.pdf$/i.test(a.name ?? "");
}

function prettyBytes(n?: number) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function NotesFiles() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "photos" | "files" | "pdfs">("all");
  const [summaries, setSummaries] = useState<Record<string, PdfSummary>>({});

  useEffect(() => {
    const refresh = () => setSummaries(getAllPdfSummaries());
    refresh();
    window.addEventListener("careflow:pdf-summary", refresh);
    return () => window.removeEventListener("careflow:pdf-summary", refresh);
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const notes = await listNotes();
        const flat: Row[] = [];
        for (const n of notes) {
          for (const a of n.attachments ?? []) {
            flat.push({ ...a, noteId: n.id, noteTitle: n.title || "Untitled", noteUpdatedAt: n.updatedAt });
          }
        }
        flat.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
        if (!cancel) setRows(flat);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load files");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Resolve signed URLs lazily.
  useEffect(() => {
    let cancel = false;
    const needed = rows.filter(r => !urls[r.id]);
    if (!needed.length) return;
    (async () => {
      const next: Record<string, string> = {};
      await Promise.all(needed.map(async r => {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(r.path, 60 * 60);
        if (data?.signedUrl) next[r.id] = data.signedUrl;
      }));
      if (!cancel && Object.keys(next).length) setUrls(prev => ({ ...prev, ...next }));
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map(r => r.id).join(",")]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(r => {
      if (tab === "photos" && !isImage(r)) return false;
      if (tab === "files" && isImage(r)) return false;
      if (tab === "pdfs" && !isPdf(r)) return false;
      if (!term) return true;
      const s = summaries[r.path];
      return (
        r.name.toLowerCase().includes(term) ||
        r.noteTitle.toLowerCase().includes(term) ||
        (r.mimeType ?? "").toLowerCase().includes(term) ||
        (s ? (s.summary + " " + (s.keyPoints || []).join(" ") + " " + s.text).toLowerCase().includes(term) : false)
      );
    });
  }, [rows, q, tab, summaries]);

  const photos = filtered.filter(isImage);
  const files = filtered.filter(r => !isImage(r));

  return (
    <div className="mx-auto w-full max-w-[1280px] p-3 md:p-5">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
          <Link to="/notes"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Notes</Link>
        </Button>
        <div>
          <h1 className="font-display text-xl font-semibold sm:text-2xl">Files & Photos</h1>
          <p className="text-[11px] text-muted-foreground">Everything you’ve attached to your notes</p>
        </div>
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search files, notes, or PDF contents…"
            className="h-9 rounded-full pl-8"
          />
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {([
          { id: "all", label: `All (${rows.length})` },
          { id: "photos", label: `Photos (${rows.filter(isImage).length})` },
          { id: "files", label: `Files (${rows.filter(r => !isImage(r)).length})` },
          { id: "pdfs", label: `PDFs (${rows.filter(isPdf).length})` },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              tab === t.id ? "border-primary/50 bg-primary/15 text-foreground" : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60",
            )}
          >{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/50 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading attachments…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          <ImageIcon className="mx-auto mb-2 h-5 w-5 opacity-60" />
          No attachments yet. Open any note and use “Add files” to drop in photos or documents.
        </div>
      ) : (
        <>
          {photos.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Photos · {photos.length}
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {photos.map(r => {
                  const url = urls[r.id];
                  return (
                    <Link
                      key={r.id}
                      to={`/notes/${r.noteId}`}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-card/60 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg"
                      title={`${r.name} · ${r.noteTitle}`}
                    >
                      {url ? (
                        <img src={url} alt={r.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                        <div className="truncate font-medium">{r.noteTitle}</div>
                        <div className="truncate opacity-80">{r.name}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {files.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Files · {files.length}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {files.map(r => {
                  const url = urls[r.id];
                  const s = summaries[r.path];
                  return (
                    <li key={r.id} className="rounded-xl border border-border/60 bg-card/60 p-2.5 shadow-soft">
                      <div className="flex items-center gap-2">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted/60">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <div className="truncate text-sm font-medium">{r.name}</div>
                          {s && <Sparkles className="h-3 w-3 shrink-0 text-primary/70" aria-label="AI summarized" />}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          <Link to={`/notes/${r.noteId}`} className="hover:underline">{r.noteTitle}</Link>
                          {" · "}{prettyBytes(r.size)}
                        </div>
                      </div>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          download={r.name}
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          title="Open / download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      </div>
                      {s?.summary && (
                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                          {s.summary}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}