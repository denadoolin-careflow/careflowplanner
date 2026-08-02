import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWidgetText, widgetText } from "@/lib/widget-text";

export const HEADER_IMAGE_WIDGET = "header-image";

/** Curated Unsplash imagery — calm, caregiver-friendly scenes. */
export const HEADER_IMAGE_PRESETS: { id: string; label: string; url: string }[] = [
  { id: "morning-light", label: "Morning light", url: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1600&q=80&auto=format&fit=crop" },
  { id: "misty-forest", label: "Misty forest", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=80&auto=format&fit=crop" },
  { id: "calm-water", label: "Calm water", url: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1600&q=80&auto=format&fit=crop" },
  { id: "soft-blooms", label: "Soft blooms", url: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1600&q=80&auto=format&fit=crop" },
  { id: "warm-kitchen", label: "Warm kitchen", url: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1600&q=80&auto=format&fit=crop" },
  { id: "night-sky", label: "Night sky", url: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1600&q=80&auto=format&fit=crop" },
  { id: "desk-plants", label: "Desk & plants", url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1600&q=80&auto=format&fit=crop" },
  { id: "mountain-dawn", label: "Mountain dawn", url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80&auto=format&fit=crop" },
  { id: "linen-quiet", label: "Quiet linen", url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600&q=80&auto=format&fit=crop" },
];

const STORAGE_PREFIX = "storage:";

/** Persisted value for a page header ("" = none). Stored per user. */
export function useHeaderImage(pageKey: string) {
  const raw = useWidgetText(HEADER_IMAGE_WIDGET, pageKey, "");
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!raw) { setResolved(null); return; }
    if (!raw.startsWith(STORAGE_PREFIX)) { setResolved(raw); return; }
    const path = raw.slice(STORAGE_PREFIX.length);
    void supabase.storage.from("header-images").createSignedUrl(path, 60 * 60 * 24 * 7)
      .then(({ data }) => { if (!cancelled) setResolved(data?.signedUrl ?? null); });
    return () => { cancelled = true; };
  }, [raw]);

  const set = async (value: string | null) => {
    await widgetText.set(HEADER_IMAGE_WIDGET, pageKey, value ?? "");
  };

  return { url: resolved, raw, set };
}

/** Upload a picked file to the private header-images bucket, returns the stored token. */
export async function uploadHeaderImage(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to upload an image.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("header-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return `${STORAGE_PREFIX}${path}`;
}