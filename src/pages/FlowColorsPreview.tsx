import { Link } from "react-router-dom";
import { ATMOSPHERES, useAtmosphere, setAtmosphere } from "@/lib/atmospheres";
import { NAV_GROUPS } from "@/lib/nav";
import { FLOW_PALETTE_INDEX, getFlowAccent } from "@/lib/flow-accent";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FlowColorsPreview() {
  const { current } = useAtmosphere();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:py-10">
      <header className="mb-6 flex items-start gap-3">
        <Link
          to="/settings"
          className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Back to Settings"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">Flow colors across atmospheres</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview how each Flow header recolors under every atmosphere. Apply one to see the rest of the app retint.
          </p>
        </div>
      </header>

      <div className="space-y-6">
        {ATMOSPHERES.map((atm) => {
          const isActive = current === atm.id;
          return (
            <section
              key={atm.id}
              className={cn(
                "rounded-2xl border bg-card p-4 md:p-5 transition-shadow",
                isActive && "ring-2 ring-primary/40",
              )}
            >
              {/* Atmosphere header */}
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold tracking-tight">{atm.name}</h2>
                  <p className="text-xs text-muted-foreground">{atm.tagline}</p>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? "secondary" : "default"}
                  className="gap-1.5"
                  onClick={() => setAtmosphere(atm.id)}
                >
                  {isActive ? <><Check className="h-3.5 w-3.5" /> Active</> : "Apply"}
                </Button>
              </div>

              {/* Palette swatches with flow markers */}
              <div className="mt-3 flex flex-wrap gap-2">
                {atm.palette.map((hex, i) => {
                  const usedBy = Object.entries(FLOW_PALETTE_INDEX)
                    .filter(([, idx]) => {
                      const len = atm.palette.length;
                      let resolved = idx >= len ? idx % len : idx;
                      if (len > 2 && resolved === 2) resolved = (resolved + 1) % len;
                      return resolved === i;
                    })
                    .map(([id]) => id);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="h-10 w-10 rounded-lg ring-1 ring-border"
                        style={{ background: hex }}
                        title={`${hex} (swatch ${i})`}
                      />
                      <span className="text-[10px] text-muted-foreground">#{i}</span>
                      {usedBy.length > 0 && (
                        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                          {usedBy.length}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Flow header chips */}
              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {NAV_GROUPS.map((group) => {
                  const accent = getFlowAccent(group.id, atm);
                  const GroupIcon = group.icon;
                  return (
                    <li key={group.id}>
                      <div
                        className="overflow-hidden rounded-xl border"
                        style={{ borderColor: accent.ring }}
                      >
                        {/* gradient banner */}
                        <div
                          className="h-6 w-full"
                          style={{
                            background: `linear-gradient(135deg, ${accent.gradient}, transparent)`,
                          }}
                          aria-hidden
                        />
                        <div className="flex items-center gap-2 bg-card px-3 py-2.5">
                          <span
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
                            style={{
                              background: accent.soft,
                              boxShadow: `inset 0 0 0 1px ${accent.ring}`,
                              color: accent.color,
                            }}
                            aria-hidden
                          >
                            <GroupIcon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate font-display text-sm font-semibold tracking-tight"
                              style={{ color: accent.color }}
                            >
                              {group.label}
                            </div>
                            {(group as any).subtitle && (
                              <div className="truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                {(group as any).subtitle}
                              </div>
                            )}
                          </div>
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-mono"
                            style={{ background: accent.soft, color: accent.color }}
                            title={`palette index ${FLOW_PALETTE_INDEX[group.id] ?? 0}`}
                          >
                            #{FLOW_PALETTE_INDEX[group.id] ?? 0}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}