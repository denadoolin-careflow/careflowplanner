import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Key = `${string}::${string}`;
let cache: Record<Key, string> = {};
const listeners = new Set<(c: Record<Key, string>) => void>();
let loaded = false;
let loading: Promise<void> | null = null;

function emit() { listeners.forEach(l => l(cache)); }

async function loadAll() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { cache = {}; loaded = true; emit(); return; }
  const { data } = await supabase.from("widget_text_overrides" as any).select("*");
  const next: Record<Key, string> = {};
  for (const r of (data ?? []) as any[]) {
    next[`${r.widget_id}::${r.field}` as Key] = r.value;
  }
  cache = next;
  loaded = true;
  emit();
}
function ensureLoaded() {
  if (loaded || loading) return loading;
  loading = loadAll().finally(() => { loading = null; });
  return loading;
}

export const widgetText = {
  get(widgetId: string, field: string, fallback: string): string {
    return cache[`${widgetId}::${field}` as Key] ?? fallback;
  },
  async set(widgetId: string, field: string, value: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!value || value.trim() === "") {
      await supabase.from("widget_text_overrides" as any).delete()
        .eq("user_id", user.id).eq("widget_id", widgetId).eq("field", field);
      delete cache[`${widgetId}::${field}` as Key];
    } else {
      const row = { user_id: user.id, widget_id: widgetId, field, value: value.trim() };
      await supabase.from("widget_text_overrides" as any)
        .upsert(row as any, { onConflict: "user_id,widget_id,field" });
      cache[`${widgetId}::${field}` as Key] = value.trim();
    }
    emit();
  },
};

export function useWidgetText(widgetId: string, field: string, fallback: string) {
  const [, force] = useState(0);
  useEffect(() => {
    void ensureLoaded();
    const fn = () => force(x => x + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return widgetText.get(widgetId, field, fallback);
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => { loaded = false; void ensureLoaded(); });
}