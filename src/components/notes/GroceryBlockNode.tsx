/**
 * `groceryBlock` — a live grocery list embedded in a note.
 *
 * Reads the current grocery items from the store (never a snapshot), lets you
 * check items off in place, add new ones, pull in low-stock pantry items, and
 * open the whole list at your preferred store.
 */
import { useMemo, useState } from "react";
import { Node as TiptapNode } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Check, Plus, ShoppingCart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { ShopMenu } from "@/components/meals/ShopMenu";
import { cn } from "@/lib/utils";

function GroceryView({ node, updateAttributes, selected }: NodeViewProps) {
  const { state, addGrocery, toggleGrocery } = useStore() as any;
  const hideBought: boolean = node.attrs.hideBought !== false;
  const title: string = node.attrs.label ?? "Grocery list";
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => {
    const all = (state.grocery ?? []) as any[];
    return hideBought ? all.filter(i => !i.bought) : all;
  }, [state.grocery, hideBought]);

  const names = items.filter(i => !i.bought).map(i => i.name);

  const add = async () => {
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    await addGrocery(name);
  };

  const pullLowStock = async () => {
    setBusy(true);
    try {
      const pantry = (state.grocery ?? []) as any[];
      const low = pantry.filter(i => (i.stockStatus === "low" || i.stockStatus === "out") && i.bought);
      if (!low.length) { toast.info("Nothing low in the pantry right now."); return; }
      for (const i of low) await toggleGrocery(i.id);
      toast.success(`Added ${low.length} low-stock item${low.length === 1 ? "" : "s"} back to the list.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <NodeViewWrapper
      className={cn(
        "not-prose my-3 overflow-hidden rounded-2xl border border-border/60 bg-card/50",
        selected && "ring-2 ring-primary/40",
      )}
      data-grocery-block
    >
      <div contentEditable={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-1.5">
          <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <input
            aria-label="List title"
            value={title}
            onChange={e => updateAttributes({ label: e.target.value })}
            className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold outline-none"
          />
          <span className="text-[11px] text-muted-foreground">{names.length} to buy</span>
          <button
            type="button"
            onClick={() => updateAttributes({ hideBought: !hideBought })}
            className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
          >
            {hideBought ? "Show bought" : "Hide bought"}
          </button>
          {names.length > 0 && <ShopMenu items={names} size="xs" />}
        </div>

        {items.length === 0 ? (
          <p className="px-3 py-4 text-[12px] text-muted-foreground">Nothing on the list yet.</p>
        ) : (
          <ul className="max-h-72 divide-y divide-border/30 overflow-auto">
            {items.map((i: any) => (
              <li key={i.id} className={cn("flex items-center gap-2 px-3 py-1.5 text-[13px]", i.bought && "opacity-55")}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={!!i.bought}
                  aria-label={i.bought ? `Mark ${i.name} not bought` : `Mark ${i.name} bought`}
                  onClick={() => void toggleGrocery(i.id)}
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
                    i.bought ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-muted-foreground/70",
                  )}
                >
                  {i.bought && <Check className="h-3 w-3" />}
                </button>
                <span className={cn("min-w-0 flex-1 truncate", i.bought && "line-through")}>
                  {i.name}{i.qty ? <span className="text-muted-foreground"> · {i.qty}</span> : null}
                </span>
                <ShopMenu items={i.name} size="xs" variant="ghost" compact className="h-6 px-1.5" />
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-3 py-1.5">
          <input
            aria-label="Add grocery item"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void add(); } }}
            placeholder="Add an item…"
            className="min-w-0 flex-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[12px]"
          />
          <button
            type="button"
            onClick={() => void add()}
            aria-label="Add item"
            className="rounded-md border border-border/60 p-1 text-muted-foreground hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void pullLowStock()}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" /> Add missing
          </button>
          <Link to="/home/groceries" className="ml-auto text-[11px] text-primary hover:underline">
            Open list →
          </Link>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const GroceryBlock = TiptapNode.create({
  name: "groceryBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      label: {
        default: "Grocery list",
        parseHTML: el => (el as HTMLElement).getAttribute("data-label") || "Grocery list",
        renderHTML: attrs => ({ "data-label": attrs.label ?? "Grocery list" }),
      },
      hideBought: {
        default: true,
        parseHTML: el => (el as HTMLElement).getAttribute("data-hide-bought") !== "false",
        renderHTML: attrs => ({ "data-hide-bought": attrs.hideBought === false ? "false" : "true" }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-grocery-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-grocery-block": "", ...HTMLAttributes }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(GroceryView);
  },
});
