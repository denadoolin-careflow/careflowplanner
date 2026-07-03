import { Node as TiptapNode, mergeAttributes, InputRule } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import {
  FileText, Folder, CheckCircle2, Users, CalendarDays,
  Utensils, Sparkles, Hash, Link2, ChevronRight,
} from "lucide-react";
import { QuickPeek, type PeekType } from "@/components/notes/QuickPeek";
import { cn } from "@/lib/utils";

/**
 * Inline atomic node rendered inside the TipTap editor for `[[Title]]`,
 * `@Project` and similar tokens. Behaves like a chip with:
 *   - QuickPeek on hover
 *   - `data-size` control (sm/md/lg)
 *   - expand/collapse to a longer preview inline
 *   - draggable via TipTap's own drag support
 *
 * Persistence: the node serializes to a `[[Label]]` markdown token via a
 * turndown rule registered in BlockEditor, so existing notes stay portable.
 */

const ICONS: Record<PeekType, React.ComponentType<{ className?: string }>> = {
  note: FileText, wiki: FileText, project: Folder, area: Folder,
  task: CheckCircle2, person: Users, event: CalendarDays,
  recipe: Utensils, goal: Sparkles, habit: Sparkles, tag: Hash,
};

function CardView({ node, updateAttributes, selected }: NodeViewProps) {
  const label: string = node.attrs.label || "Untitled";
  const type: PeekType = (node.attrs.entityType as PeekType) || "wiki";
  const size: "sm" | "md" | "lg" = (node.attrs.size as any) || "md";
  const Icon = ICONS[type] ?? Link2;
  const [expanded, setExpanded] = useState(false);

  const cycleSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const order: Array<"sm" | "md" | "lg"> = ["sm", "md", "lg"];
    const next = order[(order.indexOf(size) + 1) % order.length];
    updateAttributes({ size: next });
  };

  return (
    <NodeViewWrapper
      as="span"
      className="inline-entity-card-wrap"
      data-size={size}
      data-drag-handle
    >
      <QuickPeek type={type} id={label}>
        <span
          contentEditable={false}
          onClick={() => setExpanded(v => !v)}
          onDoubleClick={cycleSize}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-1.5 align-baseline text-primary transition-all",
            "hover:-translate-y-px hover:border-primary/40 hover:bg-primary/15 hover:shadow-sm",
            selected && "ring-2 ring-primary/40",
            size === "sm" && "text-[0.78em] py-0",
            size === "md" && "text-[0.9em] py-0.5",
            size === "lg" && "text-[1em] py-1 px-2",
            "cursor-pointer select-none",
          )}
          title="Click to expand · Double-click to resize · Hover to preview"
        >
          <Icon className={cn(size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3", "opacity-80")} />
          <span className="font-medium">{label}</span>
          {expanded && (
            <span className="ml-1 text-[0.85em] italic text-primary/70">· {type}</span>
          )}
          <ChevronRight
            className={cn(
              "h-3 w-3 opacity-40 transition-transform",
              expanded && "rotate-90",
            )}
          />
        </span>
      </QuickPeek>
    </NodeViewWrapper>
  );
}

export const InlineEntityCard = TiptapNode.create({
  name: "inlineEntityCard",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      label: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-label") ?? (el as HTMLElement).textContent ?? "",
        renderHTML: (attrs) => ({ "data-label": attrs.label ?? "" }),
      },
      entityType: {
        default: "wiki",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-entity-type") ?? "wiki",
        renderHTML: (attrs) => ({ "data-entity-type": attrs.entityType ?? "wiki" }),
      },
      size: {
        default: "md",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-size") ?? "md",
        renderHTML: (attrs) => ({ "data-size": attrs.size ?? "md" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-inline-entity]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-inline-entity": "",
        class: "inline-entity-card",
      }),
      `[[${node.attrs.label ?? ""}]]`,
    ];
  },

  addCommands() {
    return {
      insertInlineEntity:
        (attrs: { label: string; entityType?: string; size?: "sm" | "md" | "lg" }) =>
        ({ commands }: any) =>
          commands.insertContent({ type: this.name, attrs }),
    } as any;
  },

  addInputRules() {
    // `[[Title]] ` at the caret converts into an inline entity card.
    return [
      new InputRule({
        find: /\[\[([^\[\]\n]{1,80})\]\]$/,
        handler: ({ state, range, match }) => {
          const label = (match[1] ?? "").trim();
          if (!label) return null;
          const { tr } = state;
          tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ label, entityType: "wiki", size: "md" }),
          );
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardView);
  },
});

export default InlineEntityCard;