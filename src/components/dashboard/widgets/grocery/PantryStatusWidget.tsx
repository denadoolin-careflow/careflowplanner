import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";

type Counts = { in: number; low: number; out: number; need_soon: number };

export function PantryStatusWidget() {
  const [c, setC] = useState<Counts>({ in: 0, low: 0, out: 0, need_soon: 0 });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("pantry_items")
        .select("in_stock,name")
        .eq("user_id", uid);
      const inCount = (data ?? []).filter((r: any) => r.in_stock).length;
      const outCount = (data ?? []).filter((r: any) => !r.in_stock).length;
      setC({ in: inCount, low: 0, out: outCount, need_soon: 0 });
    })();
  }, []);

  const Pill = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="flex-1 rounded-xl border border-border/50 bg-card/40 p-3 text-center">
      <div className="text-2xl font-semibold" style={{ color }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" />Pantry</span>
        <Link to="/pantry" className="hover:text-primary">Manage →</Link>
      </div>
      <div className="flex gap-2">
        <Pill label="In stock" value={c.in} color="hsl(var(--pantry-in-stock))" />
        <Pill label="Out" value={c.out} color="hsl(var(--pantry-out))" />
      </div>
    </div>
  );
}