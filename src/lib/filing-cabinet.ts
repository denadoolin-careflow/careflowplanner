import { differenceInCalendarDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export const CABINET_BUCKET = "filing-cabinet";
export const DEFAULT_DRAWERS = ["Medical", "Home", "Finance", "Legal & ID", "Kids", "Pets", "Insurance", "Warranties"];
export const DRAWER_COLORS = ["primary", "secondary", "accent"];

export type Drawer = { id: string; name: string; color: string | null; icon: string | null; sort_order: number };
export type KeyDetail = { label: string; value: string };
export type CabinetDoc = {
  id: string; drawer_id: string | null; title: string; storage_path: string; mime_type: string | null;
  size_bytes: number | null; tags: string[]; expires_at: string | null; remind_days: number[];
  summary: string | null; key_details: KeyDetail[]; extracted_text: string | null; created_at: string;
};

const db = supabase as any;

/** Days until a document expires (negative = already expired), or null when it has no expiry. */
export function daysUntilExpiry(expiresAt: string | null, today: Date = new Date()): number | null {
  if (!expiresAt) return null;
  return differenceInCalendarDays(parseISO(expiresAt), today);
}

/** A reminder shows once the document is within its largest reminder window (default 30 days), and stays while expired up to 30 days. */
export function needsExpiryReminder(doc: Pick<CabinetDoc, "expires_at" | "remind_days">, today: Date = new Date()): boolean {
  const d = daysUntilExpiry(doc.expires_at, today);
  if (d === null) return false;
  const windowDays = Math.max(0, ...(doc.remind_days?.length ? doc.remind_days : [30, 7]));
  return d <= windowDays && d >= -30;
}

export function matchesSearch(doc: CabinetDoc, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  const hay = [doc.title, doc.summary, doc.extracted_text, doc.tags.join(" "), ...(doc.key_details ?? []).map((k) => `${k.label} ${k.value}`)].join(" ").toLowerCase();
  return n.split(/\s+/).every((w) => hay.includes(w));
}

export async function listDrawers(): Promise<Drawer[]> {
  const { data, error } = await db.from("cabinet_drawers").select("*").order("sort_order").order("created_at");
  if (error) throw error;
  if (data.length) return data;
  const { data: seeded, error: e2 } = await db.from("cabinet_drawers")
    .insert(DEFAULT_DRAWERS.map((name, i) => ({ name, sort_order: i, color: DRAWER_COLORS[i % DRAWER_COLORS.length] })))
    .select("*");
  if (e2) throw e2;
  return seeded;
}

export async function listDocs(): Promise<CabinetDoc[]> {
  const { data, error } = await db.from("cabinet_documents").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function uploadDoc(file: File | Blob, opts: { title: string; drawerId: string | null; mime?: string }): Promise<CabinetDoc> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in");
  const name = (file as File).name ?? `${opts.title}.pdf`;
  const ext = name.includes(".") ? name.split(".").pop() : "bin";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const mime = opts.mime ?? file.type ?? "application/octet-stream";
  const { error } = await supabase.storage.from(CABINET_BUCKET).upload(path, file, { contentType: mime });
  if (error) throw error;
  const { data, error: e2 } = await db.from("cabinet_documents")
    .insert({ title: opts.title, drawer_id: opts.drawerId, storage_path: path, mime_type: mime, size_bytes: file.size })
    .select("*").single();
  if (e2) throw e2;
  return data;
}

export async function updateDoc(id: string, patch: Partial<CabinetDoc>) {
  const { error } = await db.from("cabinet_documents").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteDoc(doc: CabinetDoc) {
  await supabase.storage.from(CABINET_BUCKET).remove([doc.storage_path]);
  await db.from("entity_links").delete().eq("source_type", "document").eq("source_id", doc.id);
  const { error } = await db.from("cabinet_documents").delete().eq("id", doc.id);
  if (error) throw error;
}

export async function signedUrl(doc: CabinetDoc, download = false) {
  const { data, error } = await supabase.storage.from(CABINET_BUCKET).createSignedUrl(doc.storage_path, 600, download ? { download: doc.title } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export type AnalyzeResult = {
  summary: string; key_details: KeyDetail[]; suggested_drawer: string | null; suggested_tags: string[];
  expires_at: string | null; suggested_title: string;
};

export async function analyzeDoc(id: string, drawerNames: string[]): Promise<AnalyzeResult> {
  const { data, error } = await supabase.functions.invoke("cabinet-analyze", { body: { id, drawers: drawerNames } });
  if (error) {
    let msg = "AI couldn't read this document right now.";
    try { msg = (await (error as any).context?.json())?.message ?? msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  return data;
}

/** Turn camera photos into one PDF (one page per photo). */
export async function photosToPdf(files: File[]): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  let pdf: any = null;
  for (const f of files) {
    const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    // downscale to keep files small
    const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = img.width * scale; c.height = img.height * scale;
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const jpg = c.toDataURL("image/jpeg", 0.82);
    const orient = c.width > c.height ? "l" : "p";
    if (!pdf) pdf = new jsPDF({ orientation: orient, unit: "px", format: [c.width, c.height] });
    else pdf.addPage([c.width, c.height], orient);
    pdf.addImage(jpg, "JPEG", 0, 0, c.width, c.height);
  }
  return pdf.output("blob");
}

export type LinkTarget = { type: "project" | "goal" | "appointment" | "note"; id: string; label: string };

export async function listLinks(docId: string): Promise<LinkTarget[]> {
  const { data } = await db.from("entity_links").select("target_type,target_id").eq("source_type", "document").eq("source_id", docId);
  const rows = (data ?? []) as { target_type: LinkTarget["type"]; target_id: string }[];
  const out: LinkTarget[] = [];
  for (const type of ["project", "goal", "appointment", "note"] as const) {
    const ids = rows.filter((r) => r.target_type === type).map((r) => r.target_id);
    if (!ids.length) continue;
    const { table, col } = LINK_SOURCES[type];
    const { data: items } = await db.from(table).select(`id,${col}`).in("id", ids);
    for (const it of items ?? []) out.push({ type, id: it.id, label: it[col] || "Untitled" });
  }
  return out;
}

export const LINK_SOURCES = {
  project: { table: "projects", col: "name", label: "Project" },
  goal: { table: "goals", col: "title", label: "Goal" },
  appointment: { table: "appointments", col: "title", label: "Appointment" },
  note: { table: "notes", col: "title", label: "Note" },
} as const;

export async function searchLinkTargets(type: LinkTarget["type"], q: string): Promise<LinkTarget[]> {
  const { table, col } = LINK_SOURCES[type];
  let query = db.from(table).select(`id,${col}`).order("created_at", { ascending: false }).limit(12);
  if (q.trim()) query = query.ilike(col, `%${q.trim()}%`);
  const { data } = await query;
  return (data ?? []).map((it: any) => ({ type, id: it.id, label: it[col] || "Untitled" }));
}

export async function addLink(docId: string, t: LinkTarget) {
  const { error } = await db.from("entity_links").insert({ source_type: "document", source_id: docId, target_type: t.type, target_id: t.id });
  if (error) throw error;
}

export async function removeLink(docId: string, t: LinkTarget) {
  await db.from("entity_links").delete().eq("source_type", "document").eq("source_id", docId).eq("target_type", t.type).eq("target_id", t.id);
}

export const linkHref = (t: LinkTarget) =>
  t.type === "project" ? `/projects/${t.id}` : t.type === "goal" ? `/goals` : t.type === "note" ? `/notes/${t.id}` : `/planner`;
