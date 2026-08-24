/**
 * One merged people directory: care recipients (from the app store) and loved
 * ones (family, friends, pets). Used by the connection picker and the Today
 * connections card so both draw from the same list.
 */
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { listLovedOnes, type LovedOne } from "@/lib/loved-ones";

export type PersonKind = "recipient" | "loved_one";

export interface DirectoryPerson {
  id: string;
  kind: PersonKind;
  name: string;
  /** "Daughter", "Mom", "Dog"… when known. */
  relation?: string;
  emoji?: string;
  color?: string;
}

/** Single source of truth for the loved-ones fetch, shared across mounts. */
let cache: LovedOne[] | null = null;
let inflight: Promise<LovedOne[]> | null = null;
const listeners = new Set<(v: LovedOne[]) => void>();

async function load(force = false): Promise<LovedOne[]> {
  if (cache && !force) return cache;
  if (!inflight || force) {
    inflight = listLovedOnes()
      .then((rows) => {
        cache = rows;
        listeners.forEach(fn => fn(rows));
        return rows;
      })
      .catch(() => {
        cache = cache ?? [];
        return cache;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Refresh the shared loved-ones cache (after an edit elsewhere). */
export function refreshLovedOnes() { void load(true); }

export function useLovedOnes(): LovedOne[] {
  const [rows, setRows] = useState<LovedOne[]>(() => cache ?? []);
  useEffect(() => {
    listeners.add(setRows);
    void load();
    return () => { listeners.delete(setRows); };
  }, []);
  return rows;
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export function personInitial(p: DirectoryPerson) {
  return p.emoji ?? initials(p.name);
}

/** Care recipients + loved ones, de-duplicated by name, sorted by name. */
export function usePeopleDirectory(): DirectoryPerson[] {
  const { state } = useStore();
  const loved = useLovedOnes();

  return useMemo(() => {
    const out: DirectoryPerson[] = state.recipients.map(r => ({
      id: r.id,
      kind: "recipient" as const,
      name: r.name,
      relation: r.kind,
    }));
    const seen = new Set(out.map(p => p.name.trim().toLowerCase()));
    for (const l of loved) {
      const key = l.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: l.id,
        kind: "loved_one",
        name: l.name,
        relation: l.relation ?? (l.kind !== "person" ? l.kind : undefined),
        emoji: l.avatarEmoji,
        color: l.color,
      });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [state.recipients, loved]);
}

/** Look one person up by id, whichever list they live in. */
export function usePerson(id?: string | null): DirectoryPerson | null {
  const people = usePeopleDirectory();
  return useMemo(() => (id ? people.find(p => p.id === id) ?? null : null), [people, id]);
}
