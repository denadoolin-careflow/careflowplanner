/**
 * Which care people show on Today. Empty selection = automatic (capacity-aware
 * first few). Saved on the user's profile so it follows them across devices,
 * with localStorage as an instant cache/fallback.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "careflow:today:care-people";
const EVENT = "careflow:today:care-people-changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}

function writeLocal(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* private mode */ }
}

async function loadRemote(): Promise<string[] | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  const { data, error } = await (supabase as any)
    .from("profiles").select("today_care_people").eq("id", uid).maybeSingle();
  if (error || !data) return null;
  const v = data.today_care_people;
  return Array.isArray(v) ? v.filter((x: unknown): x is string => typeof x === "string") : [];
}

async function saveRemote(ids: string[]) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return;
  await (supabase as any).from("profiles").update({ today_care_people: ids }).eq("id", uid);
}

export function useTodayCarePeople() {
  const [ids, setIds] = useState<string[]>(read);

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Hydrate from the profile once; the local value shows instantly meanwhile.
  useEffect(() => {
    let alive = true;
    loadRemote().then(remote => {
      if (!alive || remote === null) return;
      const local = read();
      if (JSON.stringify(remote) === JSON.stringify(local)) return;
      writeLocal(remote);
      setIds(remote);
    }).catch(() => { /* offline — keep local */ });
    return () => { alive = false; };
  }, []);

  const commit = useCallback((next: string[]) => {
    writeLocal(next);
    setIds(next);
    void saveRemote(next).catch(() => { /* retried on next change */ });
  }, []);

  const toggle = useCallback((id: string) => {
    const next = read();
    const i = next.indexOf(id);
    if (i >= 0) next.splice(i, 1); else next.push(id);
    commit(next);
  }, [commit]);

  const clear = useCallback(() => commit([]), [commit]);

  return { selectedIds: ids, toggle, clear, isAuto: ids.length === 0 };
}
