import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export default function Settings() {
  const { state, setName, setLowEnergyMode, resetAll } = useStore();
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-6">
      <SectionCard title="Your name" subtitle="So your dashboard can greet you." accent="warm">
        <Input value={state.settings.name} onChange={e => setName(e.target.value)} />
      </SectionCard>

      <SectionCard title="Low-energy mode" subtitle="Hide non-essentials when you need a softer day." accent="calm">
        <div className="flex items-center gap-3">
          <Switch checked={state.settings.lowEnergyMode} onCheckedChange={setLowEnergyMode} />
          <Label className="text-sm">{state.settings.lowEnergyMode ? "On — only essentials shown" : "Off"}</Label>
        </div>
      </SectionCard>

      <SectionCard title="Theme" accent="sage">
        <div className="flex flex-wrap gap-2">
          {["light","dark","system"].map(t => (
            <Button key={t} variant={theme === t ? "default" : "outline"} className="capitalize rounded-full" onClick={() => setTheme(t)}>{t}</Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Data" subtitle="Stored locally on this device." accent="warm">
        <p className="text-sm text-muted-foreground">Your CareFlow data lives in this browser. We can add cloud sync and sign-in next.</p>
        <Button variant="destructive" className="mt-3" onClick={() => { if (confirm("Reset all data to seed example?")) { resetAll(); toast.success("Reset complete."); } }}>Reset to sample data</Button>
      </SectionCard>
    </div>
  );
}
