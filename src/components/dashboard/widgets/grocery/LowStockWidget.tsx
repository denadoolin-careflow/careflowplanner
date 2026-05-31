import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { ShopMenu } from "@/components/meals/ShopMenu";

export function LowStockWidget() {
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("pantry_items")
        .select("id,name")
        .eq("user_id", uid).eq("in_stock", false)
        .order("name").limit(6);
      setItems((data ?? []) as any);
    })();
  }, []);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Running low</span>
        <Link to="/pantry" className="hover:text-primary">Pantry →</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">All stocked up. 🎉</p>
      ) : (
        <>
          <ul className="flex-1 space-y-1 overflow-auto text-xs">
            {items.map(i => (
              <li key={i.id} className="flex items-center gap-1.5 rounded-md bg-background/50 px-2 py-1">
                <span className="flex-1 truncate">{i.name}</span>
              </li>
            ))}
          </ul>
          <ShopMenu items={items.map(i => i.name)} size="xs" className="w-full justify-center" />
        </>
      )}
    </div>
  );
}