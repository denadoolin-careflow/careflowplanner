import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, LayoutGrid, Clock, List, Heart, Pin, BookOpen, Users, Flower2, SlidersHorizontal, X, Download, FileText, FileJson } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportMemoriesJSON, exportMemoriesPDF } from "@/lib/memories-export";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { listMemories, MEMORY_TYPES, type Memory, type MemoryType, seasonOf } from "@/lib/memories";
import { listLovedOnes, type LovedOne } from "@/lib/loved-ones";
import { MemoryEditor } from "@/components/memories/MemoryEditor";
import { MemoryCard } from "@/components/memories/MemoryCard";
import { MemoryLightbox } from "@/components/memories/MemoryLightbox";
import { LovedOnesPanel } from "@/components/memories/LovedOnesPanel";
import { MemoryAIRecap } from "@/components/memories/MemoryAIRecap";
import { OnThisDayCard } from "@/components/memories/OnThisDayCard";

type ViewMode = "gallery" | "timeline" | "chapters" | "list";

export default function MemoriesPage() {
  const { state } = useStore();
  const [params, setParams] = useSearchParams();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("gallery");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MemoryType | "all">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [personKey, setPersonKey] = useState<string | null>(params.get("person"));
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [moodFilters, setMoodFilters] = useState<string[]>([]);
  const [personFilters, setPersonFilters] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [m, l] = await Promise.all([listMemories(), listLovedOnes()]);
        setMemories(m);
        setLovedOnes(l);
      } catch (e: any) {
        toast.error(e?.message ?? "Could not load memories");
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    const p = params.get("person");
    if (p !== personKey) setPersonKey(p);
    // eslint-disable-next-line
  }, [params]);

  const handleSetPerson = (k: string | null) => {
    setPersonKey(k);
    const next = new URLSearchParams(params);
    if (k) next.set("person", k); else next.delete("person");
    setParams(next, { replace: true });
  };

  // Available filter options derived from data
  const allTags = useMemo(() => {
    const s = new Set<string>();
    memories.forEach((m) => m.tags.forEach((t) => t && s.add(t)));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [memories]);
  const allMoods = useMemo(() => {
    const s = new Set<string>();
    memories.forEach((m) => { if (m.mood) s.add(m.mood); });
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [memories]);
  const allPeople = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ key: string; label: string; emoji?: string }> = [];
    (state.recipients ?? []).forEach((r) => {
      const key = `recipient:${r.id}`;
      if (!seen.has(key)) { seen.add(key); out.push({ key, label: r.name }); }
    });
    lovedOnes.forEach((l) => {
      const key = `loved:${l.id}`;
      if (!seen.has(key)) { seen.add(key); out.push({ key, label: l.name, emoji: l.avatarEmoji }); }
    });
    return out;
  }, [state.recipients, lovedOnes]);

  const toggleIn = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const clearAllFilters = () => {
    setTagFilters([]); setMoodFilters([]); setPersonFilters([]);
    setDateFrom(""); setDateTo(""); setFavoritesOnly(false);
    setTypeFilter("all"); setSearch("");
  };

  const activeFilterCount =
    tagFilters.length + moodFilters.length + personFilters.length +
    (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  // Filter
  const filtered = useMemo(() => {
    let out = memories;
    if (personKey) {
      const [source, id] = personKey.split(":");
      out = out.filter((m) => source === "recipient"
        ? m.recipientIds.includes(id)
        : m.lovedOneIds.includes(id));
    }
    if (typeFilter !== "all") out = out.filter((m) => m.memoryType === typeFilter);
    if (favoritesOnly) out = out.filter((m) => m.isFavorite);
    if (tagFilters.length) {
      out = out.filter((m) => tagFilters.every((t) => m.tags.includes(t)));
    }
    if (moodFilters.length) {
      out = out.filter((m) => m.mood && moodFilters.includes(m.mood));
    }
    if (personFilters.length) {
      out = out.filter((m) => personFilters.some((k) => {
        const [src, id] = k.split(":");
        return src === "recipient" ? m.recipientIds.includes(id) : m.lovedOneIds.includes(id);
      }));
    }
    if (dateFrom) out = out.filter((m) => m.date >= dateFrom);
    if (dateTo) out = out.filter((m) => m.date <= dateTo);
    if (search.trim()) {
      const q = search.toLowerCase();
      const personLookup = (ids: string[], kind: "recipient" | "loved") =>
        ids.some((id) => {
          const name = kind === "recipient"
            ? state.recipients?.find((r) => r.id === id)?.name
            : lovedOnes.find((l) => l.id === id)?.name;
          return name?.toLowerCase().includes(q);
        });
      out = out.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q)) ||
        m.location?.toLowerCase().includes(q) ||
        m.mood?.toLowerCase().includes(q) ||
        personLookup(m.recipientIds, "recipient") ||
        personLookup(m.lovedOneIds, "loved")
      );
    }
    return out;
  }, [memories, personKey, typeFilter, favoritesOnly, search,
      tagFilters, moodFilters, personFilters, dateFrom, dateTo,
      state.recipients, lovedOnes]);

  const pinned = useMemo(() => filtered.filter((m) => m.isPinned), [filtered]);

  const countsByRecipient = useMemo(() => {
    const out: Record<string, number> = {};
    memories.forEach((m) => m.recipientIds.forEach((id) => { out[id] = (out[id] ?? 0) + 1; }));
    return out;
  }, [memories]);
  const countsByLovedOne = useMemo(() => {
    const out: Record<string, number> = {};
    memories.forEach((m) => m.lovedOneIds.forEach((id) => { out[id] = (out[id] ?? 0) + 1; }));
    return out;
  }, [memories]);

  const personName = useMemo(() => {
    if (!personKey) return null;
    const [source, id] = personKey.split(":");
    if (source === "recipient") return state.recipients?.find((r) => r.id === id)?.name ?? null;
    return lovedOnes.find((l) => l.id === id)?.name ?? null;
  }, [personKey, state.recipients, lovedOnes]);

  const openEditor = (m: Memory | null) => { setEditing(m); setEditorOpen(true); };
  const onSaved = (m: Memory) => {
    setMemories((prev) => {
      const exists = prev.find((p) => p.id === m.id);
      if (exists) return prev.map((p) => p.id === m.id ? m : p);
      return [m, ...prev];
    });
  };
  const onDeleted = (id: string) => setMemories((prev) => prev.filter((p) => p.id !== id));
  const openLightbox = (m: Memory) => {
    const idx = filtered.findIndex((x) => x.id === m.id);
    if (idx >= 0) { setLightboxIndex(idx); setLightboxOpen(true); }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-[hsl(350_45%_85%/0.5)] bg-gradient-to-br from-[hsl(20_70%_97%)] via-[hsl(350_55%_96%)] to-[hsl(350_45%_92%)] p-6 shadow-[0_4px_30px_-15px_hsl(350_60%_40%/0.3)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[hsl(350_55%_85%/0.6)] blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[hsl(350_45%_45%)]">
              <Flower2 className="h-3 w-3" /> Memories
            </div>
            <h2 className="mt-1 font-display text-3xl leading-tight text-[hsl(350_50%_25%)]">
              {personName ? `With ${personName}` : "The small moments worth keeping."}
            </h2>
            <p className="mt-1 text-sm text-[hsl(350_30%_40%)]">
              {memories.length} {memories.length === 1 ? "memory" : "memories"} preserved, gently.
            </p>
          </div>
          <Button onClick={() => openEditor(null)} className="bg-[hsl(350_55%_60%)] text-white shadow-md hover:bg-[hsl(350_55%_55%)]">
            <Plus className="mr-1.5 h-4 w-4" /> New memory
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
        {/* Left rail */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <LovedOnesPanel
            lovedOnes={lovedOnes}
            setLovedOnes={setLovedOnes}
            countsByRecipient={countsByRecipient}
            countsByLovedOne={countsByLovedOne}
            selectedPersonKey={personKey}
            onSelect={handleSetPerson}
          />

          <div className="space-y-1">
            <div className="px-1 text-xs uppercase tracking-wider text-[hsl(350_45%_45%)]">Types</div>
            <button onClick={() => setTypeFilter("all")}
              className={`w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${typeFilter === "all" ? "bg-[hsl(350_45%_94%)] text-[hsl(350_45%_30%)]" : "hover:bg-muted/40"}`}>
              All types
            </button>
            {MEMORY_TYPES.map((t) => (
              <button key={t.value} onClick={() => setTypeFilter(t.value)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm ${typeFilter === t.value ? "bg-[hsl(350_45%_94%)] text-[hsl(350_45%_30%)]" : "hover:bg-muted/40"}`}>
                <span>{t.emoji}</span><span>{t.label}</span>
              </button>
            ))}
          </div>

          <button onClick={() => setFavoritesOnly((v) => !v)}
            className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${favoritesOnly ? "border-[hsl(350_55%_60%)] bg-[hsl(350_45%_94%)] text-[hsl(350_45%_30%)]" : "border-border/50 hover:bg-muted/40"}`}>
            <Heart className={`h-4 w-4 ${favoritesOnly ? "fill-[hsl(350_55%_60%)] text-[hsl(350_55%_60%)]" : ""}`} />
            Favorite Moments
          </button>
        </aside>

        {/* Right column */}
        <div className="space-y-6">
          <OnThisDayCard memories={memories} onOpen={openLightbox} />

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search title, tag, mood, person…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
                  {activeFilterCount > 0 && (
                    <Badge className="ml-1 h-4 min-w-[16px] rounded-full bg-[hsl(350_55%_60%)] px-1 text-[10px] text-white">{activeFilterCount}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 max-h-[70vh] overflow-y-auto p-3 space-y-4">
                <FilterSection title="Tags" empty={allTags.length === 0 ? "No tags yet" : undefined}>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map((t) => {
                      const on = tagFilters.includes(t);
                      return (
                        <button key={t} onClick={() => setTagFilters((a) => toggleIn(a, t))}
                          className={`rounded-full border px-2 py-0.5 text-xs transition ${on ? "border-[hsl(350_55%_60%)] bg-[hsl(350_45%_94%)] text-[hsl(350_45%_30%)]" : "border-border/60 hover:bg-muted/40"}`}>
                          #{t}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>
                <FilterSection title="Mood" empty={allMoods.length === 0 ? "No moods logged yet" : undefined}>
                  <div className="flex flex-wrap gap-1.5">
                    {allMoods.map((m) => {
                      const on = moodFilters.includes(m);
                      return (
                        <button key={m} onClick={() => setMoodFilters((a) => toggleIn(a, m))}
                          className={`rounded-full border px-2 py-0.5 text-xs transition ${on ? "border-[hsl(350_55%_60%)] bg-[hsl(350_45%_94%)] text-[hsl(350_45%_30%)]" : "border-border/60 hover:bg-muted/40"}`}>
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>
                <FilterSection title="People" empty={allPeople.length === 0 ? "No people yet" : undefined}>
                  <div className="flex flex-wrap gap-1.5">
                    {allPeople.map((p) => {
                      const on = personFilters.includes(p.key);
                      return (
                        <button key={p.key} onClick={() => setPersonFilters((a) => toggleIn(a, p.key))}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${on ? "border-[hsl(350_55%_60%)] bg-[hsl(350_45%_94%)] text-[hsl(350_45%_30%)]" : "border-border/60 hover:bg-muted/40"}`}>
                          {p.emoji && <span>{p.emoji}</span>}{p.label}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>
                <FilterSection title="Date range">
                  <div className="flex items-center gap-2">
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { label: "Last 7 days", days: 7 },
                      { label: "Last 30 days", days: 30 },
                      { label: "This year", days: 0 },
                    ].map((p) => (
                      <button key={p.label}
                        className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] hover:bg-muted/40"
                        onClick={() => {
                          const today = new Date();
                          const to = format(today, "yyyy-MM-dd");
                          let from = to;
                          if (p.days > 0) {
                            const d = new Date(today); d.setDate(d.getDate() - p.days);
                            from = format(d, "yyyy-MM-dd");
                          } else {
                            from = `${today.getFullYear()}-01-01`;
                          }
                          setDateFrom(from); setDateTo(to);
                        }}>{p.label}</button>
                    ))}
                  </div>
                </FilterSection>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={clearAllFilters}>
                    Clear all filters
                  </Button>
                )}
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0}>
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">
                  {filtered.length} memor{filtered.length === 1 ? "y" : "ies"} in current view
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    exportMemoriesPDF(filtered, {
                      scopeLabel: personName ? `With ${personName}` : (typeFilter !== "all" ? `${MEMORY_TYPES.find((t) => t.value === typeFilter)?.label}` : favoritesOnly ? "Favorite moments" : "All memories"),
                      favoritesOnly,
                      recipients: state.recipients,
                      lovedOnes,
                    });
                    toast.success("PDF timeline downloaded");
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" /> Timeline PDF (current view)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    exportMemoriesPDF(filtered.filter((m) => m.isFavorite), {
                      scopeLabel: "Favorite moments",
                      favoritesOnly: true,
                      recipients: state.recipients,
                      lovedOnes,
                    });
                    toast.success("Favorites PDF downloaded");
                  }}
                  disabled={filtered.filter((m) => m.isFavorite).length === 0}
                >
                  <Heart className="mr-2 h-4 w-4" /> Favorites only PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    exportMemoriesJSON(filtered, {
                      scopeLabel: personName ? `With ${personName}` : "Current view",
                      favoritesOnly,
                      recipients: state.recipients,
                      lovedOnes,
                    });
                    toast.success("JSON downloaded");
                  }}
                >
                  <FileJson className="mr-2 h-4 w-4" /> JSON (current view)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    exportMemoriesJSON(memories, {
                      scopeLabel: "Full archive",
                      recipients: state.recipients,
                      lovedOnes,
                    });
                    toast.success("Full archive JSON downloaded");
                  }}
                >
                  <FileJson className="mr-2 h-4 w-4" /> JSON (full archive)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)} className="ml-auto">
              <TabsList className="bg-[hsl(20_60%_96%)]">
                <TabsTrigger value="gallery"><LayoutGrid className="mr-1 h-3.5 w-3.5" />Gallery</TabsTrigger>
                <TabsTrigger value="timeline"><Clock className="mr-1 h-3.5 w-3.5" />Timeline</TabsTrigger>
                <TabsTrigger value="chapters"><BookOpen className="mr-1 h-3.5 w-3.5" />Chapters</TabsTrigger>
                <TabsTrigger value="list"><List className="mr-1 h-3.5 w-3.5" />List</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {tagFilters.map((t) => (
                <ActiveChip key={"t-"+t} label={`#${t}`} onClear={() => setTagFilters((a) => a.filter((x) => x !== t))} />
              ))}
              {moodFilters.map((m) => (
                <ActiveChip key={"m-"+m} label={m} onClear={() => setMoodFilters((a) => a.filter((x) => x !== m))} />
              ))}
              {personFilters.map((k) => {
                const p = allPeople.find((pp) => pp.key === k);
                return <ActiveChip key={"p-"+k} label={p?.label ?? k} onClear={() => setPersonFilters((a) => a.filter((x) => x !== k))} />;
              })}
              {dateFrom && <ActiveChip label={`from ${dateFrom}`} onClear={() => setDateFrom("")} />}
              {dateTo && <ActiveChip label={`to ${dateTo}`} onClear={() => setDateTo("")} />}
              <button onClick={clearAllFilters} className="text-[11px] text-muted-foreground hover:text-foreground">clear all</button>
            </div>
          )}

          {pinned.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-[hsl(350_45%_45%)]">
                <Pin className="h-3 w-3" /> Pinned moments
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pinned.map((m) => <MemoryCard key={m.id} memory={m} onClick={() => openLightbox(m)} />)}
              </div>
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl border border-dashed border-[hsl(350_45%_85%/0.6)] bg-[hsl(20_60%_98%/0.5)] p-10 text-center text-sm text-muted-foreground">
              Gathering your memories…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyMemories onCreate={() => openEditor(null)} hasAny={memories.length > 0} />
          ) : view === "gallery" ? (
            <GalleryView memories={filtered} onOpen={openLightbox} />
          ) : view === "timeline" ? (
            <TimelineView memories={filtered} onOpen={openLightbox} />
          ) : view === "chapters" ? (
            <ChaptersView memories={filtered} onOpen={openLightbox} />
          ) : (
            <ListView memories={filtered} onOpen={openLightbox} />
          )}

          {filtered.length > 0 && (
            <MemoryAIRecap
              memories={filtered}
              scopeLabel={
                personName ? `Time with ${personName}` :
                typeFilter !== "all" ? `${MEMORY_TYPES.find((t) => t.value === typeFilter)?.label} memories` :
                favoritesOnly ? "Favorite moments" :
                "Your memory archive"
              }
            />
          )}
        </div>
      </div>

      <MemoryEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        memory={editing}
        lovedOnes={lovedOnes}
        onSaved={onSaved}
        onDeleted={onDeleted}
        defaults={personKey && !editing ? (() => {
          const [source, id] = personKey.split(":");
          return source === "recipient" ? { recipientIds: [id] } : { lovedOneIds: [id] };
        })() : undefined}
      />
      <MemoryLightbox
        memories={filtered}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onEdit={(m) => { setLightboxOpen(false); openEditor(m); }}
        onUpdated={onSaved}
        lovedOnes={lovedOnes}
      />
    </div>
  );
}

function FilterSection({ title, children, empty }: { title: string; children: React.ReactNode; empty?: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-wider text-[hsl(350_45%_45%)]">{title}</div>
      {empty ? <div className="text-xs text-muted-foreground">{empty}</div> : children}
    </div>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(350_45%_85%)] bg-[hsl(350_45%_96%)] px-2 py-0.5 text-[11px] text-[hsl(350_45%_30%)]">
      {label}
      <button onClick={onClear} className="rounded-full hover:bg-[hsl(350_45%_90%)]" aria-label={`Remove ${label}`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function EmptyMemories({ onCreate, hasAny }: { onCreate: () => void; hasAny: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-[hsl(350_45%_85%/0.6)] bg-[hsl(20_60%_98%/0.5)] p-10 text-center">
      <div className="text-4xl">🌸</div>
      <h3 className="mt-2 font-display text-xl">{hasAny ? "Nothing in this view yet." : "Your memory garden is waiting."}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {hasAny ? "Try a different filter, or save a new moment." : "Capture small joys, milestones, hard days — the threads of your real life."}
      </p>
      <Button onClick={onCreate} className="mt-4 bg-[hsl(350_55%_60%)] text-white hover:bg-[hsl(350_55%_55%)]">
        <Plus className="mr-1.5 h-4 w-4" /> Save your first memory
      </Button>
    </div>
  );
}

function GalleryView({ memories, onOpen }: { memories: Memory[]; onOpen: (m: Memory) => void }) {
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
      {memories.map((m) => <MemoryCard key={m.id} memory={m} onClick={() => onOpen(m)} />)}
    </div>
  );
}

function TimelineView({ memories, onOpen }: { memories: Memory[]; onOpen: (m: Memory) => void }) {
  const grouped = useMemo(() => {
    const out: Record<string, Memory[]> = {};
    memories.forEach((m) => {
      const k = format(parseISO(m.date), "yyyy-MM");
      (out[k] ??= []).push(m);
    });
    return Object.entries(out).sort(([a], [b]) => b.localeCompare(a));
  }, [memories]);

  return (
    <div className="space-y-8">
      {grouped.map(([key, list]) => (
        <div key={key}>
          <div className="mb-3 flex items-baseline gap-3">
            <h3 className="font-display text-2xl text-[hsl(350_50%_30%)]">
              {format(parseISO(key + "-01"), "MMMM yyyy")}
            </h3>
            <span className="text-xs text-muted-foreground">{list.length} {list.length === 1 ? "memory" : "memories"}</span>
            <div className="ml-2 h-px flex-1 bg-gradient-to-r from-[hsl(350_45%_80%)] to-transparent" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m) => <MemoryCard key={m.id} memory={m} onClick={() => onOpen(m)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

const SEASON_META: Record<string, { label: string; emoji: string }> = {
  spring: { label: "Spring", emoji: "🌷" },
  summer: { label: "Summer", emoji: "☀️" },
  autumn: { label: "Autumn", emoji: "🍂" },
  winter: { label: "Winter", emoji: "❄️" },
};

function ChaptersView({ memories, onOpen }: { memories: Memory[]; onOpen: (m: Memory) => void }) {
  const grouped = useMemo(() => {
    const out: Record<string, Memory[]> = {};
    memories.forEach((m) => {
      const y = m.date.slice(0, 4);
      const s = m.season ?? seasonOf(m.date);
      const k = `${y}::${s}`;
      (out[k] ??= []).push(m);
    });
    return Object.entries(out).sort(([a], [b]) => b.localeCompare(a));
  }, [memories]);

  return (
    <div className="space-y-8">
      {grouped.map(([key, list]) => {
        const [year, season] = key.split("::");
        const meta = SEASON_META[season] ?? { label: season, emoji: "🌿" };
        return (
          <div key={key} className="rounded-3xl border border-[hsl(350_45%_85%/0.5)] bg-[hsl(20_60%_98%/0.5)] p-5">
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-2xl">{meta.emoji}</span>
              <h3 className="font-display text-2xl text-[hsl(350_50%_30%)]">{meta.label} {year}</h3>
              <span className="text-xs text-muted-foreground">· {list.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((m) => <MemoryCard key={m.id} memory={m} onClick={() => onOpen(m)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ memories, onOpen }: { memories: Memory[]; onOpen: (m: Memory) => void }) {
  return (
    <div className="space-y-2">
      {memories.map((m) => <MemoryCard key={m.id} memory={m} variant="compact" onClick={() => onOpen(m)} />)}
    </div>
  );
}