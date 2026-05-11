import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Wand2, Zap, Heart, Bath } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Kind = "weekly" | "deep" | "quick" | "low_energy";

const KINDS: Array<{ id: Kind; label: string; icon: React.ReactNode; desc: string }> = [
  { id: "weekly", label: "Weekly Reset", icon: <Sparkles className="h-3.5 w-3.5" />, desc: "Light maintenance across the week" },
  { id: "deep", label: "Deep Clean", icon: <Bath className="h-3.5 w-3.5" />, desc: "Thorough room-by-room reset" },
  { id: "quick", label: "Quick Reset", icon: <Zap className="h-3.5 w-3.5" />, desc: "10-minute tidy" },
  { id: "low_energy", label: "Low-Energy", icon: <Heart className="h-3.5 w-3.5" />, desc: "Soft, seated, gentle tasks" },
];

export function AIGenerateMenu({ onGenerated, weekStart }: { onGenerated: () => void; weekStart?: string | null }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("weekly");
  const [busy, setBusy] = useState(false);
  const [homeSize, setHomeSize] = useState("medium");
  const [familySize, setFamilySize] = useState(2);
  const [energy, setEnergy] = useState("medium");
  const [minutes, setMinutes] = useState(60);
  const [caregiving, setCaregiving] = useState("moderate");

  const generate = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-cleaning-checklist", {
        body: { kind, homeSize, familySize, energy, minutes, caregiving, weekStart: weekStart ?? null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Your reset is ready ✨");
      setOpen(false);
      onGenerated();
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes("429")) toast.error("Slow down a moment — try again shortly.");
      else if (msg.includes("402")) toast.error("AI credits exhausted. Add funds in Settings → Workspace.");
      else toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <Wand2 className="mr-2 h-4 w-4" /> Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">Generate a cleaning reset</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map(k => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`rounded-xl border p-3 text-left transition ${kind === k.id ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/40"}`}
              >
                <div className="flex items-center gap-1.5 text-xs font-medium">{k.icon}{k.label}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{k.desc}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Home size</Label>
              <Select value={homeSize} onValueChange={setHomeSize}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (studio/1-bed)</SelectItem>
                  <SelectItem value="medium">Medium (2-3 bed)</SelectItem>
                  <SelectItem value="large">Large (4+ bed)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Family size</Label>
              <Input type="number" min={1} value={familySize} onChange={e => setFamilySize(Number(e.target.value))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Energy</Label>
              <Select value={energy} onValueChange={setEnergy}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Time available (min)</Label>
              <Input type="number" min={5} value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="h-8 text-xs" />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Caregiving load</Label>
              <Select value={caregiving} onValueChange={setCaregiving}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="heavy">Heavy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full" onClick={generate} disabled={busy}>
            <Sparkles className={`mr-2 h-4 w-4 ${busy ? "animate-pulse" : ""}`} />
            {busy ? "Generating…" : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}