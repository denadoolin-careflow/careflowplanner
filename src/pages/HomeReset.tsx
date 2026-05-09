import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function HomeReset() {
  const { state, toggleCleaning, deleteCleaning } = useStore();
  const cadences = ["daily","weekly","monthly","seasonal"] as const;
  const zones = ["Kitchen","Bathroom","Bedrooms","Living","Laundry","Entryway","Outdoor","Whole home"] as const;

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-sage p-6">
        <h2 className="font-display text-3xl font-semibold">Home reset</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tiny actions, repeated kindly.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {cadences.map(c => {
          const items = state.cleaning.filter(x => x.cadence === c);
          const done = items.filter(i => i.done).length;
          return (
            <SectionCard key={c} title={c.charAt(0).toUpperCase()+c.slice(1)} subtitle={`${done} / ${items.length} done`} accent="sage">
              <Progress value={items.length ? done/items.length*100 : 0} className="mb-3 h-1.5" />
              <ul className="space-y-1">
                {items.map(i => (
                  <li key={i.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                    <Checkbox checked={i.done} onCheckedChange={() => toggleCleaning(i.id)} />
                    <span className={`flex-1 text-sm ${i.done ? "text-muted-foreground line-through" : ""}`}>{i.title}</span>
                    <span className="text-xs text-muted-foreground">{i.zone}</span>
                    <button onClick={() => deleteCleaning(i.id)} className="opacity-0 group-hover:opacity-60"><Trash2 className="h-3 w-3" /></button>
                  </li>
                ))}
              </ul>
            </SectionCard>
          );
        })}
      </div>

      <SectionCard title="By zone" accent="warm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {zones.map(z => {
            const items = state.cleaning.filter(c => c.zone === z);
            return (
              <div key={z} className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{z}</div>
                <div className="mt-1">{items.filter(i => i.done).length} / {items.length}</div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Reset templates" accent="calm">
        <div className="space-y-3">
          {state.resetTemplates.map(t => (
            <div key={t.id} className="rounded-xl border border-border/60 p-3">
              <div className="font-display text-base">{t.name}</div>
              <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">{t.items.slice(0,5).map((it, i) => <li key={i}>{it}</li>)}</ul>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
