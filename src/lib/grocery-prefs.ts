import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Retailer } from "@/lib/retailer-links";

export interface GroceryPrefs {
  preferred_store: Retailer;
  backup_store: Retailer | null;
  delivery_mode: "delivery" | "pickup";
}

export const DEFAULT_GROCERY_PREFS: GroceryPrefs = {
  preferred_store: "kroger",
  backup_store: null,
  delivery_mode: "delivery",
};

export function useGroceryPrefs() {
  const [prefs, setPrefs] = useState<GroceryPrefs>(DEFAULT_GROCERY_PREFS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) { setLoading(false); return; }
    const { data } = await supabase
      .from("grocery_prefs" as any)
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    if (data) {
      setPrefs({
        preferred_store: (data as any).preferred_store ?? "kroger",
        backup_store: (data as any).backup_store ?? null,
        delivery_mode: (data as any).delivery_mode ?? "delivery",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async (next: Partial<GroceryPrefs>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    await supabase.from("grocery_prefs" as any).upsert(
      { user_id: uid, ...merged },
      { onConflict: "user_id" },
    );
  };

  return { prefs, save, loading, refresh };
}