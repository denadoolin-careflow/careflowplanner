import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { aiInvoke } from "@/lib/ai-invoke";

const COUNTS = [1, 3, 5, 10];
const SLOTS = ["Any", "Breakfast", "Lunch", "Dinner", "Snack"];
const TAGS = ["low-energy", "sensory-safe", "kid-friendly", "quick", "freezer"];

export function AIGenerateMealsDialog({
  open, onOpenChange, onDone,
}: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [count, setCount] = useState(3);
  const [slot, setSlot] = useState("Any");
  const [vibe, setVibe] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [withImages, setWithImages] = useState(true);
  const [busy, setBusy] = useState(false);

  const toggleTag = (t: string) =>
    setTags(a => a.includes(t) ? a.filter(x => x !== t) : [...a, t]);

  const generate = async () => {
    setBusy(true);
    try {
      const { data, error } = await aiInvoke("ai-library-meals", {
        body: { count, slot, vibe, tags, with_images: withImages },
      });
      if (error) {
        const msg = (error as any)?.context?.status === 429
          ? "Rate limited. Please try again in a moment."
          : (error as any)?.context?.status === 402
          ? "AI credits exhausted. Add funds in Settings → Workspace → Usage."
          : error.message ?? "Failed to generate";
        toast.error(msg);
      } else if ((data as any)?.error) {
        toast.error((data as any).error);
      } else {
        const c = (data as any)?.created ?? 0;
        const i = (data as any)?.images ?? 0;
        toast.success(`Added ${c} recipe${c === 1 ? "" : "s"}${withImages ? ` · ${i} with images` : ""}`);
        onDone();
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            AI generate recipes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div>
            <Label className="text-xs text-muted-foreground">How many?</Label>
            <div className="mt-1 flex gap-1">
              {COUNTS.map(n => (
                <button key={n} onClick={() => setCount(n)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${count === n ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Slot</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {SLOTS.map(s => (
                <button key={s} onClick={() => setSlot(s)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${slot === s ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {TAGS.map(t => (
                <button key={t} onClick={() => toggleTag(t)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${tags.includes(t) ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Vibe (optional)</Label>
            <Textarea value={vibe} onChange={e => setVibe(e.target.value)}
              placeholder="e.g. freezer-friendly low-energy dinners"
              className="mt-1 h-20" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <div>
              <div className="text-sm">Generate cover images</div>
              <div className="text-[11px] text-muted-foreground">A cozy AI photo for each recipe.</div>
            </div>
            <Switch checked={withImages} onCheckedChange={setWithImages} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={generate} disabled={busy} className="rounded-full">
            {busy ? (
              <><Loader2 className="mr-1 h-4 w-4 animate-spin" />{withImages ? "Cooking & plating…" : "Cooking…"}</>
            ) : (
              <><Sparkles className="mr-1 h-4 w-4" />Generate</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}