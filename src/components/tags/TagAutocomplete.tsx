import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Hash, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTags } from "@/hooks/use-tags";

/**
 * Floating tag suggestion popover anchored to a text input.
 * Detects a `#token` (or `@tag-name`) immediately before the caret in the
 * input value and surfaces matching tags from the user's library.
 *
 *  - ↑/↓ to navigate
 *  - Enter / Tab to insert (replaces the active token with `#name `)
 *  - Esc to dismiss
 *  - "Create #foo" if no exact match
 *
 * Designed for single-line <input> usage in InlineTaskComposer.
 */
export function TagAutocomplete({
  inputRef,
  value,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  onChange: (next: string) => void;
}) {
  const { tags, ensure } = useTags();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const dismissedForToken = useRef<string | null>(null);

  // Detect "#word" right before the caret.
  const token = useMemo(() => {
    const el = inputRef.current;
    if (!el) return null;
    const pos = el.selectionStart ?? value.length;
    const left = value.slice(0, pos);
    const m = left.match(/(?:^|\s)#([\p{L}\p{N}_-]*)$/u);
    if (!m) return null;
    return { query: m[1], start: pos - m[1].length - 1, end: pos };
  }, [value, inputRef]);

  // Show/hide based on token presence; reposition anchor under the caret.
  useEffect(() => {
    if (!token) {
      setOpen(false);
      dismissedForToken.current = null;
      return;
    }
    if (dismissedForToken.current === `${token.start}:${token.query}`) return;
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Approximate caret X with input padding; close enough for a pill-style hint.
    setAnchor({ x: rect.left + 8, y: rect.bottom + 6 });
    setOpen(true);
    setActive(0);
  }, [token, inputRef]);

  const matches = useMemo(() => {
    if (!token) return [];
    const q = token.query.toLowerCase();
    return tags
      .filter(t => !q || t.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [tags, token]);

  const exact = !!token && tags.some(t => t.name.toLowerCase() === token.query.toLowerCase());

  const insert = async (name: string, opts?: { create?: boolean }) => {
    if (!token) return;
    if (opts?.create) {
      try { await ensure(name); } catch { /* swallow — tag still gets typed */ }
    }
    const next = value.slice(0, token.start) + `#${name} ` + value.slice(token.end);
    onChange(next);
    setOpen(false);
    // Restore caret to end of inserted token
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      const pos = token.start + name.length + 2;
      try { el.setSelectionRange(pos, pos); } catch { /* noop */ }
      el.focus();
    });
  };

  // Keyboard handling — attach to the input so Enter doesn't submit when popup is open.
  useEffect(() => {
    const el = inputRef.current;
    if (!el || !open) return;
    const total = matches.length + (token && token.query && !exact ? 1 : 0);
    const onKey = (e: KeyboardEvent) => {
      if (!open || total === 0) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => (i + 1) % total); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => (i - 1 + total) % total); }
      else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (active < matches.length) {
          void insert(matches[active].name);
        } else if (token && token.query) {
          void insert(token.query, { create: true });
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        if (token) dismissedForToken.current = `${token.start}:${token.query}`;
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [open, matches, active, token, exact, inputRef]);

  if (!open || !anchor || (matches.length === 0 && !(token && token.query))) return null;

  return createPortal(
    <div
      role="listbox"
      className="fixed z-[200] w-64 rounded-xl border border-border/60 bg-popover p-1.5 shadow-xl"
      style={{ left: anchor.x, top: anchor.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="mb-1 px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Tags
      </div>
      {matches.map((t, i) => (
        <button
          key={t.id}
          type="button"
          onMouseEnter={() => setActive(i)}
          onClick={() => void insert(t.name)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition",
            i === active ? "bg-muted" : "hover:bg-muted/50",
          )}
        >
          <span
            className="grid h-5 w-5 place-items-center rounded-md text-[10px] font-semibold"
            style={{ background: `${t.color}33`, color: t.color }}
          >
            <Hash className="h-3 w-3" />
          </span>
          <span className="truncate">{t.name}</span>
        </button>
      ))}
      {token && token.query && !exact && (
        <button
          type="button"
          onMouseEnter={() => setActive(matches.length)}
          onClick={() => void insert(token.query, { create: true })}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition",
            active === matches.length ? "bg-muted" : "hover:bg-muted/50",
          )}
        >
          <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/15 text-primary">
            <Plus className="h-3 w-3" />
          </span>
          <span className="truncate">
            Create <span className="font-medium">#{token.query}</span>
          </span>
        </button>
      )}
    </div>,
    document.body,
  );
}