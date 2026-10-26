import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateDailyNote, updateNote } from "@/lib/notes";
import { format } from "date-fns";

export interface ArticleDetails {
  summary?: string; takeaways?: string[]; publication?: string; reading_minutes?: number; ai_cover?: boolean;
}
export interface FetchedArticle {
  title: string | null; site: string; author: string | null; description: string | null; image: string | null;
  url: string; summary: string; takeaways: string[]; tags: string[]; reading_minutes: number; warning?: string;
}

async function call<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).message ?? msg; } catch { /* noop */ } }
    throw new Error(msg);
  }
  return data as T;
}

export const fetchArticle = (url: string) => call<FetchedArticle>("library-fetch-article", { url });
export const generateCover = (title: string, summary?: string) => call<{ cover_url: string }>("library-generate-cover", { title, summary });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Markdown appended to a daily note for a clipped article. */
export function buildClipMarkdown(item: { title: string; url: string; creator?: string | null; details?: ArticleDetails | null }): string {
  let domain = "Link";
  try { domain = new URL(item.url).hostname.replace(/^www\./, ""); } catch { /* noop */ }
  const card = `<div data-web-link-card="" data-href="${esc(item.url)}" data-label="${esc(item.title)}" data-domain="${esc(item.creator || domain)}"></div>`;
  const d = item.details ?? {};
  const parts = [`\n\n### 📚 Clipped: ${item.title}`, card];
  if (d.summary) parts.push(d.summary);
  if (d.takeaways?.length) parts.push(d.takeaways.map((t) => `- ${t}`).join("\n"));
  return parts.join("\n\n") + "\n";
}

export async function clipToDailyNote(item: { id: string; title: string; url: string; creator?: string | null; details?: ArticleDetails | null }) {
  const note = await getOrCreateDailyNote(format(new Date(), "yyyy-MM-dd"));
  await updateNote(note.id, { body: (note.body ?? "").trimEnd() + buildClipMarkdown(item) });
  const { data: u } = await supabase.auth.getUser();
  if (u.user) {
    const { data: existing } = await supabase.from("entity_links").select("id")
      .eq("source_type", "note").eq("source_id", note.id).eq("target_type", "library").eq("target_id", item.id).limit(1);
    if (!existing?.length) await supabase.from("entity_links").insert({ user_id: u.user.id, source_type: "note", source_id: note.id, target_type: "library", target_id: item.id });
  }
  return note;
}
