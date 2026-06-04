import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Plus, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { JournalEntry } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { haptics } from "@/lib/haptics";
import { recipientTagHandle } from "@/lib/person-memories";

/**
 * Compact chip row + popover picker for linking a journal entry to caregiving
 * recipients. Persists into `journal_entries.linked_ids` as
 * `[{ type: "recipient", id, label }]` and also mirrors the slugified name
 * into `tags` for legacy tag-based filtering.
 */
export function JournalRecipientPicker({ entry }: { entry: JournalEntry }) {
  const { state, updateJournal } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const recipients = state.recipients ?? [];
  const linked = (entry.linkedIds ?? []).filter((l) => l.type === "recipient");
  const linkedSet = new Set(linked.map((l) => l.id));

  const toggle = (rid: string, name: string) => {
    const others = (entry.linkedIds ?? []).filter(
      (l) => !(l.type === "recipient" && l.id === rid),
    );
    const handle = recipientTagHandle(name);
    const baseTags = entry.tags ?? [];
    const nextLinks = linkedSet.has(rid)
      ? others
      : [...(entry.linkedIds ?? []), { type: "recipient", id: rid, label: name }];
    // Tag mirror: add when linking, leave alone when unlinking (don't strip
    // intentional tags). User can remove the tag from the chip row.
    const nextTags = linkedSet.has(rid)
      ? baseTags
      : handle && !baseTags.includes(handle)
        ? [...baseTags, handle]
        : baseTags;
    updateJournal(entry.id, { linkedIds: nextLinks, tags: nextTags } as any);
    haptics.tap();
  };

  const filtered = q
    ? recipients.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
    : recipients;

  if (recipients.length === 0 && linked.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {linked.map((l) => {
        const r = recipients.find((x) => x.id === l.id);
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => navigate(`/caregiving?recipient=${l.id}`)}
            className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent-foreground hover:bg-accent/15"
          >
            <Heart className="h-3 w-3" />
            <span className="max-w-[120px] truncate">{r?.name ?? l.label ?? "Person"}</span>
            <span
              role="button"
              aria-label="Remove link"
              onClick={(e) => { e.stopPropagation(); toggle(l.id, r?.name ?? l.label ?? ""); }}
              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent/20"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          </button>
        );
      })}
      {recipients.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 gap-1 rounded-full px-2 text-[11px] text-muted-foreground hover:text-foreground">
              <Plus className="h-3 w-3" /> Link person
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people…"
              className="h-8 text-xs"
            />
            <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground">No people.</div>
              )}
              {filtered.map((r) => {
                const on = linkedSet.has(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggle(r.id, r.name)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60 ${on ? "bg-muted/60" : ""}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Heart className="h-3 w-3 opacity-70" />
                      <span className="truncate">{r.name}</span>
                      <span className="text-[10px] text-muted-foreground">· {r.kind}</span>
                    </span>
                    {on && <span className="text-primary">✓</span>}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}