import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

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
  const trimmed = useMemo(() => {
    if (!body) return "";
    // Drop fenced code blocks and images for a calmer preview surface.
    let t = body
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/!\[[^\]]*]\([^)]+\)/g, "");
    if (t.length > maxChars) t = t.slice(0, maxChars).trimEnd() + "…";
    return t;
  }, [body, maxChars]);

  if (!trimmed) {
    return <span className={cn("italic text-muted-foreground/70", className)}>Empty note</span>;
  }

  return (
    <div className={cn(
      "note-md-preview prose prose-sm max-w-none text-muted-foreground",
      "prose-p:my-0.5 prose-headings:my-0.5 prose-headings:font-display prose-headings:text-foreground/90",
      "prose-strong:text-foreground prose-li:my-0 prose-ul:my-0.5 prose-ol:my-0.5",
      "prose-code:rounded prose-code:bg-muted/60 prose-code:px-1 prose-code:py-px prose-code:text-[0.85em]",
      "prose-blockquote:my-0.5 prose-blockquote:border-l-2 prose-blockquote:pl-2 prose-blockquote:text-muted-foreground/80",
      "dark:prose-invert",
      className,
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Neutralise interactive children — these previews live inside <button> cards.
          a: ({ children }) => <span className="text-primary/90 underline-offset-2">{children}</span>,
          input: () => null,
          button: ({ children }) => <span>{children}</span>,
          // Wiki/backlink markers may pass through; render as plain text spans.
          h1: ({ children }) => <p className="font-display text-[13px] font-semibold text-foreground/90">{children}</p>,
          h2: ({ children }) => <p className="font-display text-[13px] font-semibold text-foreground/90">{children}</p>,
          h3: ({ children }) => <p className="font-display text-[12.5px] font-semibold text-foreground/90">{children}</p>,
        }}
      >
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}