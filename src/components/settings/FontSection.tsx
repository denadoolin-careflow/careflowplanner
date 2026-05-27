import { useState } from "react";
import { Type, RotateCcw } from "lucide-react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FONT_OPTIONS, getFontPref, setFontPref,
} from "@/lib/font-prefs";
import { useAtmosphere } from "@/lib/atmospheres";

const ATMO_VALUE = "__atmo";

export function FontSection() {
  const { atmosphere } = useAtmosphere();
  const [display, setDisplay] = useState<string>(() => getFontPref("display") ?? ATMO_VALUE);
  const [body, setBody]       = useState<string>(() => getFontPref("body") ?? ATMO_VALUE);

  const displayOptions = FONT_OPTIONS.filter(o => o.kind === "display" || o.kind === "both");
  const bodyOptions    = FONT_OPTIONS.filter(o => o.kind === "body" || o.kind === "both");

  const update = (slot: "display" | "body", value: string) => {
    const id = value === ATMO_VALUE ? null : value;
    setFontPref(slot, id);
    if (slot === "display") setDisplay(value); else setBody(value);
  };

  const reset = () => {
    setFontPref("display", null);
    setFontPref("body", null);
    setDisplay(ATMO_VALUE);
    setBody(ATMO_VALUE);
  };

  const displayFamily = display === ATMO_VALUE
    ? `'${atmosphere.fontDisplay}', ui-serif, Georgia, serif`
    : FONT_OPTIONS.find(o => o.id === display)?.family;
  const bodyFamily = body === ATMO_VALUE
    ? `'${atmosphere.fontBody}', ui-sans-serif, system-ui, sans-serif`
    : FONT_OPTIONS.find(o => o.id === body)?.family;

  return (
    <SectionCard
      title="Fonts"
      subtitle="Override the display and body type. Atmosphere defaults are used when nothing is selected."
      accent="sage"
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Display (headings)</Label>
            <Select value={display} onValueChange={(v) => update("display", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ATMO_VALUE}>Atmosphere default ({atmosphere.fontDisplay})</SelectItem>
                {displayOptions.map(o => (
                  <SelectItem key={o.id} value={o.id} style={{ fontFamily: o.family }}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Body (text)</Label>
            <Select value={body} onValueChange={(v) => update("body", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ATMO_VALUE}>Atmosphere default ({atmosphere.fontBody})</SelectItem>
                {bodyOptions.map(o => (
                  <SelectItem key={o.id} value={o.id} style={{ fontFamily: o.family }}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Type className="h-3 w-3" /> Preview
          </div>
          <div className="text-2xl font-semibold leading-tight" style={{ fontFamily: displayFamily }}>
            A gentle, grounded day.
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground" style={{ fontFamily: bodyFamily }}>
            CareFlow adapts your typography to match how you want to read and plan today.
          </p>
        </div>

        <div>
          <Button variant="ghost" size="sm" className="gap-2" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset to atmosphere defaults
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}