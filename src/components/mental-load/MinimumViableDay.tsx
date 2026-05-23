import { useEffect, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Sprout, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { loadOrCreateMVD, saveMVD, saveCheckin, loadTodayCheckin } from "@/lib/mental-load";

export function MinimumViableDay({ uid }: { uid: string }) {
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [minMode, setMinMode] = useState(false);

  useEffect(() => {
    (async () => {
      const mvd = await loadOrCreateMVD(uid);
      setItems(mvd.items ?? []);
      const c = await loadTodayCheckin(uid);
      setMinMode(!!c?.minimum_mode);
    })();
  }, [uid]);

  async function persist(next: string[]) {
    setItems(next);
    try { await saveMVD(uid, next); } catch (e: any) { toast.error(e?.message ?? "Couldn't save"); }
  }

  async function activate(next: boolean) {
    setMinMode(next);
    try {
      await saveCheckin(uid, { minimum_mode: next });
      toast.success(next ? "Today is gentle. The rest can wait." : "Welcome back to a fuller day.");
    } catch (e: any) { toast.error(e?.message ?? "Couldn't save"); }
  }

  return (
    <SectionCard
      title="Minimum viable day"
      subtitle="What you'd be proud of, even on the heaviest day."
      accent="sage"
      action={
        <Button size="sm" variant={minMode ? "default" : "outline"} onClick={() => activate(!minMode)}>
          <Wand2 className="mr-1 h-3.5 w-3.5" />
          {minMode ? "Gentle mode on" : "Activate today"}
        </Button>
      }
    >
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/40 p-2">
            <Sprout className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            <Input value={it} onChange={(e) => {
              const next = [...items]; next[i] = e.target.value; setItems(next);
            }} onBlur={() => persist(items)} className="h-8 border-none bg-transparent text-sm shadow-none focus-visible:ring-0" />
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => persist(items.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { persist([...items, draft.trim()]); setDraft(""); } }}
            placeholder="Add a soft anchor…" className="h-8 text-sm" />
          <Button size="sm" variant="outline" onClick={() => { if (draft.trim()) { persist([...items, draft.trim()]); setDraft(""); } }}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {minMode && (
          <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            Gentle mode is on. Everything else can wait.
          </div>
        )}
      </div>
    </SectionCard>
  );
}