import type { Memory } from "@/lib/memories";
import type { JournalEntry, Attachment } from "@/lib/types";

/** Slugified, lower-kebab handle used as a #tag for a recipient. */
export function recipientTagHandle(name: string): string {
  return (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function memoriesForRecipient(memories: Memory[], recipientId: string): Memory[] {
  return memories
    .filter((m) => (m.recipientIds ?? []).includes(recipientId))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function journalsForRecipient(
  entries: JournalEntry[],
  recipient: { id: string; name: string },
): JournalEntry[] {
  const handle = recipientTagHandle(recipient.name);
  return entries
    .filter((e) => {
      const hasLink = (e.linkedIds ?? []).some(
        (l) => l.type === "recipient" && l.id === recipient.id,
      );
      const hasTag = handle
        ? (e.tags ?? []).some((t) => t.toLowerCase() === handle)
        : false;
      return hasLink || hasTag;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export type LinkedAttachment = {
  source: "memory" | "journal";
  parentId: string;
  date: string;
  caption?: string;
  attachment: Attachment;
};

export function attachmentsForRecipient(
  memories: Memory[],
  entries: JournalEntry[],
  recipient: { id: string; name: string },
): LinkedAttachment[] {
  const out: LinkedAttachment[] = [];
  for (const m of memoriesForRecipient(memories, recipient.id)) {
    for (const a of m.attachments ?? []) {
      out.push({ source: "memory", parentId: m.id, date: m.date, caption: m.title, attachment: a });
    }
  }
  for (const e of journalsForRecipient(entries, recipient)) {
    for (const a of e.attachments ?? []) {
      out.push({ source: "journal", parentId: e.id, date: e.date, caption: e.title, attachment: a });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}