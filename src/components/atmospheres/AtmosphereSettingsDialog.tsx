import { Play, RotateCcw, Type, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Atmosphere } from "@/lib/atmospheres";
import {
  ATMOSPHERE_DEFAULT_CHIME, CHIME_PRESETS, CHIME_PRESET_LIST,
  getChimeOverride, setChimeOverride, playChimeFor, playChimePreset,
  type ChimePresetKey,
} from "@/lib/completion-sound";
import {
  FONT_OPTIONS, getAtmoFontPref, setAtmoFontPref,
} from "@/lib/font-prefs";
import { useState } from "react";

export function AtmosphereSettingsDialog({
  atmosphere, open, onOpenChange,
}: {
  atmosphere: Atmosphere;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);

  const chimeOverride = getChimeOverride(atmosphere.id);
  const effectiveChime: ChimePresetKey =
    (chimeOverride ?? ATMOSPHERE_DEFAULT_CHIME[atmosphere.id]) as ChimePresetKey;

  const displayOverride = getAtmoFontPref(atmosphere.id, "display");
  const bodyOverride = getAtmoFontPref(atmosphere.id, "body");

  const displayFonts = FONT_OPTIONS.filter((f) => f.kind !== "body");
  const bodyFonts = FONT_OPTIONS.filter((f) => f.kind !== "display");

  const resetAll = () => {
    setChimeOverride(atmosphere.id, null);
    setAtmoFontPref(atmosphere.id, "display", null);
    setAtmoFontPref(atmosphere.id, "body", null);
    refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Atmosphere settings
          </div>
          <DialogTitle
            className="font-display text-2xl font-semibold leading-tight"
            style={{ fontFamily: `'${atmosphere.fontDisplay}', serif` }}
          >
            {atmosphere.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{atmosphere.tagline}</p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Chime */}
          <section className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Completion chime</Label>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={chimeOverride ?? "__default"}
                onValueChange={(v) => {
                  const next = v === "__default" ? null : (v as ChimePresetKey);
                  setChimeOverride(atmosphere.id, next);
                  if (next) playChimePreset(next); else playChimeFor(atmosphere.id);
                  refresh();
                }}
              >
                <SelectTrigger className="h-9 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default">
                    Default ({CHIME_PRESETS[ATMOSPHERE_DEFAULT_CHIME[atmosphere.id]].label})
                  </SelectItem>
                  {CHIME_PRESET_LIST.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline" size="sm" className="gap-1.5"
                onClick={() => playChimeFor(atmosphere.id)}
              >
                <Play className="h-3.5 w-3.5" /> Preview
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {CHIME_PRESETS[effectiveChime]?.description}
            </p>
          </section>

          {/* Fonts */}
          <section className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Typography</Label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Display font</Label>
              <Select
                value={displayOverride ?? "__default"}
                onValueChange={(v) => {
                  setAtmoFontPref(atmosphere.id, "display", v === "__default" ? null : v);
                  refresh();
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default">Default ({atmosphere.fontDisplay})</SelectItem>
                  {displayFonts.map((f) => (
                    <SelectItem key={f.id} value={f.id} style={{ fontFamily: f.family }}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Body font</Label>
              <Select
                value={bodyOverride ?? "__default"}
                onValueChange={(v) => {
                  setAtmoFontPref(atmosphere.id, "body", v === "__default" ? null : v);
                  refresh();
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default">Default ({atmosphere.fontBody})</SelectItem>
                  {bodyFonts.map((f) => (
                    <SelectItem key={f.id} value={f.id} style={{ fontFamily: f.family }}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className="rounded-lg border border-border/50 bg-background/40 p-3"
              style={{
                fontFamily: (() => {
                  const id = displayOverride ?? null;
                  const opt = id ? FONT_OPTIONS.find((o) => o.id === id) : null;
                  return opt?.family ?? `'${atmosphere.fontDisplay}', serif`;
                })(),
              }}
            >
              <div className="text-lg font-semibold">The quiet bloom of morning.</div>
              <div
                className="mt-1 text-xs text-muted-foreground"
                style={{
                  fontFamily: (() => {
                    const id = bodyOverride ?? null;
                    const opt = id ? FONT_OPTIONS.find((o) => o.id === id) : null;
                    return opt?.family ?? `'${atmosphere.fontBody}', sans-serif`;
                  })(),
                }}
              >
                A soft, supportive rhythm for the day ahead.
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={resetAll}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}