import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Upload, X, Image as ImageIcon, FileText, Download, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Attachment } from "@/lib/types";

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
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(a.path, 60 * 60);
        if (data?.signedUrl) next[a.id] = data.signedUrl;
      }));
      if (!cancel && Object.keys(next).length) setUrls((prev) => ({ ...prev, ...next }));
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((a) => a.id).join(",")]);

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
    try { await supabase.storage.from(BUCKET).remove([att.path]); } catch { /* best-effort */ }
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
              <li key={a.id} className="group relative rounded-xl border border-border/50 bg-card/60 overflow-hidden">
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
                  <button
                    type="button"
                    onClick={() => remove(a)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {url && isOpen && pdf && (
                  <iframe
                    src={url}
                    title={a.name}
                    loading="lazy"
                    className="block h-[420px] w-full border-0 bg-black/80"
                  />
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