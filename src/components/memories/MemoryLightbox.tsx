import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Edit, Heart, MapPin, Pin, Play, Pause } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Memory } from "@/lib/memories";
import { memoryTypeMeta, updateMemory } from "@/lib/memories";
import type { LovedOne } from "@/lib/loved-ones";
import { useStore } from "@/lib/store";

interface Props {
  memories: Memory[];
  index: number;
  onIndexChange: (i: number) => void;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: (m: Memory) => void;
  onUpdated: (m: Memory) => void;
  lovedOnes: LovedOne[];
}

export function MemoryLightbox({ memories, index, onIndexChange, open, onOpenChange, onEdit, onUpdated, lovedOnes }: Props) {
  const { state } = useStore();
  const memory = memories[index];
  const [photoIdx, setPhotoIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => { setPhotoIdx(0); }, [index]);

  useEffect(() => {
    if (!memory) return;
    const needed = memory.attachments.filter((a) => !urls[a.id]);
    if (!needed.length) return;
    (async () => {
      const next: Record<string, string> = {};
      await Promise.all(needed.map(async (a) => {
        const { data } = await supabase.storage.from("attachments").createSignedUrl(a.path, 3600);
        if (data?.signedUrl) next[a.id] = data.signedUrl;
      }));
      setUrls((p) => ({ ...p, ...next }));
    })();
  }, [memory?.id]);

  // Slideshow timer
  useEffect(() => {
    if (!open || !playing) return;
    const t = setInterval(() => {
      onIndexChange((index + 1) % memories.length);
    }, 4000);
    return () => clearInterval(t);
  }, [open, playing, index, memories.length, onIndexChange]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndexChange(Math.min(memories.length - 1, index + 1));
      else if (e.key === "ArrowLeft") onIndexChange(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, index, memories.length, onIndexChange]);

  const people = useMemo(() => {
    if (!memory) return [];
    const r = (state.recipients ?? []).filter((x) => memory.recipientIds.includes(x.id))
      .map((x) => ({ id: x.id, name: x.name, emoji: undefined as string | undefined }));
    const l = lovedOnes.filter((x) => memory.lovedOneIds.includes(x.id))
      .map((x) => ({ id: x.id, name: x.name, emoji: x.avatarEmoji }));
    return [...r, ...l];
  }, [memory, state.recipients, lovedOnes]);

  if (!memory) return null;
  const meta = memoryTypeMeta(memory.memoryType);
  const photos = memory.attachments;
  const cur = photos[photoIdx];
  const curUrl = cur ? urls[cur.id] : null;

  const toggleFavorite = async () => {
    const upd = await updateMemory(memory.id, { isFavorite: !memory.isFavorite });
    onUpdated(upd);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-5xl overflow-hidden bg-card/95 p-0 backdrop-blur">
        <div className="grid md:grid-cols-[1.4fr,1fr]">
          <div className="relative min-h-[40vh] bg-[hsl(20_30%_10%)]">
            {curUrl ? (
              <img src={curUrl} alt={memory.title} className="h-full max-h-[80vh] w-full object-contain" />
            ) : (
              <div className="flex h-full min-h-[40vh] items-center justify-center text-7xl">{meta.emoji}</div>
            )}
            {photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] text-white">
                  {photoIdx + 1} / {photos.length}
                </div>
              </>
            )}
          </div>

          <div className="max-h-[80vh] overflow-y-auto p-6">
            <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wider text-[hsl(350_45%_45%)]">
              <span>{meta.emoji}</span><span>{meta.label}</span>
            </div>
            <h2 className="font-display text-2xl leading-tight">{memory.title}</h2>
            <div className="mt-1 text-xs text-muted-foreground">
              {format(parseISO(memory.date), "EEEE, MMMM d, yyyy")}
              {memory.time && <> · {memory.time}</>}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={toggleFavorite}>
                <Heart className={`mr-1.5 h-3.5 w-3.5 ${memory.isFavorite ? "fill-[hsl(350_55%_60%)] text-[hsl(350_55%_60%)]" : ""}`} />
                {memory.isFavorite ? "Favorited" : "Favorite"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(memory)}>
                <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
              {memories.length > 1 && (
                <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)}>
                  {playing ? <Pause className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                  {playing ? "Pause" : "Slideshow"}
                </Button>
              )}
            </div>

            {memory.description && <p className="mt-4 text-sm leading-relaxed text-foreground/90">{memory.description}</p>}

            {(memory.meaningfulNote || memory.rememberNote || memory.beautifulNote || memory.challengingNote) && (
              <div className="mt-4 space-y-2 rounded-2xl border border-[hsl(0_30%_88%/0.6)] bg-[hsl(20_60%_98%/0.7)] p-3">
                {memory.meaningfulNote && <Reflection label="What made this meaningful" body={memory.meaningfulNote} />}
                {memory.rememberNote && <Reflection label="What I want to remember" body={memory.rememberNote} />}
                {memory.beautifulNote && <Reflection label="What felt beautiful" body={memory.beautifulNote} />}
                {memory.challengingNote && <Reflection label="What felt challenging" body={memory.challengingNote} />}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {memory.mood && <Meta label="Mood" value={memory.mood} />}
              {memory.location && <Meta label="Location" value={memory.location} icon={<MapPin className="h-3 w-3" />} />}
              {memory.moonPhase && <Meta label="Moon" value={memory.moonPhase} />}
              {memory.season && <Meta label="Season" value={memory.season} />}
            </div>

            {people.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">With</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {people.map((p) => (
                    <span key={p.id} className="rounded-full bg-[hsl(350_45%_92%)] px-2.5 py-0.5 text-xs text-[hsl(350_45%_30%)]">
                      {p.emoji ?? "💛"} {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {memory.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {memory.tags.map((t) => (
                  <span key={t} className="rounded-full bg-[hsl(20_50%_94%)] px-2 py-0.5 text-[10px] text-[hsl(20_50%_30%)]">#{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        {memories.length > 1 && (
          <div className="flex items-center justify-between border-t border-border/40 bg-card px-3 py-2">
            <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => onIndexChange(index - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground">{index + 1} of {memories.length}</span>
            <Button size="sm" variant="ghost" disabled={index === memories.length - 1} onClick={() => onIndexChange(index + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Reflection({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[hsl(350_45%_45%)]">{label}</div>
      <div className="text-sm leading-relaxed">{body}</div>
    </div>
  );
}
function Meta({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1 text-xs">{icon}{value}</div>
    </div>
  );
}