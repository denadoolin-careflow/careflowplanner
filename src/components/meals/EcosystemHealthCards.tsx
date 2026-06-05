import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Sprout, DollarSign, Utensils, ShoppingCart, AlertTriangle, Wallet,
} from "lucide-react";

type Tone = "emerald" | "amber" | "violet" | "rose" | "sky" | "primary";

const TONE: Record<Tone, string> = {
  emerald: "from-emerald-100/70 to-emerald-50/40 text-emerald-700 ring-emerald-200/60",
  amber:   "from-amber-100/70 to-amber-50/40 text-amber-700 ring-amber-200/60",
  violet:  "from-violet-100/70 to-violet-50/40 text-violet-700 ring-violet-200/60",
  rose:    "from-rose-100/70 to-rose-50/40 text-rose-700 ring-rose-200/60",
  sky:     "from-sky-100/70 to-sky-50/40 text-sky-700 ring-sky-200/60",
  primary: "from-primary/15 to-primary/5 text-primary ring-primary/20",
};

function Card({
  icon: Icon, label, value, sub, tone, to,
}: {
  icon: typeof Sprout; label: string; value: React.ReactNode;
  sub?: string; tone: Tone; to?: string;
}) {
  const inner = (
    <div className={cn(
      "group relative h-full overflow-hidden rounded-2xl bg-gradient-to-br p-3 ring-1 shadow-soft transition",
      TONE[tone],
      to && "hover:-translate-y-0.5 hover:shadow-md",
    )}>
      <div className="flex items-center gap-1.5">
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-white/70 ring-1 ring-white/60">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/70">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold leading-none tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}

export function EcosystemHealthCards() {
  const { user, state } = useStore();
  const [stats, setStats] = useState({
    total: 0, inStock: 0, low: 0, value: 0,
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("pantry_items")
        .select("in_stock,stock_status,price,qty")
        .eq("user_id", user.id);
      if (cancelled || !data) return;
      const total = data.length;
      const inStock = data.filter((d: any) => d.in_stock).length;
      const low = data.filter((d: any) => d.stock_status === "low" || d.stock_status === "out").length;
      const value = data.reduce((s: number, d: any) => {
        const p = Number(d.price ?? 0);
        return s + (isFinite(p) ? p : 0);
      }, 0);
      setStats({ total, inStock, low, value });
    })();
    return () => { cancelled = true; };
  }, [user]);

  const pantryHealth = stats.total ? Math.round((stats.inStock / stats.total) * 100) : 0;
  const grocerySoon = state.grocery.filter(g => !g.bought).length;

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <Card icon={Sprout} tone="emerald" label="Pantry health"
            value={stats.total ? `${pantryHealth}%` : "—"}
            sub={stats.total ? `${stats.inStock} of ${stats.total} stocked` : "Add items to begin"} />
      <Card icon={DollarSign} tone="primary" label="Inventory value"
            value={stats.value ? `$${stats.value.toFixed(0)}` : "—"}
            sub={stats.value ? "From item prices" : "Add prices to track"} />
      <Card icon={Utensils} tone="violet" label="Meals ready"
            value="—" sub="Coming soon" />
      <Card icon={ShoppingCart} tone="amber" label="Restock soon"
            value={stats.low} sub={stats.low === 1 ? "item running low" : "items running low"}
            to="/home/groceries" />
      <Card icon={AlertTriangle} tone="rose" label="Expiring"
            value="—" sub="Coming soon" />
      <Card icon={Wallet} tone="sky" label="Grocery list"
            value={grocerySoon} sub={grocerySoon === 1 ? "item to buy" : "items to buy"}
            to="/home/groceries" />
    </div>
  );
}