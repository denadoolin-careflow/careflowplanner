import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HouseholdRole = "owner" | "editor" | "viewer";

export interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  display_name: string | null;
  color: string | null;
  joined_at: string;
}

export interface HouseholdInvite {
  id: string;
  household_id: string;
  email: string;
  role: HouseholdRole;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const LS_HOUSEHOLD = "careflow.currentHouseholdId";

export function getCachedHouseholdId(): string | null {
  try { return localStorage.getItem(LS_HOUSEHOLD); } catch { return null; }
}

export async function listHouseholdsForUser(userId: string): Promise<Household[]> {
  const { data: memberRows } = await supabase
    .from("household_users" as any)
    .select("household_id")
    .eq("user_id", userId);
  const ids = (memberRows ?? []).map((r: any) => r.household_id);
  if (!ids.length) return [];
  const { data } = await supabase
    .from("households" as any)
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as Household[];
}

export async function listMembers(householdId: string): Promise<HouseholdMember[]> {
  const { data } = await supabase
    .from("household_users" as any)
    .select("*")
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true });
  return (data ?? []) as unknown as HouseholdMember[];
}

export async function listInvites(householdId: string): Promise<HouseholdInvite[]> {
  const { data } = await supabase
    .from("household_invites" as any)
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as HouseholdInvite[];
}

export async function createHousehold(name: string, userId: string): Promise<Household | null> {
  const { data, error } = await supabase
    .from("households" as any)
    .insert({ name, created_by: userId })
    .select()
    .single();
  if (error || !data) return null;
  await supabase.from("household_users" as any).insert({
    household_id: (data as any).id,
    user_id: userId,
    role: "owner",
  });
  return data as unknown as Household;
}

export async function renameHousehold(id: string, name: string) {
  await supabase.from("households" as any).update({ name }).eq("id", id);
}

export async function deleteHousehold(id: string) {
  await supabase.from("households" as any).delete().eq("id", id);
}

export async function updateMember(id: string, patch: Partial<Pick<HouseholdMember, "display_name" | "color" | "role">>) {
  await supabase.from("household_users" as any).update(patch).eq("id", id);
}

export async function removeMember(id: string) {
  await supabase.from("household_users" as any).delete().eq("id", id);
}

export async function createInvite(householdId: string, email: string, role: HouseholdRole, userId: string): Promise<HouseholdInvite | null> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) throw new Error("Invalid email");
  const { data, error } = await supabase
    .from("household_invites" as any)
    .insert({ household_id: householdId, email: trimmed, role, invited_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as HouseholdInvite;
}

export async function cancelInvite(id: string) {
  await supabase.from("household_invites" as any).delete().eq("id", id);
}

export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_household_invite" as any, { _token: token });
  if (error) throw error;
  return data as string;
}

export async function setCurrentHousehold(userId: string, householdId: string | null) {
  try { localStorage.setItem(LS_HOUSEHOLD, householdId ?? ""); } catch {}
  await supabase.from("profiles").update({ current_household_id: householdId as any }).eq("id", userId);
}

export function inviteUrl(token: string): string {
  return `${window.location.origin}/join/${token}`;
}

/* -------- React hook -------- */

export function useHousehold(userId: string | undefined | null) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(() => getCachedHouseholdId());
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setHouseholds([]); setMembers([]); setLoading(false); return; }
    setLoading(true);
    const hh = await listHouseholdsForUser(userId);
    setHouseholds(hh);
    // Resolve current
    let cid = currentId;
    if (!cid || !hh.find(h => h.id === cid)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_household_id")
        .eq("id", userId)
        .maybeSingle();
      cid = (profile as any)?.current_household_id ?? hh[0]?.id ?? null;
      if (cid) {
        try { localStorage.setItem(LS_HOUSEHOLD, cid); } catch {}
        setCurrentId(cid);
      }
    }
    if (cid) setMembers(await listMembers(cid)); else setMembers([]);
    setLoading(false);
  }, [userId, currentId]);

  useEffect(() => { void refresh(); }, [userId]); // eslint-disable-line

  const switchHousehold = useCallback(async (id: string) => {
    if (!userId) return;
    setCurrentId(id);
    try { localStorage.setItem(LS_HOUSEHOLD, id); } catch {}
    await setCurrentHousehold(userId, id);
    setMembers(await listMembers(id));
  }, [userId]);

  const current = households.find(h => h.id === currentId) ?? null;

  return { households, current, currentId, members, loading, switchHousehold, refresh };
}