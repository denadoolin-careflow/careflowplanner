import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PantryColors {
  in_stock_color: string;
  low_color: string;
  out_color: string;
}

export const DEFAULT_PANTRY_COLORS: PantryColors = {
  in_stock_color: "142 70% 45%",
  low_color: "38 92% 55%",
  out_color: "0 75% 60%",
};

function applyVars(c: PantryColors) {
  const r = document.documentElement;
  r.style.setProperty("--pantry-in-stock", c.in_stock_color);
  r.style.setProperty("--pantry-low", c.low_color);
  r.style.setProperty("--pantry-out", c.out_color);
}

export function usePantryColors() {
  const [colors, setColors] = useState<PantryColors>(DEFAULT_PANTRY_COLORS);

  const refresh = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const { data } = await supabase
      .from("user_pantry_colors")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    const next: PantryColors = data ? {
      in_stock_color: data.in_stock_color,
      low_color: data.low_color,
      out_color: data.out_color,
    } : DEFAULT_PANTRY_COLORS;
    setColors(next);
    applyVars(next);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async (next: PantryColors) => {
    setColors(next);
    applyVars(next);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    await supabase.from("user_pantry_colors").upsert({ user_id: uid, ...next }, { onConflict: "user_id" });
  };

  return { colors, save, refresh };
}

export function statusVar(status: "in" | "low" | "out") {
  return status === "in" ? "var(--pantry-in-stock)" :
         status === "low" ? "var(--pantry-low)" :
         "var(--pantry-out)";
}

export function statusLabel(status: "in" | "low" | "out") {
  return status === "in" ? "In stock" : status === "low" ? "Low" : "Out";
}
