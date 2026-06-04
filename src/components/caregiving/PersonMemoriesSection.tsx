import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Camera, BookHeart, Sparkles, Plus, ImageOff } from "lucide-react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { listMemories, type Memory } from "@/lib/memories";
import { listLovedOnes, type LovedOne } from "@/lib/loved-ones";
import { useStore } from "@/lib/store";
import type { CareRecipient, JournalEntry } from "@/lib/types";
import { MemoryCard } from "@/components/memories/MemoryCard";
import { MemoryEditor } from "@/components/memories/MemoryEditor";
import { MemoryLightbox } from "@/components/memories/MemoryLightbox";
import {
  attachmentsForRecipient,
  journalsForRecipient,
  memoriesForRecipient,
} from "@/lib/person-memories";

function useSignedThumb(path: string | undefined) {
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

function PhotoTile({
  path,
  kind,
  onClick,
}: { path: string; kind: string; onClick: () => void }) {
  const url = useSignedThumb(path);
  const isImage = kind?.startsWith("image");
  return (
    <button
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border/40 transition hover:ring-primary/60"
    >
      {url && isImage ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-muted-foreground">
          <ImageOff className="h-5 w-5" />
        </div>
      )}
    </button>
  );
}

export function PersonMemoriesSection({ recipient }: { recipient: CareRecipient }) {
  const { state } = useStore();
  const navigate = useNavigate();

  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number; list: Memory[] }>({ open: false, index: 0, list: [] });

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    Promise.all([listMemories(), listLovedOnes()])
      .then(([m, l]) => {
        if (cancel) return;
        setMemories(m);
        setLovedOnes(l);
      })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  const personMemories = useMemo(
    () => memoriesForRecipient(memories ?? [], recipient.id),
    [memories, recipient.id],
  );
  const personJournals = useMemo<JournalEntry[]>(
    () => journalsForRecipient(state.journal ?? [], recipient),
    [state.journal, recipient.id, recipient.name],
  );
  const photos = useMemo(
    () => attachmentsForRecipient(memories ?? [], state.journal ?? [], recipient)
      .filter((p) => p.attachment.kind === "image"),
    [memories, state.journal, recipient.id, recipient.name],
  );

  const openMemory = (m: Memory) => {
    const idx = personMemories.findIndex((x) => x.id === m.id);
    setLightbox({ open: true, index: Math.max(0, idx), list: personMemories });
  };

  const openMemoryFromPhoto = (memoryId: string) => {
    const idx = personMemories.findIndex((m) => m.id === memoryId);
    if (idx < 0) return;
    setLightbox({ open: true, index: idx, list: personMemories });
  };

  const newMemory = () => {
    setEditingMemory(null);
    setEditorOpen(true);
  };

  const onSaved = (m: Memory) => {
    setMemories((prev) => {
      const list = prev ?? [];
      const i = list.findIndex((x) => x.id === m.id);
      if (i >= 0) {
        const next = [...list]; next[i] = m; return next;
      }
      return [m, ...list];
    });
  };

  const onDeleted = (id: string) => {
    setMemories((prev) => (prev ?? []).filter((x) => x.id !== id));
  };

  const photoCount = photos.length;
  const memoryCount = personMemories.length;
  const journalCount = personJournals.length;

  return (
    <SectionCard
      title={`Memories with ${recipient.name}`}
      subtitle="Everything tagged with them — photos, memories, journal"
      accent="warm"
      action={
        <Button size="sm" variant="ghost" className="h-7 rounded-full px-2 text-xs" onClick={newMemory}>
          <Plus className="mr-1 h-3 w-3" /> Memory
        </Button>
      }
    >
      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {[0,1,2,3,4,5,6,7].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : photoCount + memoryCount + journalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-5 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing tagged with {recipient.name} yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tag a journal entry or memory with them to start a thread of moments here.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={newMemory} className="rounded-full">
              <Plus className="mr-1 h-3 w-3" /> New memory
            </Button>
            <Button size="sm" variant="outline" className="rounded-full"
              onClick={() => navigate(`/journal?recipient=${recipient.id}`)}>
              <BookHeart className="mr-1 h-3 w-3" /> Journal entry
            </Button>
          </div>
        </div>
      ) : (
        <Tabs defaultValue={photoCount ? "photos" : memoryCount ? "memories" : "journal"} className="w-full">
          <TabsList className="rounded-full bg-muted/40 p-1">
            <TabsTrigger value="photos" className="rounded-full px-3 text-xs">
              <Camera className="mr-1 h-3 w-3" /> Photos
              <span className="ml-1 text-[10px] opacity-70">{photoCount}</span>
            </TabsTrigger>
            <TabsTrigger value="memories" className="rounded-full px-3 text-xs">
              <Sparkles className="mr-1 h-3 w-3" /> Memories
              <span className="ml-1 text-[10px] opacity-70">{memoryCount}</span>
            </TabsTrigger>
            <TabsTrigger value="journal" className="rounded-full px-3 text-xs">
              <BookHeart className="mr-1 h-3 w-3" /> Journal
              <span className="ml-1 text-[10px] opacity-70">{journalCount}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="mt-3">
            {photoCount === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">No photos yet — add one to a memory or journal entry tagged with {recipient.name}.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {photos.map((p, i) => (
                  <PhotoTile
                    key={`${p.source}-${p.parentId}-${p.attachment.id ?? i}`}
                    path={p.attachment.path}
                    kind={p.attachment.kind}
                    onClick={() => {
                      if (p.source === "memory") openMemoryFromPhoto(p.parentId);
                      else navigate(`/journal?focus=${p.parentId}`);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="memories" className="mt-3">
            {memoryCount === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">No memories tagged with {recipient.name} yet.</p>
            ) : (
              <div className="grid gap-2">
                {personMemories.map((m) => (
                  <MemoryCard key={m.id} memory={m} variant="compact" onClick={() => openMemory(m)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="journal" className="mt-3">
            {journalCount === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">No journal entries linked to {recipient.name} yet.</p>
            ) : (
              <ul className="space-y-2">
                {personJournals.map((e) => {
                  const excerpt = (e.body ?? "").replace(/[#*_>`-]/g, "").trim().slice(0, 140);
                  const attCount = e.attachments?.length ?? 0;
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => navigate(`/journal?focus=${e.id}`)}
                        className="w-full rounded-xl border border-border/50 bg-card/60 p-3 text-left transition hover:border-primary/50 hover:bg-card"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {e.title || (e.template ? e.template.replace(/-/g, " ") : "Journal entry")}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {format(parseISO(e.date), "MMM d, yyyy")}
                              {e.mood ? ` · ${e.mood}` : ""}
                              {attCount ? ` · ${attCount} attachment${attCount > 1 ? "s" : ""}` : ""}
                            </div>
                          </div>
                        </div>
                        {excerpt && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{excerpt}</p>
                        )}
                        {(e.tags?.length ?? 0) > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {e.tags!.slice(0, 6).map((t) => (
                              <span key={t} className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px]">#{t}</span>
                            ))}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}

      <MemoryEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        memory={editingMemory}
        lovedOnes={lovedOnes}
        onSaved={onSaved}
        onDeleted={onDeleted}
        defaults={{ recipientIds: [recipient.id] }}
      />

      <MemoryLightbox
        memories={lightbox.list}
        index={lightbox.index}
        onIndexChange={(i) => setLightbox((s) => ({ ...s, index: i }))}
        open={lightbox.open}
        onOpenChange={(o) => setLightbox((s) => ({ ...s, open: o }))}
        onEdit={(m) => { setEditingMemory(m); setEditorOpen(true); setLightbox((s) => ({ ...s, open: false })); }}
        onUpdated={onSaved}
        lovedOnes={lovedOnes}
      />
    </SectionCard>
  );
}