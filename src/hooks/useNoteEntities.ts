import { useEffect, useState } from "react";
import { detectEntities, type NoteEntities } from "@/lib/note-entities";

const EMPTY: NoteEntities = {
  tasks: [], links: [], dates: [], urls: [], wikilinks: [], mentions: [], tags: [],
};

/**
 * Debounced client-side entity detection.
 * Runs off the main paint by deferring to a 250ms timer.
 */
export function useNoteEntities(body: string, delay = 250): NoteEntities {
  const [entities, setEntities] = useState<NoteEntities>(EMPTY);
  useEffect(() => {
    if (!body) { setEntities(EMPTY); return; }
    const id = window.setTimeout(() => setEntities(detectEntities(body)), delay);
    return () => window.clearTimeout(id);
  }, [body, delay]);
  return entities;
}