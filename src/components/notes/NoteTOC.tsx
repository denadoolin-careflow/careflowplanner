import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { List } from "lucide-react";

interface Heading {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

function slugify(text: string, used: Set<string>): string {
  const base = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "section";
  let candidate = base;
  let i = 1;
  while (used.has(candidate)) candidate = `${base}-${++i}`;
  used.add(candidate);
  return candidate;
}

/**
 * Scans the given container for h1/h2/h3 headings, assigns ids,
 * tracks active section on scroll, and renders a sidebar TOC.
 */
export function NoteTOC({
  containerSelector = ".block-editor",
  body,
  className,
  title = "On this page",
}: {
  containerSelector?: string;
  /** Pass the editor body so the TOC re-syncs when content changes */
  body?: string;
  className?: string;
  title?: string;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string | null>(null);

  // Re-scan on body change (debounced via rAF)
  useEffect(() => {
    let raf = 0;
    const scan = () => {
      const root = document.querySelector(containerSelector);
      if (!root) { setHeadings([]); return; }
      const nodes = Array.from(root.querySelectorAll<HTMLElement>("h1, h2, h3"));
      const used = new Set<string>();
      const next: Heading[] = nodes.map((el) => {
        const text = (el.textContent || "").trim();
        if (!el.id) el.id = slugify(text || "section", used);
        else used.add(el.id);
        const level = (Number(el.tagName.slice(1)) as 1 | 2 | 3) ?? 2;
        return { id: el.id, text, level };
      }).filter(h => h.text.length > 0);
      setHeadings(next);
    };
    raf = requestAnimationFrame(() => requestAnimationFrame(scan));
    return () => cancelAnimationFrame(raf);
  }, [body, containerSelector]);

  // Scroll-spy
  useEffect(() => {
    if (!headings.length) return;
    const els = headings
      .map(h => document.getElementById(h.id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 1] },
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [headings]);

  const handleJump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  if (!headings.length) {
    return (
      <aside className={cn("text-xs text-muted-foreground", className)}>
        <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
          <List className="h-3 w-3" /> {title}
        </div>
        <p className="italic">Add a heading to start the outline.</p>
      </aside>
    );
  }

  return (
    <aside className={cn("text-xs", className)}>
      <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <List className="h-3 w-3" /> {title}
      </div>
      <ul className="space-y-0.5 border-l border-border/50">
        {headings.map(h => (
          <li key={h.id}>
            <button
              onClick={() => handleJump(h.id)}
              className={cn(
                "block w-full truncate border-l-2 py-0.5 pl-2 pr-1 text-left leading-snug transition-colors",
                h.level === 1 && "pl-2 font-medium",
                h.level === 2 && "pl-4",
                h.level === 3 && "pl-6 text-muted-foreground",
                active === h.id
                  ? "-ml-px border-l-primary text-primary"
                  : "-ml-px border-l-transparent hover:text-foreground",
              )}
              title={h.text}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
