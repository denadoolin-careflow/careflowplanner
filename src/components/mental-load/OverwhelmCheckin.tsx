import { useEffect, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Leaf, Heart, HandHeart } from "lucide-react";
import { toast } from "sonner";
import { MentalLoadCheckin, loadTodayCheckin, saveCheckin, loadWord } from "@/lib/mental-load";
import { cn } from "@/lib/utils";

export function OverwhelmCheckin({ uid, onSaved }: { uid: string; onSaved?: (c: MentalLoadCheckin) => void }) {
  const [energy, setEnergy] = useState(3);
  const [emotional, setEmotional] = useState(3);
  const [caregiving, setCaregiving] = useState(3);
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await loadTodayCheckin(uid);
      if (c) {
        setEnergy(c.energy); setEmotional(c.emotional);
        setCaregiving(c.caregiving); setNote(c.note ?? "");
      }
      setLoaded(true);
    })();
  }, [uid]);

  async function save() {
    setSaving(true);
    try {
      const c = await saveCheckin(uid, { energy, emotional, caregiving, note: note || null });
      toast.success("Noted softly.");
      onSaved?.(c);
    } catch (e: any) { toast.error(e?.message ?? "Couldn't save"); }
    finally { setSaving(false); }
  }

  return (
    <SectionCard
      title="How does today feel?"
      subtitle="No right answer. Just a soft snapshot."
      accent="warm"
    >
      <div className="space-y-4">
        <Row icon={<Leaf className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />} label="Energy"
          value={energy} onChange={setEnergy} hintLow="empty" hintHigh="spacious" />
        <Row icon={<Heart className="h-4 w-4 text-rose-500" />} label="Emotional weight"
          value={emotional} onChange={setEmotional} hintLow="heavy" hintHigh="light" inverted />
        <Row icon={<HandHeart className="h-4 w-4 text-amber-600 dark:text-amber-300" />} label="Caregiving load"
          value={caregiving} onChange={setCaregiving} hintLow="full plate" hintHigh="gentle day" inverted />

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="(optional) anything you want to name…"
          rows={2}
          className="rounded-2xl bg-card/60 text-sm"
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Energy feels <span className="font-medium text-foreground">{loadWord(energy)}</span>.
          </p>
          <Button size="sm" onClick={save} disabled={!loaded || saving}>
            {saving ? "Saving…" : "Save check-in"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

function Row({ icon, label, value, onChange, hintLow, hintHigh, inverted }: {
  icon: React.ReactNode; label: string; value: number; onChange: (n: number) => void;
  hintLow: string; hintHigh: string; inverted?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium">{icon}{label}</span>
        <span className="text-muted-foreground">{value} / 5</span>
      </div>
      <Slider value={[value]} min={1} max={5} step={1} onValueChange={(v) => onChange(v[0])} />
      <div className={cn("mt-1 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground", inverted && "")}>
        <span>{hintLow}</span><span>{hintHigh}</span>
      </div>
    </div>
  );
}