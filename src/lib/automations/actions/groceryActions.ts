import { supabase } from "@/integrations/supabase/client";

type Status = "in" | "low" | "out";

export async function setStockStatus(itemId: string, status: Status) {
  await supabase.from("grocery_items").update({ stock_status: status }).eq("id", itemId);
}

export async function addTag(itemId: string, tag: string, currentTags: string[] = []) {
  if (currentTags.includes(tag)) return;
  const next = [...currentTags, tag];
  await supabase.from("grocery_items").update({ tags: next } as any).eq("id", itemId);
}

export async function removeTag(itemId: string, tag: string, currentTags: string[] = []) {
  const next = currentTags.filter(t => t !== tag);
  await supabase.from("grocery_items").update({ tags: next } as any).eq("id", itemId);
}

export async function moveToPantry(itemId: string, opts: { tag: string; stockStatus: Status; currentTags: string[] }) {
  const tags = opts.currentTags.includes(opts.tag) ? opts.currentTags : [...opts.currentTags, opts.tag];
  await supabase
    .from("grocery_items")
    .update({ stock_status: opts.stockStatus, tags } as any)
    .eq("id", itemId);
}