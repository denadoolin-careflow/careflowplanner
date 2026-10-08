import { useState } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorSwatchPicker, IconGroupPicker } from "./TagPicker";
import { useAtmosphere } from "@/lib/atmospheres";
import { toast } from "sonner";

export function TagAppearancePopover({ name, color, icon, onSave }: { name: string; color: string; icon: string; onSave: (patch: { color: string; icon: string }) => Promise<void> }) {
  const { atmosphere } = useAtmosphere();
  const [open, setOpen] = useState(false);
  const [draftColor, setColor] = useState(color);
  const [draftIcon, setIcon] = useState(icon);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await onSave({ color: draftColor, icon: draftIcon }); setOpen(false); toast.success("Tag appearance saved"); }
    catch { toast.error("Could not save tag appearance"); }
    finally { setSaving(false); }
  };
  return <Popover open={open} onOpenChange={value => { if (saving) return; setOpen(value); if (value) { setColor(color); setIcon(icon); } }}>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Customize ${name} color and icon`} title={`Customize ${name}`}><Palette className="h-4 w-4" /></Button></PopoverTrigger>
    <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-3">
      <h2 className="mb-3 text-sm font-semibold">#{name}</h2>
      <div className="max-h-[50vh] overflow-y-auto"><ColorSwatchPicker value={draftColor} onChange={setColor} atmosphereName={atmosphere.name} atmospherePalette={atmosphere.palette} /><IconGroupPicker value={draftIcon} onChange={setIcon} color={draftColor} previewName={name} /></div>
      <div className="mt-3 flex justify-end gap-2"><Button variant="ghost" size="sm" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button size="sm" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button></div>
    </PopoverContent>
  </Popover>;
}