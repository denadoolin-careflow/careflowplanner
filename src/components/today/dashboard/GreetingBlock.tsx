import { useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { personalGreeting, resolveDisplayName } from "@/lib/greeting";
import { useWeatherSnapshot, formatTemp } from "@/lib/weather-store";
import { AFFIRMATIONS } from "@/lib/affirmations";
import { CloudSun, ImagePlus } from "lucide-react";
import { HeaderImagePicker } from "@/components/common/HeaderImagePicker";
import { useHeaderImage } from "@/lib/header-image";
import { cn } from "@/lib/utils";

function timeEmoji(h: number) {
  if (h < 5) return "🌙";
  if (h < 12) return "🌅";
  if (h < 17) return "☀️";
  if (h < 21) return "🌇";
  return "🌙";
}

export function GreetingBlock({ date, pageKey = "today" }: { date: Date; pageKey?: string }) {
  const { state } = useStore();
  const snap = useWeatherSnapshot();
  const name = resolveDisplayName(state.settings.name, state.settings.email);
  const now = new Date();
  const header = useHeaderImage(pageKey);
  const quote = useMemo(
    () => AFFIRMATIONS[Math.abs(Number(format(date, "yyyyMMdd"))) % AFFIRMATIONS.length],
    [date],
  );

  return (
    <section className={cn(
      "group relative overflow-hidden rounded-3xl border border-border/40 p-6 shadow-soft backdrop-blur-xl",
      !header.url && "bg-gradient-to-br from-primary-soft/60 via-card/70 to-warm-soft/60",
    )}>
      {header.url && (
        <>
          <img src={header.url} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/80 to-background/45" />
        </>
      )}
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Today</p>
        <HeaderImagePicker
          value={header.raw}
          onChange={(v) => header.set(v)}
          trigger={
            <button
              type="button"
              aria-label="Change header image"
              className="rounded-full border border-border/50 bg-card/70 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </button>
          }
        />
      </div>
      <h1 className="mt-1 font-display text-2xl font-semibold leading-tight sm:text-3xl">
        <span className="mr-2">{timeEmoji(now.getHours())}</span>
        {personalGreeting(name, now)}
      </h1>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{format(date, "EEEE, MMMM d")}</span>
        <span aria-hidden>·</span>
        <span>{format(now, "h:mm a")}</span>
        {snap && (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <CloudSun className="h-3.5 w-3.5" aria-hidden />
              {formatTemp(snap.tempC)} {snap.conditionLabel}
            </span>
          </>
        )}
      </p>
      <p className="mt-3 max-w-xl text-[13px] italic text-foreground/75">{quote}</p>
      </div>
    </section>
  );
}