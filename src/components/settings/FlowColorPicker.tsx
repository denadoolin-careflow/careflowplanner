import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, RotateCcw, Palette } from "lucide-react";
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
  // { atmosphereId: flowId } — only one open editor at a time
  const [openEditor, setOpenEditor] = useState<{ atm: string; flow: string } | null>(null);

  const flows: Array<{ id: string; label: string; emoji?: string }> = [
    ...NAV_GROUPS
      .filter((g) => FLOW_PALETTE_INDEX[g.id] !== undefined)
      .map((g) => ({ id: g.id, label: g.label, emoji: g.emoji })),
    ...EXTRA.filter((e) => !NAV_GROUPS.some((g) => g.id === e.id)),
  ];

  return (
    <SectionCard
      title="Flow colors"
      subtitle="Compare every atmosphere and tap any Flow chip to pick its color. Changes update live across the app."
      accent="sage"
    >
      <div className="space-y-3">
        {Object.keys(overrides).length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-3 py-2">
            <span className="text-[11.5px] text-muted-foreground">
              {Object.keys(overrides).length} flow color{Object.keys(overrides).length === 1 ? "" : "s"} customized
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-full text-[11.5px]"
              onClick={() => clearFlowColorOverrides()}
            >
              <RotateCcw className="h-3 w-3" /> Reset all
            </Button>
          </div>
        )}

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
                {flows.map((f) => {
                  const GroupIcon = NAV_GROUPS.find((g) => g.id === f.id)?.icon;
                  const accent = getFlowAccent(f.id, atm, isActive ? overrides : undefined);
                  const defaultIdx = FLOW_PALETTE_INDEX[f.id] ?? 0;
                  const currentIdx = isActive ? (overrides[f.id] ?? defaultIdx) : defaultIdx;
                  const isCustom = isActive && overrides[f.id] !== undefined && overrides[f.id] !== defaultIdx;
                  const isOpen = openEditor?.atm === atm.id && openEditor?.flow === f.id;
                  return (
                    <li key={`${atm.id}-${f.id}`}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isActive) {
                            setAtmosphere(atm.id);
                            setOpenEditor({ atm: atm.id, flow: f.id });
                          } else {
                            setOpenEditor(isOpen ? null : { atm: atm.id, flow: f.id });
                          }
                        }}
                        className="flex w-full items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-left transition hover:bg-muted/40"
                        style={{ borderColor: accent.ring }}
                        aria-expanded={isOpen}
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
                          {GroupIcon ? <GroupIcon className="h-3.5 w-3.5" /> : <Palette className="h-3.5 w-3.5" />}
                        </span>
                        <span
                          className="min-w-0 flex-1 truncate font-display text-[12.5px] font-semibold tracking-tight"
                          style={{ color: accent.color }}
                        >
                          {f.emoji ? `${f.emoji} ` : ""}{f.label}
                        </span>
                        {isCustom && (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">custom</span>
                        )}
                      </button>

                      {isOpen && isActive && (
                        <div className="mt-1.5 rounded-lg border border-border/60 bg-background/60 p-2">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">Choose a swatch</span>
                            {isCustom && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 gap-1 rounded-full px-2 text-[10.5px] text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFlowColorOverride(f.id, null);
                                }}
                              >
                                <RotateCcw className="h-3 w-3" /> Reset
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {atm.palette.map((hex, i) => {
                              const selected = i === currentIdx;
                              const isDef = i === defaultIdx;
                              return (
                                <button
                                  key={`${atm.id}-${f.id}-sw-${i}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFlowColorOverride(f.id, i === defaultIdx ? null : i);
                                  }}
                                  className={cn(
                                    "relative grid h-7 w-7 place-items-center rounded-full ring-1 ring-border/40 transition",
                                    selected && "ring-2 ring-foreground/70 scale-110",
                                  )}
                                  style={{ backgroundColor: hex }}
                                  aria-label={`Swatch ${i + 1}${isDef ? " (default)" : ""}`}
                                  aria-pressed={selected}
                                >
                                  {selected && (
                                    <Check className="h-3 w-3" style={{ color: readableOn(hex) }} />
                                  )}
                                  {isDef && !selected && (
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
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <p className="text-[11px] text-muted-foreground">
          Tap any Flow chip to pick its swatch from that atmosphere. Selecting a chip on an inactive atmosphere applies it first, then opens the picker.
        </p>
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