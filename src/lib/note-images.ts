import { supabase } from "@/integrations/supabase/client";

const BUCKET = "note-images";
const FILE_BUCKET = "attachments";
const ONE_YEAR = 60 * 60 * 24 * 365;
const MAX_BYTES = 15 * 1024 * 1024;
const FILE_MAX_BYTES = 20 * 1024 * 1024;

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "image";
}

/** Upload a single image to the note-images bucket; returns a long-lived signed URL and metadata. */
export async function uploadNoteImage(file: File): Promise<{ url: string; path: string; bucket: string; name: string; mime: string; size: number; id: string }> {
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
  return { url: data.signedUrl, path, bucket: BUCKET, name: file.name, mime: file.type, size: file.size, id };
}

/** Upload any file inline (PDF, doc, etc) to the attachments bucket. Returns signed URL + metadata. */
export async function uploadNoteFile(file: File): Promise<{ url: string; path: string; bucket: string; name: string; mime: string; size: number; id: string }> {
  if (file.size > FILE_MAX_BYTES) throw new Error("File is over 20 MB");
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Sign in to upload files");
  const id = (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${uid}/note-inline/${id}-${sanitize(file.name)}`;
  const { error } = await supabase.storage.from(FILE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage.from(FILE_BUCKET).createSignedUrl(path, ONE_YEAR);
  if (signErr || !data?.signedUrl) throw signErr ?? new Error("Could not sign URL");
  return { url: data.signedUrl, path, bucket: FILE_BUCKET, name: file.name, mime: file.type || "application/octet-stream", size: file.size, id };
}