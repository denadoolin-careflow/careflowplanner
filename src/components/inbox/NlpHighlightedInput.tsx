import { forwardRef, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Single-line input with a styled mirror layer that highlights Todoist-style
 * tokens (#tag, @area, +project, p1, dates, times, durations) inline as the
 * user types. The real <input> sits transparent on top so the native keyboard
 * and IME behavior stays intact.
 */

type TokenKind =
  | "tag" | "area" | "project" | "priority"
  | "date" | "time" | "duration" | "recur" | "someday" | "energy";

const TOKEN_PATTERNS: { kind: TokenKind; re: RegExp }[] = [
  { kind: "tag",      re: /#[a-z0-9_-]+/gi },
  { kind: "energy",   re: /@(?:low|med|medium|high)\b/gi },
  { kind: "project",  re: /\+(?:"[^"]+"|[\w-]+(?:\s[\w-]+)?)/g },
  { kind: "someday",  re: /~someday\b/gi },
  { kind: "area",     re: /@(?:home|family|kids|care|caregiving|meals|food|appt|appointments|personal|creative|money|finance|bday|holiday)\b/gi },
  { kind: "priority", re: /\bp[1-4]\b/gi },
  { kind: "duration", re: /\bfor\s+(?:\d+\s*h)?\s*(?:\d+\s*m)?\b/gi },
  { kind: "recur",    re: /\bevery\s+(?:day|weekday|weekend|week|month|year|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|\d+\s+(?:day|week|month)s?)\b/gi },
  { kind: "date",     re: /\b(?:today|tonight|tomorrow|tmrw|next\s+(?:week|month|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)|this\s+(?:week|month)|in\s+\d+\s+(?:day|week|month)s?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/gi },
  { kind: "time",     re: /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi },
];

const TOKEN_CLASS: Record<TokenKind, string> = {
  tag:      "bg-sky-100/80 text-sky-700 ring-sky-200/60",
  area:     "bg-emerald-100/80 text-emerald-700 ring-emerald-200/60",
  project:  "bg-violet-100/80 text-violet-700 ring-violet-200/60",
  priority: "bg-rose-100/80 text-rose-700 ring-rose-200/60",
  date:     "bg-amber-100/80 text-amber-800 ring-amber-200/60",
  time:     "bg-amber-100/80 text-amber-800 ring-amber-200/60",
  duration: "bg-stone-100/90 text-stone-700 ring-stone-200/60",
  recur:    "bg-indigo-100/80 text-indigo-700 ring-indigo-200/60",
  someday:  "bg-stone-100/90 text-stone-700 ring-stone-200/60",
  energy:   "bg-fuchsia-100/80 text-fuchsia-700 ring-fuchsia-200/60",
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function highlightTokens(text: string): string {
  if (!text) return "";
  type Span = { start: number; end: number; kind: TokenKind };
  const spans: Span[] = [];
  for (const { kind, re } of TOKEN_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length, kind });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  // De-overlap: keep earliest, longest wins on ties.
  spans.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const kept: Span[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start < cursor) continue;
    kept.push(s);
    cursor = s.end;
  }
  let out = "";
  let i = 0;
  for (const s of kept) {
    out += escapeHtml(text.slice(i, s.start));
    out += `<span class="rounded-md px-1 py-px ring-1 ${TOKEN_CLASS[s.kind]}">${escapeHtml(text.slice(s.start, s.end))}</span>`;
    i = s.end;
  }
  out += escapeHtml(text.slice(i));
  return out;
}

export interface NlpHighlightedInputProps {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Extra padding for left and right gutters (must match input padding). */
  leftPad?: string;
  rightPad?: string;
}

export const NlpHighlightedInput = forwardRef<HTMLInputElement, NlpHighlightedInputProps>(
  function NlpHighlightedInput(
    { value, onChange, onKeyDown, placeholder, disabled, className, leftPad = "pl-14", rightPad = "pr-28" },
    ref,
  ) {
    const mirrorRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Forward ref
    useLayoutEffect(() => {
      if (!ref) return;
      if (typeof ref === "function") ref(inputRef.current);
      else (ref as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current;
    }, [ref]);

    // Sync horizontal scroll between input and mirror
    const handleScroll = () => {
      const el = inputRef.current; const m = mirrorRef.current;
      if (el && m) m.scrollLeft = el.scrollLeft;
    };

    return (
      <div className="relative">
        {/* Mirror: shows the highlighted text behind the transparent input */}
        <div
          ref={mirrorRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre text-[15px] font-medium leading-[1.4]",
            leftPad, rightPad,
            "flex items-center",
          )}
        >
          <div
            className="min-w-0 truncate text-slate-900 dark:text-slate-50"
            dangerouslySetInnerHTML={{ __html: highlightTokens(value) }}
          />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={handleScroll}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck
          autoComplete="off"
          className={cn(
            "relative h-14 w-full rounded-2xl border border-primary/30 bg-background/80 text-[15px] font-medium leading-[1.4] outline-none transition placeholder:text-muted-foreground/80",
            "shadow-[0_0_0_4px_hsl(var(--primary)/0.08),0_8px_30px_-12px_hsl(var(--primary)/0.45)]",
            "hover:shadow-[0_0_0_5px_hsl(var(--primary)/0.12),0_10px_36px_-12px_hsl(var(--primary)/0.55)]",
            "focus-visible:border-primary/60 focus-visible:shadow-[0_0_0_6px_hsl(var(--primary)/0.18),0_14px_44px_-12px_hsl(var(--primary)/0.6)]",
            // Make the input's own text transparent so only the mirror shows colors,
            // but keep the caret visible.
            value ? "text-transparent caret-foreground selection:bg-primary/25 selection:text-foreground" : "text-slate-900 dark:text-slate-50",
            leftPad, rightPad,
            className,
          )}
        />
      </div>
    );
  },
);