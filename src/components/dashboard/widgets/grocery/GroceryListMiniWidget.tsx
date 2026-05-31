import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { ShopMenu } from "@/components/meals/ShopMenu";

export function GroceryListMiniWidget() {
  const [items, setItems] = useState<{ id: string; name: string; stock_status: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("grocery_items")
        .select("id,name,stock_status")
        .eq("user_id", uid).eq("bought", false)
        .order("created_at", { ascending: false }).limit(6);
      setItems((data ?? []) as any);
    })();
  }, []);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><ShoppingCart className="h-3 w-3" />Grocery list</span>
        <Link to="/meals" className="hover:text-primary">All →</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing on the list.</p>
      ) : (
        <ul className="flex-1 space-y-1 overflow-auto text-xs">
          {items.map(i => (
            <li key={i.id} className="flex items-center gap-1.5 rounded-md bg-background/50 px-2 py-1">
              <span className="flex-1 truncate">{i.name}</span>
              <ShopMenu items={i.name} size="xs" variant="ghost" compact className="h-6 px-1.5" />
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && (
        <ShopMenu items={items.map(i => i.name)} size="xs" className="w-full justify-center" />
      )}
    </div>
  );
}