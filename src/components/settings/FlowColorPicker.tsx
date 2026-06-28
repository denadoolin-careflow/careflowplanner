import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, RotateCcw, Palette, ChevronDown } from "lucide-react";
import { useState } from "react";
import { ATMOSPHERES, useAtmosphere, setAtmosphere } from "@/lib/atmospheres";
import { FLOW_PALETTE_INDEX, getFlowAccent } from "@/lib/flow-accent";
import {
  setFlowColorOverride,
  useFlowColorOverrides,
  clearFlowColorOverrides,
} from "@/lib/flow-color-prefs";
import { NAV_GROUPS } from "@/lib/nav";

/** Friendly labels for ids that aren't in NAV_GROUPS. */
const EXTRA: Array<{ id: string; label: string }> = [
  { id: "settings", label: "Settings" },
];

export function FlowColorPicker() {
  const { atmosphere, current } = useAtmosphere();
  const overrides = useFlowColorOverrides();
  const [galleryOpen, setGalleryOpen] = useState(false);

  const flows: Array<{ id: string; label: string; emoji?: string }> = [
    ...NAV_GROUPS
      .filter((g) => FLOW_PALETTE_INDEX[g.id] !== undefined)
      .map((g) => ({ id: g.id, label: g.label, emoji: g.emoji })),
    ...EXTRA.filter((e) => !NAV_GROUPS.some((g) => g.id === e.id)),
  ];

  return (
    <SectionCard
      title="Flow colors"
      subtitle={`Tint each Flow with a swatch from "${atmosphere.name}", or compare every atmosphere below. Changes update live across the app.`}
      accent="sage"
    >
      <div className="space-y-2.5">
        {flows.map((f) => {
          const defaultIdx = FLOW_PALETTE_INDEX[f.id] ?? 0;
          const currentIdx = overrides[f.id] ?? defaultIdx;
          const accent = getFlowAccent(f.id, atmosphere, overrides);
          const isCustom = overrides[f.id] !== undefined && overrides[f.id] !== defaultIdx;
          return (
            <div
              key={f.id}
              className="rounded-2xl border border-border/60 bg-card/60 p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="grid h-7 w-7 place-items-center rounded-full ring-1"
                  style={{ backgroundColor: accent.soft, color: accent.color, boxShadow: `inset 0 0 0 1px ${accent.ring}` }}
                  aria-hidden
                >
                  <Palette className="h-3.5 w-3.5" />
                </span>
                <div className="flex-1 truncate text-sm font-medium">
                  {f.emoji ? `${f.emoji} ` : ""}{f.label}
                </div>
                {isCustom && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 rounded-full px-2 text-[11.5px] text-muted-foreground hover:text-foreground"
                    onClick={() => setFlowColorOverride(f.id, null)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {atmosphere.palette.map((hex, i) => {
                  const selected = i === currentIdx;
                  const isDefault = i === defaultIdx;
                  return (
                    <button
                      key={`${hex}-${i}`}
                      type="button"
                      onClick={() => setFlowColorOverride(f.id, i === defaultIdx ? null : i)}
                      className={cn(
                        "relative grid h-8 w-8 place-items-center rounded-full ring-1 ring-border/40 transition",
                        selected && "ring-2 ring-foreground/70 scale-110",
                      )}
                      style={{ backgroundColor: hex }}
                      aria-label={`Swatch ${i + 1}${isDefault ? " (default)" : ""}`}
                      aria-pressed={selected}
                    >
                      {selected && (
                        <Check className="h-3.5 w-3.5" style={{ color: readableOn(hex) }} />
                      )}
                      {isDefault && !selected && (
                        <span
                          className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-foreground/60"
                          aria-hidden
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {Object.keys(overrides).length > 0 && (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-full text-[12px]"
              onClick={() => clearFlowColorOverrides()}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset all flow colors
            </Button>
          </div>
        )}
        <p className="pt-1 text-[11px] text-muted-foreground">
          A dot under a swatch marks each flow's default. Swatches come from the active atmosphere — change it under "Atmosphere & feel" above.
        </p>

        {/* Compare atmospheres gallery */}
        <div className="pt-3">
          <button
            type="button"
            onClick={() => setGalleryOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 text-sm font-medium hover:bg-muted/60 transition-colors"
            aria-expanded={galleryOpen}
          >
            <span className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Compare atmospheres
            </span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", galleryOpen && "rotate-180")} />
          </button>

          {galleryOpen && (
            <div className="mt-3 space-y-3">
              <p className="text-[11px] text-muted-foreground">
                See how each Flow tints under every atmosphere. Tap <em>Apply</em> to switch — then use the pickers above to override any Flow's swatch.
              </p>
              {ATMOSPHERES.map((atm) => {
                const isActive = current === atm.id;
                return (
                  <div
                    key={atm.id}
                    className={cn(
                      "rounded-2xl border border-border/60 bg-card/60 p-3 transition-shadow",
                      isActive && "ring-2 ring-primary/40",
                    )}
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display text-sm font-semibold tracking-tight">{atm.name}</h4>
                        <p className="text-[11px] text-muted-foreground">{atm.tagline}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={isActive ? "secondary" : "default"}
                        className="h-7 gap-1.5 rounded-full px-2.5 text-[11.5px]"
                        onClick={() => setAtmosphere(atm.id)}
                      >
                        {isActive ? (<><Check className="h-3 w-3" /> Active</>) : "Apply"}
                      </Button>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {atm.palette.map((hex, i) => (
                        <div
                          key={`${atm.id}-sw-${i}`}
                          className="h-6 w-6 rounded-md ring-1 ring-border/50"
                          style={{ background: hex }}
                          title={`${hex} (swatch ${i})`}
                        />
                      ))}
                    </div>

                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {NAV_GROUPS.filter((g) => FLOW_PALETTE_INDEX[g.id] !== undefined).map((group) => {
                        const accent = getFlowAccent(group.id, atm, isActive ? overrides : undefined);
                        const GroupIcon = group.icon;
                        return (
                          <li key={`${atm.id}-${group.id}`}>
                            <div
                              className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5"
                              style={{ borderColor: accent.ring }}
                            >
                              <span
                                className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
                                style={{
                                  background: accent.soft,
                                  boxShadow: `inset 0 0 0 1px ${accent.ring}`,
                                  color: accent.color,
                                }}
                                aria-hidden
                              >
                                <GroupIcon className="h-3.5 w-3.5" />
                              </span>
                              <span
                                className="min-w-0 flex-1 truncate font-display text-[12.5px] font-semibold tracking-tight"
                                style={{ color: accent.color }}
                              >
                                {group.label}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function readableOn(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 165 ? "#1a1a1a" : "#ffffff";
}