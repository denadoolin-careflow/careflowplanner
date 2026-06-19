import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Upload, X, Image as ImageIcon, FileText, Download, Loader2, Eye, EyeOff, Sparkles, RefreshCw, Maximize2, FilePlus2, ListChecks, Minimize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Attachment } from "@/lib/types";
import { aiInvoke, triggerUpgradePrompt } from "@/lib/ai-invoke";
import { getPdfSummary, setPdfSummary, type PdfSummary } from "@/lib/pdf-summaries";
import { openMediaLightbox } from "@/components/media/MediaLightbox";

const BUCKET = "attachments";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export type AttachmentsScope = "task" | "journal" | "home-note" | "memory" | "note";

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "file";
}

function isImage(att: Pick<Attachment, "mimeType" | "name">) {
  if (att.mimeType?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|avif|heic|svg)$/i.test(att.name ?? "");
}

function isPdf(att: Pick<Attachment, "mimeType" | "name">) {
  if ((att.mimeType ?? "").includes("pdf")) return true;
  return /\.pdf$/i.test(att.name ?? "");
}

function isVideo(att: Pick<Attachment, "mimeType" | "name">) {
  if ((att.mimeType ?? "").startsWith("video/")) return true;
  return /\.(mp4|webm|mov|m4v)$/i.test(att.name ?? "");
}

function isAudio(att: Pick<Attachment, "mimeType" | "name">) {
  if ((att.mimeType ?? "").startsWith("audio/")) return true;
  return /\.(mp3|wav|m4a|ogg|aac)$/i.test(att.name ?? "");
}

function isPlainText(att: Pick<Attachment, "mimeType" | "name">) {
  if ((att.mimeType ?? "").startsWith("text/")) return true;
  return /\.(txt|md|csv|json|log|xml|yaml|yml)$/i.test(att.name ?? "");
}

function canPreviewInline(att: Pick<Attachment, "mimeType" | "name">) {
  return isImage(att) || isPdf(att) || isVideo(att) || isAudio(att) || isPlainText(att);
}

function prettyBytes(n?: number) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Upload, list, preview and remove attachments stored in the `attachments` bucket. */
export function AttachmentsField({
  scope,
  ownerId,
  value,
  onChange,
  compact = false,
}: {
  scope: AttachmentsScope;
  ownerId: string;
  value: Attachment[] | undefined;
  onChange: (next: Attachment[]) => void;
  compact?: boolean;
}) {
  const items = value ?? [];
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [summaries, setSummaries] = useState<Record<string, PdfSummary | null>>({});
  const [summarizing, setSummarizing] = useState<Record<string, boolean>>({});
  const [showSummary, setShowSummary] = useState<Record<string, boolean>>({});
  const [fitPage, setFitPage] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancel = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancel) setUid(data.user?.id ?? null);
    });
    return () => { cancel = true; };
  }, []);

  // Resolve signed URLs for image previews and download links.
  useEffect(() => {
    let cancel = false;
    const needed = items.filter((a) => !urls[a.id]);
    if (needed.length === 0) return;
    (async () => {
      const next: Record<string, string> = {};
      await Promise.all(needed.map(async (a) => {
        const bucket = a.bucket || BUCKET;
        const { data } = await supabase.storage.from(bucket).createSignedUrl(a.path, 60 * 60);
        if (data?.signedUrl) next[a.id] = data.signedUrl;
      }));
      if (!cancel && Object.keys(next).length) setUrls((prev) => ({ ...prev, ...next }));
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((a) => a.id).join(",")]);

  // Load cached PDF summaries from localStorage when items change.
  useEffect(() => {
    const next: Record<string, PdfSummary | null> = {};
    for (const a of items) {
      if (isPdf(a)) next[a.id] = getPdfSummary(a.path);
    }
    setSummaries(next);
  }, [items.map((a) => a.id).join(",")]);

  const summarizePdf = useCallback(async (a: Attachment) => {
    setSummarizing((p) => ({ ...p, [a.id]: true }));
    try {
      const { data, error, quotaExceeded } = await aiInvoke<{
        summary: string; keyPoints: string[]; text: string; error?: string; message?: string; fallback?: boolean;
      }>("ai-pdf-summary", { body: { path: a.path, name: a.name } });
      if (quotaExceeded) return;
      if (data?.error === "ai_quota_exceeded") {
        triggerUpgradePrompt({ title: "You've reached your AI limit", message: data.message });
        return;
      }
      if (data?.error === "ai_rate_limited") {
        toast.error(data.message || "Rate limit reached. Try again shortly.");
        return;
      }
      if (error || !data) {
        toast.error(error?.error || error?.message || "Could not summarize PDF");
        return;
      }
      setPdfSummary(a.path, {
        summary: data.summary || "",
        keyPoints: data.keyPoints || [],
        text: data.text || "",
      });
      setSummaries((p) => ({ ...p, [a.id]: getPdfSummary(a.path) }));
      setShowSummary((p) => ({ ...p, [a.id]: true }));
      toast.success("PDF summarized");
    } finally {
      setSummarizing((p) => ({ ...p, [a.id]: false }));
    }
  }, []);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!uid) { toast.error("Please sign in to attach files."); return; }
    const list = Array.from(files);
    if (list.length === 0) return;
    setBusy(true);
    const added: Attachment[] = [];
    try {
      for (const file of list) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name} is over 20 MB`);
          continue;
        }
        const id = (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const path = `${uid}/${scope}/${ownerId || "new"}/${id}-${sanitize(file.name)}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
        if (error) {
          toast.error(`Upload failed: ${file.name}`);
          continue;
        }
        added.push({
          id, path, name: file.name, mimeType: file.type || undefined,
          size: file.size, uploadedAt: new Date().toISOString(),
        });
      }
      if (added.length) {
        onChange([...items, ...added]);
        toast.success(`Attached ${added.length} file${added.length === 1 ? "" : "s"}`);
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [uid, scope, ownerId, items, onChange]);

  const remove = async (att: Attachment) => {
    onChange(items.filter((a) => a.id !== att.id));
    try { await supabase.storage.from(att.bucket || BUCKET).remove([att.path]); } catch { /* best-effort */ }
    setUrls((prev) => {
      const { [att.id]: _gone, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div
      className={cn("space-y-2", compact && "space-y-1.5")}
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files); }}
    >
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) void uploadFiles(e.target.files); }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={busy || !uid}
        >
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
          {busy ? "Uploading…" : "Add files"}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Drag & drop, or paste below. Up to 20 MB each.
        </span>
      </div>

      {items.length > 0 && (
        <ul className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
          {items.map((a) => {
            const url = urls[a.id];
            const img = isImage(a);
            const pdf = isPdf(a);
            const video = isVideo(a);
            const audio = isAudio(a);
            const previewable = canPreviewInline(a);
            const isOpen = expanded[a.id] ?? pdf; // PDFs auto-open
            return (
              <li key={a.id} className={cn(
                "group relative rounded-xl border border-border/50 bg-card/60 overflow-hidden",
                pdf && !compact && "sm:col-span-2",
              )}>
                <div className="flex items-center gap-2 p-2">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-muted/50">
                    {img && url
                      ? <img src={url} alt={a.name} className="h-full w-full object-cover" loading="lazy" />
                      : img ? <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      : <FileText className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{a.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {a.mimeType ?? "file"} · {prettyBytes(a.size)}
                    </div>
                  </div>
                  {pdf && (
                    <button
                      type="button"
                      onClick={() => {
                        const existing = summaries[a.id];
                        if (existing) {
                          setShowSummary((p) => ({ ...p, [a.id]: !(p[a.id] ?? true) }));
                        } else {
                          void summarizePdf(a);
                        }
                      }}
                      disabled={summarizing[a.id]}
                      className="rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                      title={summaries[a.id] ? "Toggle AI summary" : "Summarize with AI"}
                    >
                      {summarizing[a.id]
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Sparkles className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  {previewable && !img && (
                    <button
                      type="button"
                      onClick={() => setExpanded((p) => ({ ...p, [a.id]: !isOpen }))}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      title={isOpen ? "Hide preview" : "Show preview"}
                    >
                      {isOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      download={a.name}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      title="Open / download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {url && (img || pdf) && (
                    <button
                      type="button"
                      onClick={() => openMediaLightbox({ src: url, name: a.name, kind: pdf ? "pdf" : "image" })}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      title="View full screen"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(a)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {pdf && summaries[a.id] && (showSummary[a.id] ?? true) && (
                  <div className="border-t border-border/50 bg-primary/5 px-3 py-2.5">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                      <Sparkles className="h-3 w-3" /> AI Summary
                      <button
                        type="button"
                        onClick={() => {
                          const s = summaries[a.id]!;
                          const md = [
                            `## AI summary — ${a.name}`,
                            "",
                            s.summary || "",
                            s.keyPoints?.length ? "\n**Key points**\n" + s.keyPoints.map(k => `- ${k}`).join("\n") : "",
                          ].filter(Boolean).join("\n").trim();
                          window.dispatchEvent(new CustomEvent("careflow:insert-into-note", { detail: { markdown: md, at: "cursor" } }));
                          toast.success("Inserted summary into note");
                        }}
                        className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        title="Insert full summary at cursor"
                      >
                        <FilePlus2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const s = summaries[a.id]!;
                          if (!s.keyPoints?.length) {
                            toast.error("No key points to insert");
                            return;
                          }
                          const md = [
                            `**Key points — ${a.name}**`,
                            "",
                            s.keyPoints.map(k => `- ${k}`).join("\n"),
                          ].join("\n").trim();
                          window.dispatchEvent(new CustomEvent("careflow:insert-into-note", { detail: { markdown: md, at: "cursor" } }));
                          toast.success("Inserted key points into note");
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        title="Insert only key points at cursor"
                      >
                        <ListChecks className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void summarizePdf(a)}
                        disabled={summarizing[a.id]}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
                        title="Regenerate"
                      >
                        {summarizing[a.id]
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <RefreshCw className="h-3 w-3" />}
                      </button>
                    </div>
                    {summaries[a.id]!.summary && (
                      <div className={cn(
                        "prose prose-sm max-w-none text-[12.5px] leading-relaxed text-foreground/90 dark:prose-invert",
                        "prose-headings:font-display prose-headings:font-semibold prose-headings:text-foreground prose-headings:my-1.5",
                        "prose-h2:text-[13px] prose-h3:text-[12.5px]",
                        "prose-p:my-1 prose-strong:text-foreground",
                        "prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
                        "prose-code:rounded prose-code:bg-muted/60 prose-code:px-1 prose-code:py-px prose-code:text-[0.9em]",
                      )}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaries[a.id]!.summary}</ReactMarkdown>
                      </div>
                    )}
                    {summaries[a.id]!.keyPoints?.length > 0 && (
                      <ul className="mt-2 ml-4 list-disc space-y-0.5 text-[11.5px] text-foreground/80">
                        {summaries[a.id]!.keyPoints.map((k, i) => (
                          <li key={i}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{ p: ({ children }) => <span>{children}</span> }}
                            >{k}</ReactMarkdown>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {url && isOpen && pdf && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setFitPage(p => ({ ...p, [a.id]: !p[a.id] }))}
                      className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm backdrop-blur hover:bg-background"
                      title={fitPage[a.id] ? "Compact view" : "Fit to page"}
                    >
                      {fitPage[a.id] ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                      {fitPage[a.id] ? "Compact" : "Fit to page"}
                    </button>
                    <iframe
                      src={url}
                      title={a.name}
                      loading="lazy"
                      className={cn(
                        "block w-full border-0 bg-black/80",
                        fitPage[a.id] ? "h-[85vh]" : "h-[420px]",
                      )}
                    />
                  </div>
                )}
                {url && isOpen && video && (
                  <video src={url} controls className="block max-h-[420px] w-full bg-black" />
                )}
                {url && isOpen && audio && (
                  <audio src={url} controls className="block w-full px-3 pb-3" />
                )}
                {url && isOpen && isPlainText(a) && (
                  <iframe
                    src={url}
                    title={a.name}
                    loading="lazy"
                    className="block h-72 w-full border-0 bg-background"
                  />
                )}
                {url && img && (
                  <a href={url} target="_blank" rel="noreferrer" className="block">
                    <img src={url} alt={a.name} className="block max-h-[420px] w-full object-contain bg-muted/40" loading="lazy" />
                  </a>
                )}
                {!url && previewable && (
                  <div className="flex items-center justify-center px-3 py-6 text-[11px] text-muted-foreground">
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading preview…
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {items.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/50 bg-card/30 px-3 py-2 text-[11px] text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          No attachments yet.
        </div>
      )}
    </div>
  );
}