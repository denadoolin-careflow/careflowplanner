import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useMemo } from "react";

/**
 * Pre-process markdown body so that [[Backlinks]] and @mentions become
 * real markdown links that ReactMarkdown then renders.
 */
function preprocess(body: string, projects: { id: string; name: string }[]): string {
  let t = body;
  // [[Title]] → wiki link
  t = t.replace(/\[\[([^\]]+)\]\]/g, (_, title: string) => {
    const slug = encodeURIComponent(title.trim());
    return `[${title.trim()}](/notes?q=${slug})`;
  });
  // @ProjectName → project link (greedy: longest project names first)
  const sorted = [...projects].sort((a, b) => b.name.length - a.name.length);
  for (const p of sorted) {
    if (!p.name) continue;
    const safe = p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[\\s])@${safe}(?=$|[\\s.,;:!?])`, "g");
    t = t.replace(re, `$1[@${p.name}](/projects/${p.id})`);
  }
  return t;
}

export function NoteMarkdown({ body }: { body: string }) {
  const { state } = useStore();
  const processed = useMemo(
    () => preprocess(body || "", state.projects ?? []),
    [body, state.projects],
  );
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:font-semibold prose-a:text-primary prose-a:no-underline hover:prose-a:underline dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...rest }) => {
            if (href?.startsWith("/")) {
              return <Link to={href} className="rounded bg-primary/10 px-1 text-primary hover:bg-primary/20">{children}</Link>;
            }
            return <a href={href} target="_blank" rel="noreferrer" {...rest}>{children}</a>;
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}