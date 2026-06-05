import { useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { PantryPanel } from "@/components/meals/PantryPanel";
import { PantryKanban } from "@/components/meals/PantryKanban";
import { RestockPanel } from "@/components/meals/RestockPanel";
import { Button } from "@/components/ui/button";
import { List, Columns, Sparkles, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCATIONS, LOCATION_META, seedInventory, type Location } from "@/lib/inventory-seed";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { EcosystemHealthCards } from "@/components/meals/EcosystemHealthCards";

type View = "list" | "kanban";
const KEY = "pantry.view";
const LOC_KEY = "pantry.location";
type Tab = Location | "All" | "Restock";

export default function Pantry() {
  const { user } = useStore();
  const [view, setView] = useState<View>(() => (localStorage.getItem(KEY) as View) || "kanban");
  const set = (v: View) => { setView(v); localStorage.setItem(KEY, v); };
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get("tab") as Tab) || (localStorage.getItem(LOC_KEY) as Tab) || "All";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [seeding, setSeeding] = useState(false);
  const setTabPersist = (t: Tab) => {
    setTab(t);
    localStorage.setItem(LOC_KEY, t);
    const next = new URLSearchParams(params); next.set("tab", t); setParams(next, { replace: true });
  };

  const onSeed = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const r = await seedInventory(user.id);
      if (r.inserted) toast.success(`Added ${r.inserted} common items.`);
      else toast.info("Everything's already there.");
      // force refresh by toggling tab
      setTab(t => t);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't seed");
    } finally { setSeeding(false); }
  };

  const tabs: { key: Tab; label: string; emoji?: string }[] = [
    { key: "All", label: "All" },
    ...LOCATIONS.map(l => ({ key: l as Tab, label: l, emoji: LOCATION_META[l].emoji })),
    { key: "Restock", label: "Restock" },
  ];

  return (
    <div className="space-y-4">
      <EcosystemHealthCards />
      <SectionCard
        title="Home Inventory"
        subtitle="Know what you have, what you need, and what you can make."
        accent="warm"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={onSeed} disabled={seeding}>
              <Sparkles className="mr-1 h-3.5 w-3.5" />{seeding ? "Adding…" : "Seed common items"}
            </Button>
            <div className="flex gap-1 rounded-full border border-border/60 p-0.5">
              <Button
                size="sm" variant="ghost"
                className={cn("h-7 rounded-full px-2 text-xs", view === "kanban" && "bg-primary/15 text-primary")}
                onClick={() => set("kanban")}
              ><Columns className="mr-1 h-3.5 w-3.5" />Kanban</Button>
              <Button
                size="sm" variant="ghost"
                className={cn("h-7 rounded-full px-2 text-xs", view === "list" && "bg-primary/15 text-primary")}
                onClick={() => set("list")}
              ><List className="mr-1 h-3.5 w-3.5" />List</Button>
            </div>
          </div>
        }
      >
        <div className="mb-3 -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTabPersist(t.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs transition min-h-11 sm:min-h-0",
                tab === t.key
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:bg-muted/40",
              )}
            >
              {t.emoji && <span className="mr-1">{t.emoji}</span>}
              {t.key === "Restock" && <Repeat className="mr-1 inline h-3 w-3" />}
              {t.label}
            </button>
          ))}
        </div>
        {tab === "Restock" ? (
          <RestockPanel />
        ) : view === "kanban" ? (
          <PantryKanban location={tab as Location | "All"} />
        ) : (
          <PantryPanel location={tab as Location | "All"} />
        )}
      </SectionCard>
    </div>
  );
}