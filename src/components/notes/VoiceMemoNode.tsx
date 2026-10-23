/** `voiceMemo` — a recorded audio memo stored privately; persisted as `<div data-voice-memo>` HTML. */
import { useEffect, useState } from "react";
import { Node as TiptapNode } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Loader2, Mic, RotateCw, Type } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const fmtDur = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function VoiceMemoView({ node, editor, getPos }: NodeViewProps) {
  const path: string = node.attrs.path;
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setFailed(false);
    supabase.storage.from("note-audio").createSignedUrl(path, 3600).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) setFailed(true); else setUrl(data.signedUrl);
    });
    const t = window.setTimeout(() => setNonce(n => n + 1), 55 * 60 * 1000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [path, nonce]);

  const transcribe = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-voice-memo", { body: { path } });
      if (error) {
        let msg = error.message;
        try { const j = await (error as any).context?.json?.(); if (j?.message) msg = j.message; } catch { /* noop */ }
        toast.error(msg || "Couldn't transcribe this memo");
        return;
      }
      const text = String(data?.text ?? "").trim();
      if (!text) { toast.message("No speech was found in this memo"); return; }
      const pos = typeof getPos === "function" ? getPos() : undefined;
      if (typeof pos !== "number" || editor.state.doc.nodeAt(pos)?.attrs.path !== path) return;
      editor.commands.insertContentAt(pos + node.nodeSize, { type: "paragraph", content: [{ type: "text", text }] });
    } finally { setBusy(false); }
  };

  return (
    <NodeViewWrapper data-voice-memo-view contentEditable={false} className="not-prose my-3 rounded-xl border border-border/60 bg-card/75 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Mic className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span className="font-semibold text-foreground">Voice memo</span>
        {node.attrs.duration ? <span>· {fmtDur(Number(node.attrs.duration))}</span> : null}
        <button type="button" onClick={() => void transcribe()} disabled={busy || !path}
          className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-full border border-border/60 px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Type className="h-3.5 w-3.5" />} {busy ? "Transcribing…" : "Transcribe"}
        </button>
      </div>
      {failed ? (
        <button type="button" onClick={() => setNonce(n => n + 1)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RotateCw className="h-3.5 w-3.5" /> Couldn't load audio — retry
        </button>
      ) : url ? (
        <audio controls preload="metadata" src={url} className="w-full" onError={() => setFailed(true)} />
      ) : (
        <p className="text-xs text-muted-foreground">Loading…</p>
      )}
    </NodeViewWrapper>
  );
}

export const VoiceMemo = TiptapNode.create({
  name: "voiceMemo",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      path: { default: "", parseHTML: el => el.getAttribute("data-voice-memo") ?? "", renderHTML: () => ({}) },
      duration: { default: 0, parseHTML: el => Number(el.getAttribute("data-duration")) || 0, renderHTML: () => ({}) },
    };
  },
  parseHTML() { return [{ tag: "div[data-voice-memo]" }]; },
  renderHTML({ node }) {
    return ["div", { "data-voice-memo": node.attrs.path, "data-duration": String(node.attrs.duration) }];
  },
  addNodeView() { return ReactNodeViewRenderer(VoiceMemoView); },
});
