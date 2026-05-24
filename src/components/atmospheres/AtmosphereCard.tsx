import { Star, Check } from "lucide-react";
import { Atmosphere, AtmosphereId } from "@/lib/atmospheres";
import { cn } from "@/lib/utils";

export function AtmosphereCard({
  atmosphere, isActive, isFavorite, onApply, onToggleFavorite,
}: {
  atmosphere: Atmosphere;
  isActive: boolean;
  isFavorite: boolean;
  onApply: (id: AtmosphereId) => void;
  onToggleFavorite: (id: AtmosphereId) => void;
}) {
  const [c1, c2, c3, c4, c5, c6] = [...atmosphere.palette, atmosphere.palette[0]];
  const gradient = `linear-gradient(140deg, ${c3 ?? c1} 0%, ${c1} 45%, ${c4 ?? c2} 100%)`;
  return (
    <button
      type="button"
      onClick={() => onApply(atmosphere.id)}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border text-left transition-all",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-cozy)]",
        isActive ? "border-primary/60 ring-2 ring-primary/40" : "border-border/60"
      )}
    >
      {/* Preview gradient */}
      <div className="relative h-28 w-full" style={{ background: gradient }}>
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background: `radial-gradient(60% 50% at 25% 20%, ${c4 ?? c2}55, transparent 70%), radial-gradient(50% 40% at 85% 90%, ${c5 ?? c2}66, transparent 70%)`,
          }}
        />
        <div className="absolute left-3 top-3 flex gap-1">
          {atmosphere.palette.slice(0, 5).map((c, i) => (
            <span key={i} className="h-3.5 w-3.5 rounded-full ring-2 ring-white/40" style={{ background: c }} />
          ))}
        </div>
        <button
          type="button"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(atmosphere.id); }}
          className="absolute right-2 top-2 rounded-full bg-black/20 p-1.5 text-white backdrop-blur-md transition hover:bg-black/30"
        >
          <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-amber-300 text-amber-300")} />
        </button>
        {isActive && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-medium text-foreground">
            <Check className="h-3 w-3" /> Active
          </span>
        )}
      </div>
      <div className="space-y-1.5 bg-card/80 p-3 backdrop-blur-sm">
        <div className="flex items-baseline justify-between gap-2">
          <h4
            className="truncate text-sm font-semibold"
            style={{ fontFamily: `'${atmosphere.fontDisplay}', serif` }}
          >
            {atmosphere.name}
          </h4>
        </div>
        <p
          className="line-clamp-2 text-[11px] text-muted-foreground"
          style={{ fontFamily: `'${atmosphere.fontBody}', sans-serif` }}
        >
          {atmosphere.tagline}
        </p>
        <div className="flex flex-wrap gap-1 pt-0.5">
          {atmosphere.mood.slice(0, 3).map(m => (
            <span key={m} className="rounded-full bg-muted px-1.5 py-px text-[9px] uppercase tracking-wider text-muted-foreground">
              {m}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}