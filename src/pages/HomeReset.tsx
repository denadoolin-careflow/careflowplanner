import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useResetChecklists } from "@/lib/reset-checklists";
import { ChecklistTree } from "@/components/reset/ChecklistTree";
import { AIGenerateMenu } from "@/components/reset/AIGenerateMenu";
import { toast } from "sonner";
import { MoonResetTip } from "@/components/rhythm/MoonResetTip";
import { MoonPhaseBadge } from "@/components/rhythm/MoonPhaseBadge";
import { ElementBadge } from "@/components/rhythm/ElementBadge";

export default function HomeReset() {
  const reset = useResetChecklists({});

  const addList = async (kind: "weekly" | "deep" | "quick" | "low_energy" | "custom" = "custom") => {
    const id = await reset.createList({ name: "New cleaning checklist", kind });
    if (id) toast.success("Checklist created");
  };

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-sage flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold">Home reset</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tiny actions, repeated kindly. Drag to reorder, double-click to edit.</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <MoonPhaseBadge />
            <ElementBadge />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AIGenerateMenu onGenerated={reset.refresh} />
          <Button variant="outline" className="rounded-full" onClick={() => addList("custom")}>
            <Plus className="mr-1 h-4 w-4" /> Add cleaning task
          </Button>
        </div>
      </div>

      <MoonResetTip />

      {reset.lists.filter(l => !l.is_template).length === 0 ? (
        <SectionCard title="Start fresh" accent="warm">
          <p className="text-sm text-muted-foreground">Generate a reset with AI, or add a checklist by hand. Anything you make stays editable, draggable, and recurring.</p>
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {reset.lists.filter(l => !l.is_template).map(list => (
            <SectionCard key={list.id} title={list.name} accent="sage">
              <ChecklistTree
                list={list}
                onAdd={(item) => reset.addItem(list.id, item)}
                onUpdate={reset.updateItem}
                onDelete={reset.deleteItem}
                onDuplicate={reset.duplicateItem}
                onReorder={(parentId, ordered) => reset.reorderItems(list.id, parentId, ordered)}
                onRenameList={(name) => reset.renameList(list.id, name)}
                onDeleteList={() => reset.deleteList(list.id)}
                onSaveTemplate={() => { void reset.saveAsTemplate(list.id); toast.success("Saved as template"); }}
              />
            </SectionCard>
          ))}
        </div>
      )}

      {reset.lists.filter(l => l.is_template).length > 0 && (
        <SectionCard title="Saved templates" accent="calm">
          <div className="flex flex-wrap gap-2">
            {reset.lists.filter(l => l.is_template).map(t => (
              <div key={t.id} className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs">
                <span className="font-medium">{t.name}</span>
                <button
                  className="ml-2 text-muted-foreground hover:text-primary"
                  onClick={async () => { await reset.loadTemplate(t.id, null); toast.success("Loaded"); }}
                >Load</button>
                <button
                  className="ml-2 text-muted-foreground hover:text-destructive"
                  onClick={() => reset.deleteList(t.id)}
                >×</button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
