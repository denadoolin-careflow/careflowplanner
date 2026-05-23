import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomizableGrid } from "@/components/dashboard/CustomizableGrid";
import { SectionCard } from "@/components/cards/SectionCard";
import { BillsTab } from "@/components/wealth-hub/BillsTab";
import { TransactionsTab } from "@/components/wealth-hub/TransactionsTab";
import { RecurringTab } from "@/components/wealth-hub/RecurringTab";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Receipt, CalendarClock, Repeat, Sprout, TrendingDown,
  CalendarDays, BarChart3, Eye, EyeOff,
} from "lucide-react";

type TabId = "dashboard" | "transactions" | "bills" | "recurring" | "goals" | "debts" | "calendar" | "analytics";

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard; comingSoon?: boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "bills", label: "Bills", icon: CalendarClock },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "recurring", label: "Recurring", icon: Repeat },
  { id: "goals", label: "Goals", icon: Sprout, comingSoon: true },
  { id: "debts", label: "Debts", icon: TrendingDown, comingSoon: true },
  { id: "calendar", label: "Calendar", icon: CalendarDays, comingSoon: true },
  { id: "analytics", label: "Analytics", icon: BarChart3, comingSoon: true },
];

function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <SectionCard title={title} accent="calm">
      <p className="text-sm text-muted-foreground">{blurb}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Shipping in an upcoming phase — your existing data is already safe and will appear here automatically.
      </p>
    </SectionCard>
  );
}

function useUser() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);
  return uid;
}

export default function WealthHub() {
  const uid = useUser();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [hide, setHide] = useState(false);

  return (
    <div className={cn("space-y-5", hide && "wealth-blur")}>
      <style>{`.wealth-blur .tabular-nums, .wealth-blur [data-money] { filter: blur(6px); user-select: none; }`}</style>

      <div className="cozy-card overflow-hidden">
        <div className="flex flex-col gap-3 p-6 gradient-sage sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">A gentle money companion</p>
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Wealth</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Budgeting, bills, savings, and goals — connected to your calendar and life rhythms.
              Money is a tool, not a measure of you.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setHide((h) => !h)} className="self-start sm:self-end">
            {hide ? <><Eye className="mr-1 h-4 w-4" /> Show amounts</> : <><EyeOff className="mr-1 h-4 w-4" /> Hide amounts</>}
          </Button>
        </div>
      </div>

      {/* Sticky tab strip */}
      <div className="sticky top-0 z-20 -mx-4 bg-background/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "border-primary/45 bg-primary/15 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.45)]"
                    : "border-border/60 bg-card/70 text-muted-foreground hover:bg-card",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {t.comingSoon && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!uid ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          {tab === "dashboard" && <CustomizableGrid pageKey="wealth-hub" />}
          {tab === "bills" && <BillsTab uid={uid} />}
          {tab === "transactions" && <TransactionsTab uid={uid} />}
          {tab === "recurring" && <RecurringTab uid={uid} />}
          {tab === "goals" && <ComingSoon title="Savings goals" blurb="Visual progress rings, milestone celebrations, recurring contributions, and target-date countdowns." />}
          {tab === "debts" && <ComingSoon title="Debts" blurb="Snowball or avalanche payoff plans with projected timelines and gentle progress visuals." />}
          {tab === "calendar" && <ComingSoon title="Calendar overlay" blurb="Bills, paydays, savings transfers, and debt payments appear in Today, Week, Month, and Daily plan." />}
          {tab === "analytics" && <ComingSoon title="Analytics" blurb="Soft-gradient charts for spending by category, income vs expenses, savings growth, and budget rhythm." />}
        </>
      )}
    </div>
  );
}