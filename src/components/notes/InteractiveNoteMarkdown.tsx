import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { QuickPeek, inferPeek } from "@/components/notes/QuickPeek";

/**
 * Interactive markdown renderer for modals/popovers.
 * - Internal links (starting with `/`) render as react-router <Link> and
 *   call `onNavigate` so the host (e.g. a Dialog) can close itself.
 * - External links open in a new tab with rel="noopener noreferrer".
 * - Wiki [[Title]], @ProjectName and #tag tokens are converted to internal
 *   links so they participate in the same safe navigation flow.
 */
function preprocess(body: string, projects: { id: string; name: string }[]): string {
  let t = body;
  // [[Title]] → /notes?q=Title
  t = t.replace(/\[\[([^\]]+)\]\]/g, (_, title: string) => {
    const slug = encodeURIComponent(title.trim());
    return `[${title.trim()}](/notes?q=${slug})`;
  });
  // #tag → /tags/tag (skip if preceded by word char, e.g. inside hex colors or headings)
  t = t.replace(/(^|[\s(])#([a-zA-Z0-9_-]{2,40})\b/g, (_m, lead: string, name: string) => {
    return `${lead}[#${name}](/tags/${encodeURIComponent(name)})`;
  });
  // @ProjectName → /projects/:id (longest names first)
  const sorted = [...projects].sort((a, b) => b.name.length - a.name.length);
  for (const p of sorted) {
    if (!p.name) continue;
    const safe = p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[\\s])@${safe}(?=$|[\\s.,;:!?])`, "g");
    t = t.replace(re, `$1[@${p.name}](/projects/${p.id})`);
  }
  return t;
}

export function InteractiveNoteMarkdown({
  body,
  className,
  onNavigate,
}: {
  body: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const { state } = useStore();
  const processed = useMemo(
    () => preprocess(body || "", state.projects ?? []),
    [body, state.projects],
  );

  if (!processed.trim()) {
    return <span className={cn("italic text-muted-foreground/70", className)}>Empty note</span>;
  }

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-muted-foreground",
        "prose-p:my-1 prose-headings:my-1 prose-headings:font-display prose-headings:text-foreground/90",
        "prose-strong:text-foreground prose-li:my-0 prose-ul:my-1 prose-ol:my-1",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-code:rounded prose-code:bg-muted/60 prose-code:px-1 prose-code:py-px prose-code:text-[0.85em]",
        "prose-blockquote:my-1 prose-blockquote:border-l-2 prose-blockquote:pl-2 prose-blockquote:text-muted-foreground/80",
        "dark:prose-invert",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...rest }) => {
            const h = href ?? "";
            if (h.startsWith("/") || h.startsWith("#")) {
              const peek = inferPeek(h);
              const link = (
                <Link
                  to={h}
                  onClick={() => onNavigate?.()}
                  className="inline-entity-card rounded bg-primary/10 px-1 text-primary transition-all hover:-translate-y-px hover:bg-primary/20 hover:shadow-sm"
                >
                  {children}
                </Link>
              );
              return peek ? (
                <QuickPeek type={peek.type} id={peek.id}>{link}</QuickPeek>
              ) : link;
            }
            // External — open safely
            return (
              <a
                href={h}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                {...rest}
              >
                {children}
              </a>
            );
          },
          input: (props) => {
            // Allow checkbox display from GFM task lists, but disabled.
            if ((props as any).type === "checkbox") {
              return <input {...(props as any)} disabled readOnly />;
            }
            return null;
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}