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
import { Check, Plus, ShoppingCart, Sparkles, Tag, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { ShopMenu } from "@/components/meals/ShopMenu";
import { cn } from "@/lib/utils";
import { ItemPrice } from "@/components/meals/ItemPrice";
import { useGroceryPrefs } from "@/lib/grocery-prefs";
import { basketTotal, formatMoney, useGroceryPrices } from "@/lib/grocery-prices";
import { RETAILER_LABEL } from "@/lib/retailer-links";

function GroceryView({ node, updateAttributes, selected }: NodeViewProps) {
  const { state, addGrocery, toggleGrocery, updateGroceryItem } = useStore() as any;
  const { prefs } = useGroceryPrefs();
  const { overrides, setPrice } = useGroceryPrices();
  const tags: string[] = Array.isArray(node.attrs.tags) ? node.attrs.tags : [];
  const [tagDraft, setTagDraft] = useState("");
  const hideBought: boolean = node.attrs.hideBought !== false;
  const title: string = node.attrs.label ?? "Grocery list";
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => {
    let all = (state.grocery ?? []) as any[];
    if (hideBought) all = all.filter(i => !i.bought);
    if (tags.length) {
      all = all.filter(i => {
        const t = ((i.tags ?? []) as string[]).map(x => x.toLowerCase());
        return tags.some(tag => t.includes(tag.toLowerCase()));
      });
    }
    return all;
  }, [state.grocery, hideBought, tags]);

  const unbought = items.filter(i => !i.bought);
  const names = unbought.map(i => i.name);
  const total = basketTotal(unbought, prefs.preferred_store, overrides);

  const addTag = () => {
    const t = tagDraft.trim().replace(/^#/, "");
    if (!t) return;
    if (!tags.some(x => x.toLowerCase() === t.toLowerCase())) updateAttributes({ tags: [...tags, t] });
    setTagDraft("");
  };
  const removeTag = (t: string) => updateAttributes({ tags: tags.filter(x => x !== t) });
  const tagItem = (item: any, t: string) => {
    const current: string[] = item.tags ?? [];
    if (current.some(x => x.toLowerCase() === t.toLowerCase())) return;
    void updateGroceryItem(item.id, { tags: [...current, t] });
  };

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

        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 px-3 py-1.5">
          <Tag className="h-3 w-3 text-muted-foreground" aria-hidden />
          {tags.length === 0 && <span className="text-[11px] text-muted-foreground">All items</span>}
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px]">
              #{t}
              <button type="button" aria-label={`Remove tag ${t}`} onClick={() => removeTag(t)} className="text-muted-foreground hover:text-foreground">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <input
            aria-label="Filter by tag"
            value={tagDraft}
            onChange={e => setTagDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Filter by tag…"
            className="min-w-[6rem] flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/70"
          />
        </div>

        {items.length === 0 ? (
          <p className="px-3 py-4 text-[12px] text-muted-foreground">
            {tags.length ? "No items with these tags." : "Nothing on the list yet."}
          </p>
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
                {(i.tags ?? []).slice(0, 2).map((t: string) => (
                  <span key={t} className="hidden rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">#{t}</span>
                ))}
                {tags.length > 0 && !((i.tags ?? []) as string[]).some(x => x.toLowerCase() === tags[0].toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => tagItem(i, tags[0])}
                    title={`Tag with #${tags[0]}`}
                    className="rounded-md px-1 text-[10px] text-muted-foreground hover:bg-muted"
                  >
                    +#{tags[0]}
                  </button>
                )}
                <ItemPrice name={i.name} qty={i.qty} store={prefs.preferred_store} overrides={overrides} onSave={setPrice} />
                <ShopMenu items={i.name} size="xs" variant="ghost" compact className="h-6 px-1.5" />
              </li>
            ))}
          </ul>
        )}

        {unbought.length > 0 && (
          <div className="flex items-baseline justify-between gap-2 border-t border-border/60 px-3 py-1.5 text-[11px]">
            <span className="text-muted-foreground">
              Total at {RETAILER_LABEL[prefs.preferred_store]}
              {total.unknownCount > 0 && ` · ${total.unknownCount} need a price`}
            </span>
            <span className="font-semibold tabular-nums">
              {total.estimatedCount > 0 ? "~" : ""}{formatMoney(total.cents)}
            </span>
          </div>
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
      tags: {
        default: [] as string[],
        parseHTML: el => {
          const raw = (el as HTMLElement).getAttribute("data-tags") || "";
          return raw ? raw.split(",").map(t => t.trim()).filter(Boolean) : [];
        },
        renderHTML: attrs => ({ "data-tags": (attrs.tags ?? []).join(",") }),
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
