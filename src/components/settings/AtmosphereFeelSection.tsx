import { useEffect, useState } from "react";
import { Play, Volume2, Wand2 } from "lucide-react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ATMOSPHERES, useAtmosphere } from "@/lib/atmospheres";
import {
  isCompletionSoundEnabled, setCompletionSoundEnabled,
  getChimeVolume, setChimeVolume,
  CHIME_PRESET_LIST, CHIME_PRESETS,
  ATMOSPHERE_DEFAULT_CHIME,
  getChimeOverride, setChimeOverride,
  playChimeFor, playChimePreset,
  type ChimePresetKey,
} from "@/lib/completion-sound";
import {
  COMPLETION_VISUALS, getCompletionVisual, setCompletionVisual,
  type CompletionVisualKey,
} from "@/lib/completion-visual";
import { CompletionBurst } from "@/components/cards/CompletionBurst";
import { useState as useStateReact } from "react";

type Intensity = "off" | "subtle" | "full";
const ANIM_KEY = "careflow:atmo-anim";
const SCALE: Record<Intensity, number> = { off: 0, subtle: 0.5, full: 1 };

export function readAnimIntensity(): Intensity {
  try {
    const v = localStorage.getItem(ANIM_KEY) as Intensity | null;
    return v === "off" || v === "subtle" || v === "full" ? v : "full";
  } catch { return "full"; }
}
export function applyAnimIntensity(v: Intensity) {
  if (typeof document === "undefined") return;
  document.body.setAttribute("data-anim", v);
  document.documentElement.style.setProperty("--atmo-anim-scale", String(SCALE[v]));
}

export function AtmosphereFeelSection() {
  const { current } = useAtmosphere();
  const [enabled, setEnabled] = useState(isCompletionSoundEnabled());
  const [volume, setVolume] = useState(Math.round(getChimeVolume() * 100));
  const [intensity, setIntensity] = useState<Intensity>(readAnimIntensity());
  const [visual, setVisual] = useState<CompletionVisualKey>(getCompletionVisual());
  const [previewKey, setPreviewKey] = useStateReact(0);
  const [overrides, setOverrides] = useState<Record<string, ChimePresetKey | "">>(() => {
    const o: Record<string, ChimePresetKey | ""> = {};
    for (const a of ATMOSPHERES) o[a.id] = getChimeOverride(a.id) ?? "";
    return o;
  });

  useEffect(() => { applyAnimIntensity(intensity); try { localStorage.setItem(ANIM_KEY, intensity); } catch {} }, [intensity]);

  return (
    <SectionCard
      title="Atmosphere feel"
      subtitle="Each atmosphere gets its own completion chime and ambient motion."
      accent="calm"
    >
      <div className="space-y-6">
        {/* Sound toggle + volume */}
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Completion sound</Label>
            </div>
            <Switch checked={enabled} onCheckedChange={(c) => { setEnabled(c); setCompletionSoundEnabled(c); }} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Volume {volume}%</Label>
            <Slider
              value={[volume]} min={0} max={100} step={5}
              onValueChange={(v) => { setVolume(v[0]); setChimeVolume(v[0] / 100); }}
              disabled={!enabled}
            />
          </div>
          <Button
            variant="outline" size="sm" className="gap-2"
            onClick={() => playChimeFor(current)}
            disabled={!enabled}
          >
            <Play className="h-3.5 w-3.5" /> Preview current atmosphere
          </Button>
        </div>

        {/* Per-atmosphere chime */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Per-atmosphere chime
          </Label>
          <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
            {ATMOSPHERES.map((a) => {
              const ov = overrides[a.id] || "";
              const effective = (ov || ATMOSPHERE_DEFAULT_CHIME[a.id]) as ChimePresetKey;
              const isActive = current === a.id;
              return (
                <li key={a.id} className="flex items-center gap-2 p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {a.name}
                      {isActive && (
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {CHIME_PRESETS[effective]?.description}
                    </div>
                  </div>
                  <Select
                    value={ov || "__default"}
                    onValueChange={(v) => {
                      const next = v === "__default" ? null : (v as ChimePresetKey);
                      setChimeOverride(a.id, next);
                      setOverrides((o) => ({ ...o, [a.id]: (next ?? "") as any }));
                      if (next) playChimePreset(next); else playChimeFor(a.id);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[150px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default">
                        Default ({CHIME_PRESETS[ATMOSPHERE_DEFAULT_CHIME[a.id]].label})
                      </SelectItem>
                      {CHIME_PRESET_LIST.map((p) => (
                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    aria-label={`Play ${a.name} chime`}
                    onClick={() => playChimeFor(a.id)}
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Completion visualization */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Completion visualization
          </Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COMPLETION_VISUALS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => {
                  setVisual(v.key);
                  setCompletionVisual(v.key);
                  setPreviewKey((k) => k + 1);
                }}
                className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition ${
                  visual === v.key
                    ? "border-primary/60 bg-primary/10"
                    : "border-border/60 bg-card/40 hover:bg-muted/40"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span>{v.emoji}</span> {v.label}
                </span>
                <span className="text-[11px] text-muted-foreground">{v.description}</span>
              </button>
            ))}
          </div>
          <div className="relative mt-2 h-14 overflow-hidden rounded-xl border border-border/60 bg-card/40">
            <div className="grid h-full place-items-center text-xs text-muted-foreground">
              Preview
            </div>
            {/* Re-mount with key to replay animation */}
            <span key={previewKey} className="absolute inset-0">
              <CompletionBurst variant={visual} />
            </span>
          </div>
        </div>

        {/* Animation intensity */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ambient animation
          </Label>
          <div className="flex flex-wrap gap-2">
            {(["off", "subtle", "full"] as Intensity[]).map((v) => (
              <Button
                key={v}
                variant={intensity === v ? "default" : "outline"}
                size="sm"
                className="rounded-full capitalize"
                onClick={() => setIntensity(v)}
              >
                {v === "full" && <Wand2 className="mr-1 h-3.5 w-3.5" />}
                {v}
              </Button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Each atmosphere has its own gradient motion — breath, drift, tide, pulse, and more.
            Set to Off to honor reduced-motion preferences.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}