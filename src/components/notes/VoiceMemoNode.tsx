/** `voiceMemo` — a recorded audio memo stored privately; persisted as `<div data-voice-memo>` HTML. */
import { Node as TiptapNode } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { VoiceMemoCard } from "./VoiceMemoCard";

function VoiceMemoView({ node, editor, getPos }: NodeViewProps) {
  const path: string = node.attrs.path;
  const removeNode = () => {
    const pos = typeof getPos === "function" ? getPos() : undefined;
    if (typeof pos !== "number" || editor.state.doc.nodeAt(pos)?.attrs.path !== path) return;
    editor.chain().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
  };
  return (
    <NodeViewWrapper data-voice-memo-view contentEditable={false} className="not-prose my-3">
      <VoiceMemoCard path={path} durationMs={Number(node.attrs.duration) || 0} onDeleted={removeNode} />
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
