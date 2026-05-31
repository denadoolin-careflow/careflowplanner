import { useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { PantryPanel } from "@/components/meals/PantryPanel";
import { PantryKanban } from "@/components/meals/PantryKanban";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Columns } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "list" | "kanban";
const KEY = "pantry.view";

export default function Pantry() {
  const [view, setView] = useState<View>(() => (localStorage.getItem(KEY) as View) || "kanban");
  const set = (v: View) => { setView(v); localStorage.setItem(KEY, v); };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Pantry"
        subtitle="Track what you already have so we don't add it to the grocery list."
        accent="warm"
        action={
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
        }
      >
        {view === "kanban" ? <PantryKanban /> : <PantryPanel />}
      </SectionCard>
    </div>
  );
}