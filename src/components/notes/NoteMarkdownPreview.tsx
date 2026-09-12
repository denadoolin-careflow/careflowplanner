import { useMemo } from "react";
import { marked } from "marked";
import { cn } from "@/lib/utils";

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

/** Turn live editor-only embeds into useful, non-interactive preview cards. */
function expandEmbeds(source: string): string {
  return source
    .replace(/<div\s+([^>]*data-query-block[^>]*)><\/div>/gi, (_match, attrs: string) => {
      const read = (name: string) => attrs.match(new RegExp(`data-${name}=["']([^"']*)["']`, "i"))?.[1];
      const label = read("label") || "Saved query";
      const layout = read("layout") || "list";
      const sourceName = read("source") || "tasks";
      return `<div class="note-preview-embed"><strong>Query · ${escapeHtml(label)}</strong><span>${escapeHtml(sourceName)} · ${escapeHtml(layout)} view</span></div>`;
    })
    .replace(/<div\s+([^>]*data-grocery-block[^>]*)><\/div>/gi, (_match, attrs: string) => {
      const label = attrs.match(/data-label=["']([^"']*)["']/i)?.[1] || "Grocery list";
      return `<div class="note-preview-embed"><strong>${escapeHtml(label)}</strong><span>Live grocery list</span></div>`;
    });
}

/** Keep note HTML rich while removing scripts, event handlers and navigation. */
function safePreviewHtml(source: string): string {
  const raw = marked.parse(expandEmbeds(source), { async: false }) as string;
  if (typeof document === "undefined") return raw;
  const doc = new DOMParser().parseFromString(raw, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,form,button,input,textarea,select").forEach(el => el.remove());
  doc.querySelectorAll("*").forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "style" || name === "srcdoc") el.removeAttribute(attr.name);
      if ((name === "src" || name === "href") && !/^(https?:|mailto:|tel:|\/|#)/i.test(attr.value)) el.removeAttribute(attr.name);
    }
  });
  doc.querySelectorAll("a").forEach(link => {
    const span = doc.createElement("span");
    span.className = "note-preview-link";
    span.innerHTML = link.innerHTML;
    link.replaceWith(span);
  });
  return doc.body.innerHTML;
}

/**
 * Compact markdown renderer safe to nest inside <button> cards.
 * Strips/neutralises interactive elements (a, input, button) to spans
 * so list, grid, board, timeline and hover previews can render formatted
 * markdown without breaking nested-interactive-element rules.
 */
export function NoteMarkdownPreview({
  body,
  className,
  maxChars = 360,
}: {
  body: string;
  className?: string;
  maxChars?: number;
}) {
  const html = useMemo(() => {
    if (!body) return "";
    // Avoid cutting through HTML/table markup. Plain markdown can be safely shortened.
    const hasRichHtml = /<(table|details|div\s+[^>]*data-)/i.test(body);
    const source = !hasRichHtml && body.length > maxChars
      ? `${body.slice(0, maxChars).trimEnd()}…`
      : body;
    return safePreviewHtml(source.replace(/!\[[^\]]*]\([^)]+\)/g, ""));
  }, [body, maxChars]);

  if (!html) {
    return <span className={cn("italic text-muted-foreground/70", className)}>Empty note</span>;
  }

  return (
    <div className={cn(
      "note-md-preview prose prose-sm max-w-none overflow-x-auto text-muted-foreground",
      "prose-p:my-0.5 prose-headings:my-0.5 prose-headings:font-display prose-headings:text-foreground/90",
      "prose-strong:text-foreground prose-li:my-0 prose-ul:my-0.5 prose-ol:my-0.5",
      "prose-code:rounded prose-code:bg-muted/60 prose-code:px-1 prose-code:py-px prose-code:text-[0.85em]",
      "prose-blockquote:my-0.5 prose-blockquote:border-l-2 prose-blockquote:pl-2 prose-blockquote:text-muted-foreground/80",
      "dark:prose-invert",
      className,
    )}
      dangerouslySetInnerHTML={{ __html: html }}
    >
    </div>
  );
}