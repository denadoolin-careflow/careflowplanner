import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Clock3, Pin, Sun, Link2, Tag as TagIcon, Archive, Plus, FileQuestion, FolderOpen, List, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fallbackColorFor, type Tag } from "@/lib/tags";
import { tagIconFor } from "@/components/tags/tag-icon";
import type { Note } from "@/lib/notes";

export type SmartCollectionId =
  | "all" | "recent" | "pinned" | "daily" | "linked" | "untagged" | "archived";

const COLLECTIONS: { id: SmartCollectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all",       label: "All notes",       icon: List },
  { id: "recent",    label: "Recently edited", icon: Clock3 },
  { id: "pinned",    label: "Pinned",          icon: Pin },
  { id: "daily",     label: "Daily notes",     icon: Sun },
  { id: "linked",    label: "Linked notes",    icon: Link2 },
  { id: "untagged",  label: "Untagged",        icon: FileQuestion },
  { id: "archived",  label: "Archived",        icon: Archive },
];

export function collectionCount(id: SmartCollectionId, notes: Note[]): number {
  switch (id) {
    case "all":      return notes.length;
    case "recent":   return Math.min(notes.length, 30);
    case "pinned":   return notes.filter(n => n.pinned).length;
    case "daily":    return notes.filter(n => n.kind === "daily").length;
    case "linked":   return notes.filter(n => /\[\[[^\]]+]]/.test(n.body || "")).length;
    case "untagged": return notes.filter(n => !n.tags || n.tags.length === 0).length;
    case "archived": return 0; // listNotes already filters these out
  }
}

export function applyCollection(id: SmartCollectionId, notes: Note[]): Note[] {
  switch (id) {
    case "all":      return notes;
    case "recent":   return [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 30);
    case "pinned":   return notes.filter(n => n.pinned);
    case "daily":    return notes.filter(n => n.kind === "daily");
    case "linked":   return notes.filter(n => /\[\[[^\]]+]]/.test(n.body || ""));
    case "untagged": return notes.filter(n => !n.tags || n.tags.length === 0);
    case "archived": return [];
  }
}

export function NotesSideNav({
  notes, tags, activeCollection, onCollectionChange,
  activeTag, onTagChange, onNewTag,
}: {
  notes: Note[];
  tags: Tag[];
  activeCollection: SmartCollectionId;
  onCollectionChange: (id: SmartCollectionId) => void;
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
  onNewTag?: () => void;
}) {
  const [openCollections, setOpenCollections] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("careflow.notes.sidenav.collections") !== "0";
  });
  const [openTags, setOpenTags] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("careflow.notes.sidenav.tags") !== "0";
  });
  useEffect(() => { localStorage.setItem("careflow.notes.sidenav.collections", openCollections ? "1" : "0"); }, [openCollections]);
  useEffect(() => { localStorage.setItem("careflow.notes.sidenav.tags", openTags ? "1" : "0"); }, [openTags]);

  // Compute tag usage counts from loaded notes.
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) for (const t of n.tags ?? []) {
      const k = t.toLowerCase();
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [notes]);

  // Merge known tags + any tags referenced in notes that are not yet in the tags table.
  const sortedTags = useMemo(() => {
    const seen = new Set(tags.map(t => t.name.toLowerCase()));
    const ghosts: Tag[] = [];
    tagCounts.forEach((_, name) => {
      if (!seen.has(name)) {
        ghosts.push({
          id: `ghost:${name}`,
          name,
          color: fallbackColorFor(name),
          icon: "tag",
          pinned: false,
          createdAt: "",
          updatedAt: "",
        });
      }
    });
    const merged = [...tags, ...ghosts];
    return merged.sort((a, b) => {
      const ca = tagCounts.get(a.name.toLowerCase()) ?? 0;
      const cb = tagCounts.get(b.name.toLowerCase()) ?? 0;
      if (cb !== ca) return cb - ca;
      return a.name.localeCompare(b.name);
    });
  }, [tags, tagCounts]);

  return (
    <aside className="flex h-full w-full flex-col gap-5 overflow-y-auto pr-1">
      {/* Smart collections */}
      <section>
        <button
          type="button"
          onClick={() => setOpenCollections(o => !o)}
          aria-expanded={openCollections}
          className="mb-1.5 flex w-full items-center gap-1 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", !openCollections && "-rotate-90")} />
          <span className="flex-1 text-left">Collections</span>
        </button>
        {openCollections && (
        <ul className="space-y-0.5">
          {COLLECTIONS.filter(c => c.id === "all" || collectionCount(c.id, notes) > 0).map(c => {
            const active = activeCollection === c.id && !activeTag;
            const count = collectionCount(c.id, notes);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => { onCollectionChange(c.id); onTagChange(null); }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary/15 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <c.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-left">{c.label}</span>
                  <span className="text-[10px] text-muted-foreground/70">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
        )}
      </section>

      {/* Tags */}
      <section>
        <div className="mb-1.5 flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => setOpenTags(o => !o)}
            aria-expanded={openTags}
            className="flex flex-1 items-center gap-1 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", !openTags && "-rotate-90")} />
            Tags
          </button>
          {onNewTag && (
            <button
              type="button"
              onClick={onNewTag}
              className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              aria-label="New tag"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
        {openTags && (sortedTags.length === 0 ? (
          <p className="px-2 text-xs italic text-muted-foreground/70">No tags yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {sortedTags.map(t => {
              const Icon = tagIconFor(t.icon);
              const active = activeTag?.toLowerCase() === t.name.toLowerCase();
              const count = tagCounts.get(t.name.toLowerCase()) ?? 0;
              return (
                <li key={t.id} className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => onTagChange(active ? null : t.name)}
                    className={cn(
                      "flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors min-w-0",
                      active
                        ? "bg-primary/15 text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: t.color }} />
                    <span className="flex-1 truncate text-left">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground/70">{count}</span>
                  </button>
                  <Link
                    to={`/tags/${encodeURIComponent(t.name)}`}
                    className="ml-0.5 hidden h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground group-hover:grid"
                    aria-label={`Open ${t.name} page`}
                    title="Open tag page"
                  >
                    <FolderOpen className="h-3 w-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </section>
    </aside>
  );
}