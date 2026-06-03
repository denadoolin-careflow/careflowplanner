import { supabase } from "@/integrations/supabase/client";

const BUCKET = "note-images";
const ONE_YEAR = 60 * 60 * 24 * 365;
const MAX_BYTES = 15 * 1024 * 1024;

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "image";
}

/** Upload a single image to the note-images bucket; returns a long-lived signed URL. */
export async function uploadNoteImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Not an image");
  if (file.size > MAX_BYTES) throw new Error("Image is over 15 MB");
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Sign in to upload images");
  const id = (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${uid}/${id}-${sanitize(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, ONE_YEAR);
  if (signErr || !data?.signedUrl) throw signErr ?? new Error("Could not sign URL");
  return data.signedUrl;
}