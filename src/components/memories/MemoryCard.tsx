import { useEffect, useState } from "react";
import { Heart, Pin, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { memoryTypeMeta, type Memory } from "@/lib/memories";
import { cn } from "@/lib/utils";

export function useSignedUrl(path: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let cancel = false;
    supabase.storage.from("attachments").createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (!cancel) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancel = true; };
  }, [path]);
  return url;
}

export function MemoryCard({ memory, onClick, variant = "gallery" }: {
  memory: Memory;
  onClick?: () => void;
  variant?: "gallery" | "compact";
}) {
  const meta = memoryTypeMeta(memory.memoryType);
  const cover = memory.attachments?.[memory.coverIndex ?? 0] ?? memory.attachments?.[0];
  const url = useSignedUrl(cover?.path);

  if (variant === "compact") {
    return (
      <button
        onClick={onClick}
        className="group flex w-full items-center gap-3 rounded-xl border border-[hsl(0_30%_88%/0.6)] bg-[hsl(20_60%_98%/0.6)] p-3 text-left transition hover:border-[hsl(350_55%_70%)] hover:shadow-sm"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[hsl(20_50%_94%)] text-xl">
          {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <span>{meta.emoji}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{memory.title}</span>
            {memory.isFavorite && <Heart className="h-3 w-3 fill-[hsl(350_55%_60%)] text-[hsl(350_55%_60%)]" />}
            {memory.isPinned && <Pin className="h-3 w-3 fill-[hsl(20_60%_55%)] text-[hsl(20_60%_55%)]" />}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {meta.emoji} {meta.label} · {format(parseISO(memory.date), "MMM d, yyyy")}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative block w-full overflow-hidden rounded-3xl border border-[hsl(0_30%_88%/0.5)] bg-[hsl(20_60%_98%/0.6)] text-left shadow-[0_2px_20px_-12px_hsl(350_60%_40%/0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_hsl(350_60%_40%/0.4)]"
      )}
    >
      {url ? (
        <div className="relative">
          <img src={url} alt={memory.title} loading="lazy"
            className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            style={{ aspectRatio: "auto" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider opacity-90">
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
              {memory.isPinned && <Pin className="h-3 w-3 fill-current" />}
            </div>
            <div className="font-display text-lg leading-tight drop-shadow">{memory.title}</div>
            <div className="mt-0.5 text-[11px] opacity-90">{format(parseISO(memory.date), "MMMM d, yyyy")}</div>
          </div>
          {memory.isFavorite && (
            <Heart className="absolute right-3 top-3 h-5 w-5 fill-[hsl(350_55%_60%)] text-[hsl(350_55%_60%)] drop-shadow" />
          )}
        </div>
      ) : (
        <div className="space-y-2 p-5">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[hsl(350_45%_45%)]">
            <span className="text-base">{meta.emoji}</span>
            <span>{meta.label}</span>
            {memory.isFavorite && <Heart className="h-3 w-3 fill-[hsl(350_55%_60%)] text-[hsl(350_55%_60%)]" />}
            {memory.isPinned && <Pin className="h-3 w-3 fill-[hsl(20_60%_55%)] text-[hsl(20_60%_55%)]" />}
          </div>
          <div className="font-display text-xl leading-tight">{memory.title}</div>
          {memory.description && (
            <p className="line-clamp-4 text-sm text-muted-foreground">{memory.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{format(parseISO(memory.date), "MMM d, yyyy")}</span>
            {memory.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{memory.location}</span>}
            {memory.moonPhase && <span>🌙 {memory.moonPhase}</span>}
          </div>
          {memory.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {memory.tags.slice(0, 4).map((t) => (
                <span key={t} className="rounded-full bg-[hsl(20_50%_94%)] px-2 py-0.5 text-[10px] text-[hsl(20_50%_30%)]">#{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  );
}