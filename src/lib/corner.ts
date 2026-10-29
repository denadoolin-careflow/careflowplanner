import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type BlogPost = Tables<"blog_posts">;
export type Product = Tables<"products">;
export type Freebie = Tables<"freebies">;
export type ClubMember = Tables<"club_members">;

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `post-${Date.now()}`;
}

/** Uploads to the corner-media bucket and returns a long-lived link. */
export async function uploadCornerMedia(file: File, folder: "covers" | "freebies" | "products") {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("corner-media").upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("corner-media").createSignedUrl(path, TEN_YEARS);
  if (e2 || !data) throw e2 ?? new Error("Could not create link");
  return data.signedUrl;
}

/** Private shop file upload; returns the storage path (never public). */
export async function uploadShopFile(file: File) {
  const path = `products/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("shop-files").upload(path, file);
  if (error) throw error;
  return path;
}

export function formatPrice(cents: number, currency = "usd") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function useIsAdmin() {
  const [state, setState] = useState<{ loading: boolean; isAdmin: boolean }>({ loading: true, isAdmin: false });
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (alive) setState({ loading: false, isAdmin: false }); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (alive) setState({ loading: false, isAdmin: !!data });
    })();
    return () => { alive = false; };
  }, []);
  return state;
}

export async function listPublishedPosts(limit = 50) {
  const { data } = await supabase.from("blog_posts").select("*").eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false }).limit(limit);
  return (data ?? []) as BlogPost[];
}

export async function listVisibleProducts() {
  const { data } = await supabase.from("products").select("*").neq("status", "draft").order("sort_order").order("created_at");
  return (data ?? []) as Product[];
}

export async function joinClub(email: string, firstName: string, source: string) {
  const { data, error } = await supabase.rpc("join_careflow_club", { _email: email, _first_name: firstName, _source: source });
  if (error) throw error;
  const row = (data as { freebie_title: string | null; freebie_url: string | null }[] | null)?.[0];
  return { freebieTitle: row?.freebie_title ?? null, freebieUrl: row?.freebie_url ?? null };
}

export function readingMinutes(body: string) {
  return Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 220));
}
