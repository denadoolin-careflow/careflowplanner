import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Pencil, ArrowUpRight, Unlink } from "lucide-react";
import { TagPreviewContent } from "./TagPreview";

/**
 * Global delegated hover/tap preview for inline `a.tag-chip` anchors
 * (rendered by the ProseMirror block editor). Mounted once near the app root.
 */
export function InlineTagPreviewLayer() {
  const [state, setState] = useState<{ name: string; rect: DOMRect; el: HTMLElement } | null>(null);
  const closeTimer = useRef<number | null>(null);
  const navigate = useNavigate();

  const isTouch = useRef<boolean>(false);
  useEffect(() => {
    isTouch.current = window.matchMedia?.("(hover: none)").matches ?? false;
  }, []);

  const clearClose = () => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const scheduleClose = () => {
    clearClose();
    closeTimer.current = window.setTimeout(() => setState(null), 140);
  };

  useEffect(() => {
    const nameFromAnchor = (a: HTMLAnchorElement): string | null => {
      const href = a.getAttribute("href") || "";
      const m = href.match(/^\/tags\/(.+)$/);
      if (m) { try { return decodeURIComponent(m[1]); } catch { return m[1]; } }
      const txt = (a.textContent || "").trim().replace(/^#+/, "");
      return txt || null;
    };

    const onOver = (e: MouseEvent) => {
      if (isTouch.current) return;
      const target = (e.target as HTMLElement | null)?.closest?.("a.tag-chip") as HTMLAnchorElement | null;
      if (!target) return;
      const name = nameFromAnchor(target);
      if (!name) return;
      clearClose();
      setState({ name, rect: target.getBoundingClientRect(), el: target });
    };
    const onOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.("a.tag-chip");
      if (!target) return;
      scheduleClose();
    };
    const onClick = (e: MouseEvent) => {
      if (!isTouch.current) return;
      const target = (e.target as HTMLElement | null)?.closest?.("a.tag-chip") as HTMLAnchorElement | null;
      if (!target) return;
      const name = nameFromAnchor(target);
      if (!name) return;
      // First tap: preview. Re-tap on same chip while open: navigate.
      if (state && state.name === name) return; // let default navigation happen
      e.preventDefault();
      e.stopPropagation();
      setState({ name, rect: target.getBoundingClientRect(), el: target });
    };
    const onScroll = () => setState(null);
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      clearClose();
    };
  }, [state]);

  if (!state) return null;

  const width = 288;
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const preferAbove = state.rect.top > 240;
  const top = preferAbove
    ? Math.max(margin, state.rect.top - margin - 240)
    : Math.min(vh - margin - 240, state.rect.bottom + margin);
  let left = state.rect.left + state.rect.width / 2 - width / 2;
  left = Math.max(margin, Math.min(vw - margin - width, left));

  return createPortal(
    <div
      role="tooltip"
      onMouseEnter={clearClose}
      onMouseLeave={scheduleClose}
      style={{ position: "fixed", top, left, width, zIndex: 80 }}
      className="rounded-2xl border border-border/70 bg-popover/95 p-3 text-popover-foreground shadow-xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
    >
      <TagPreviewContent name={state.name} onNavigate={() => setState(null)} />
      <div className="mt-2 flex items-center gap-1 border-t border-border/60 pt-2">
        <button
          type="button"
          onClick={() => {
            const name = state.name;
            setState(null);
            navigate(`/tags/${encodeURIComponent(name)}?edit=1`);
          }}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3 w-3" aria-hidden /> Edit settings
        </button>
        <button
          type="button"
          onClick={() => {
            const name = state.name;
            setState(null);
            navigate(`/tags/${encodeURIComponent(name)}`);
          }}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowUpRight className="h-3 w-3" aria-hidden /> Jump to tag
        </button>
        <button
          type="button"
          onClick={() => {
            const el = state.el;
            setState(null);
            document.dispatchEvent(new CustomEvent("careflow:unlink-chip", { detail: { el } }));
          }}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Unlink className="h-3 w-3" aria-hidden /> Remove link
        </button>
      </div>
    </div>,
    document.body,
  );
}