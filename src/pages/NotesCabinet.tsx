import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  Archive, Camera, Download, FileText, FolderPlus, Image as ImageIcon, Link2, Loader2, Plus, Search, Sparkles, Trash2, Upload, X, AlarmClock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  type CabinetDoc, type Drawer, type LinkTarget, LINK_SOURCES, addLink, analyzeDoc, daysUntilExpiry, deleteDoc, linkHref,
  listDocs, listDrawers, listLinks, matchesSearch, needsExpiryReminder, photosToPdf, removeLink, searchLinkTargets, signedUrl, updateDoc, uploadDoc,
} from "@/lib/filing-cabinet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DRAWER_TONE: Record<string, string> = {
  primary: "bg-primary/10 text-primary border-primary/30",
  secondary: "bg-secondary/40 text-secondary-foreground border-secondary",
  accent: "bg-accent/40 text-accent-foreground border-accent",
};
const tone = (c: string | null) => DRAWER_TONE[c ?? ""] ?? "bg-muted text-foreground border-border";
const isImage = (d: CabinetDoc) => (d.mime_type ?? "").startsWith("image/");
const isPdf = (d: CabinetDoc) => d.mime_type === "application/pdf";

export { Field };
export default function NotesCabinet() {
  const [drawers, setDrawers] = useState<Drawer[]>([]);
  const [docs, setDocs] = useState<CabinetDoc[] | null>(null);
  const [drawer, setDrawer] = useState<string>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<CabinetDoc | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [scanPages, setScanPages] = useState<File[]>([]);

  const load = async () => {
    try {
      const [d, docs] = await Promise.all([listDrawers(), listDocs()]);
      setDrawers(d); setDocs(docs);
      setOpen((o) => (o ? docs.find((x) => x.id === o.id) ?? null : o));
    } catch (e: any) { toast.error(e.message ?? "Couldn't open the cabinet"); setDocs([]); }
  };
  useEffect(() => { void load(); }, []);

  const allTags = useMemo(() => [...new Set((docs ?? []).flatMap((d) => d.tags))].sort(), [docs]);
  const expiring = useMemo(() => (docs ?? []).filter((d) => needsExpiryReminder(d)).sort((a, b) => (a.expires_at! < b.expires_at! ? -1 : 1)), [docs]);
  const shown = useMemo(() => (docs ?? []).filter((d) =>
    (drawer === "all" || (drawer === "none" ? !d.drawer_id : d.drawer_id === drawer)) && (!tag || d.tags.includes(tag)) && matchesSearch(d, q)), [docs, drawer, tag, q]);
  const drawerName = (id: string | null) => drawers.find((d) => d.id === id)?.name;

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        if (f.size > 25 * 1024 * 1024) { toast.error(`${f.name} is over 25 MB`); continue; }
        await uploadDoc(f, { title: f.name.replace(/\.[^.]+$/, ""), drawerId: drawer !== "all" && drawer !== "none" ? drawer : null });
      }
      toast.success(files.length > 1 ? "Documents filed" : "Document filed");
      await load();
    } catch (e: any) { toast.error(e.message ?? "Upload failed"); } finally { setBusy(false); }
  };

  const saveScan = async () => {
    setBusy(true);
    try {
      const pdf = await photosToPdf(scanPages);
      const doc = await uploadDoc(pdf, { title: `Scan ${format(new Date(), "MMM d, yyyy h.mma")}`, drawerId: drawer !== "all" && drawer !== "none" ? drawer : null, mime: "application/pdf" });
      setScanPages([]); await load(); setOpen(doc);
      toast.success("Scan saved as a PDF");
    } catch (e: any) { toast.error(e.message ?? "Couldn't save the scan"); } finally { setBusy(false); }
  };

  const addDrawer = async () => {
    const name = window.prompt("Name your new drawer");
    if (!name?.trim()) return;
    await (supabase as any).from("cabinet_drawers").insert({ name: name.trim(), sort_order: drawers.length, color: "primary" });
    void load();
  };

  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 pb-28"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); void upload([...e.dataTransfer.files]); }}
    >
      <header className="flex flex-wrap items-center gap-2">
        <Archive className="h-5 w-5 text-primary" aria-hidden />
        <h1 className="font-display text-2xl text-foreground">Filing Cabinet</h1>
        <span className="text-sm text-muted-foreground">{docs?.length ?? 0} documents</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="h-11" onClick={() => camRef.current?.click()} disabled={busy}><Camera className="mr-1 h-4 w-4" />Scan</Button>
          <Button className="h-11" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}Upload
          </Button>
        </div>
        <input ref={fileRef} type="file" multiple hidden accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={(e) => { void upload([...(e.target.files ?? [])]); e.target.value = ""; }} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setScanPages((p) => [...p, f]); e.target.value = ""; }} />
      </header>

      {scanPages.length > 0 && (
        <section className="rounded-2xl border border-primary/30 bg-card p-3">
          <p className="mb-2 text-sm font-medium text-foreground">Scanning · {scanPages.length} page{scanPages.length > 1 ? "s" : ""}</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scanPages.map((f, i) => (
              <div key={i} className="relative shrink-0">
                <img src={URL.createObjectURL(f)} alt={`Page ${i + 1}`} className="h-24 w-20 rounded-lg border border-border object-cover" />
                <button aria-label={`Remove page ${i + 1}`} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-background shadow" onClick={() => setScanPages((p) => p.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" className="h-11" onClick={() => camRef.current?.click()}><Plus className="mr-1 h-4 w-4" />Add page</Button>
            <Button className="h-11" onClick={saveScan} disabled={busy}>Save as PDF</Button>
            <Button variant="ghost" className="h-11" onClick={() => setScanPages([])}>Cancel</Button>
          </div>
        </section>
      )}

      {expiring.length > 0 && (
        <section className="rounded-2xl border border-accent bg-accent/20 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><AlarmClock className="h-4 w-4" />Expiring soon</p>
          <ul className="space-y-1">
            {expiring.map((d) => {
              const n = daysUntilExpiry(d.expires_at)!;
              return (
                <li key={d.id}>
                  <button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-background/60" onClick={() => setOpen(d)}>
                    <span className="flex-1 truncate text-foreground">{d.title}</span>
                    <span className={cn("shrink-0 font-medium", n < 0 ? "text-destructive" : "text-muted-foreground")}>
                      {n < 0 ? `Expired ${-n}d ago` : n === 0 ? "Expires today" : `in ${n} day${n > 1 ? "s" : ""}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, tags, summaries and document text" className="h-11 pl-9" />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Drawers">
        {[{ id: "all", name: "All", color: null }, ...drawers, { id: "none", name: "Unfiled", color: null }].map((d) => {
          const count = (docs ?? []).filter((x) => d.id === "all" || (d.id === "none" ? !x.drawer_id : x.drawer_id === d.id)).length;
          return (
            <button key={d.id} role="tab" aria-selected={drawer === d.id} onClick={() => setDrawer(d.id)}
              className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm transition", drawer === d.id ? "border-primary bg-primary text-primary-foreground" : tone(d.color))}>
              {d.name} <span className="opacity-70">{count}</span>
            </button>
          );
        })}
        <button onClick={addDrawer} className="flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-4 text-sm text-muted-foreground"><FolderPlus className="h-4 w-4" />Drawer</button>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <button key={t} onClick={() => setTag(tag === t ? null : t)} className={cn("min-h-9 rounded-full border px-3 text-xs", tag === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>#{t}</button>
          ))}
        </div>
      )}

      {dragging && <div className="rounded-2xl border-2 border-dashed border-primary p-8 text-center text-primary">Drop to file</div>}

      {docs === null ? (
        <div className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Archive className="mx-auto mb-2 h-8 w-8 opacity-60" />
          {docs.length ? "Nothing matches here." : "Your cabinet is empty. Upload a PDF or scan a paper document to start."}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((d) => {
            const n = daysUntilExpiry(d.expires_at);
            return (
              <li key={d.id}>
                <button onClick={() => setOpen(d)} className="flex h-full w-full flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40">
                  <div className="flex items-start gap-2">
                    {isImage(d) ? <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> : <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
                    <span className="line-clamp-2 flex-1 font-medium text-foreground">{d.title}</span>
                  </div>
                  {d.summary && <p className="line-clamp-3 text-sm text-muted-foreground">{d.summary}</p>}
                  <div className="mt-auto flex flex-wrap gap-1">
                    {drawerName(d.drawer_id) && <Badge variant="outline">{drawerName(d.drawer_id)}</Badge>}
                    {d.tags.slice(0, 3).map((t) => <Badge key={t} variant="secondary">#{t}</Badge>)}
                    {n !== null && <Badge variant={n <= 30 ? "destructive" : "outline"}>Expires {format(parseISO(d.expires_at!), "MMM d, yyyy")}</Badge>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <DocSheet doc={open} drawers={drawers} allTags={allTags} onClose={() => setOpen(null)} onChanged={load} />
    </div>
  );
}

export function DocSheet({ doc, drawers, allTags, onClose, onChanged, extra, hideDrawer, onAnalyzed }: { doc: CabinetDoc | null; drawers: Drawer[]; allTags: string[]; onClose: () => void; onChanged: () => Promise<void>; extra?: (doc: CabinetDoc) => React.ReactNode; hideDrawer?: boolean; onAnalyzed?: (r: import("@/lib/filing-cabinet").AnalyzeResult) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [suggest, setSuggest] = useState<{ drawer?: string | null; tags?: string[]; expires?: string | null; title?: string } | null>(null);
  const [links, setLinks] = useState<LinkTarget[]>([]);
  const [linkType, setLinkType] = useState<LinkTarget["type"]>("project");
  const [linkQ, setLinkQ] = useState("");
  const [linkResults, setLinkResults] = useState<LinkTarget[]>([]);

  useEffect(() => {
    setUrl(null); setSuggest(null);
    if (!doc) return;
    setTitle(doc.title); setSummary(doc.summary ?? "");
    signedUrl(doc).then(setUrl).catch(() => setUrl(null));
    listLinks(doc.id).then(setLinks);
  }, [doc?.id]);
  useEffect(() => { if (doc) setSummary(doc.summary ?? ""); }, [doc?.summary]);
  useEffect(() => {
    if (!doc) return;
    const t = setTimeout(() => searchLinkTargets(linkType, linkQ).then(setLinkResults), 200);
    return () => clearTimeout(t);
  }, [linkType, linkQ, doc?.id]);

  if (!doc) return null;
  const patch = async (p: Partial<CabinetDoc>) => { try { await updateDoc(doc.id, p); await onChanged(); } catch (e: any) { toast.error(e.message); } };
  const addTag = (t: string) => { const v = t.trim().toLowerCase().replace(/^#/, ""); if (v && !doc.tags.includes(v)) void patch({ tags: [...doc.tags, v] }); setTagInput(""); };

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const r = await analyzeDoc(doc.id, drawers.map((d) => d.name));
      await onChanged();
      onAnalyzed?.(r);
      setSuggest({ drawer: r.suggested_drawer, tags: r.suggested_tags.filter((t) => !doc.tags.includes(t)), expires: r.expires_at, title: r.suggested_title });
      toast.success("Summary ready");
    } catch (e: any) { toast.error(e.message); } finally { setAnalyzing(false); }
  };
  const suggestedDrawer = drawers.find((d) => d.name.toLowerCase() === suggest?.drawer?.toLowerCase());

  return (
    <Sheet open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader><SheetTitle className="sr-only">Document</SheetTitle></SheetHeader>
        <div className="space-y-4 pb-10">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title !== doc.title && patch({ title: title.trim() })} className="h-11 font-display text-lg" aria-label="Title" />

          <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
            {!url ? <div className="grid h-48 place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : isImage(doc) ? <img src={url} alt={doc.title} className="max-h-[60vh] w-full object-contain" />
              : isPdf(doc) ? <iframe src={url} title={doc.title} className="h-[60vh] w-full" />
              : <div className="p-6 text-center text-sm text-muted-foreground">Preview isn't available for this file type — download to open it.</div>}
          </div>
          <div className="flex flex-wrap gap-2">
            {url && <Button variant="outline" className="h-11" asChild><a href={url} target="_blank" rel="noreferrer">Open</a></Button>}
            <Button variant="outline" className="h-11" onClick={async () => { window.open(await signedUrl(doc, true), "_blank"); }}><Download className="mr-1 h-4 w-4" />Download</Button>
            {(isPdf(doc) || isImage(doc)) && (
              <Button className="h-11" onClick={analyze} disabled={analyzing}>
                {analyzing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}{doc.summary ? "Re-summarize" : "Summarize with AI"}
              </Button>
            )}
          </div>

          {extra?.(doc)}

          {suggest && (suggestedDrawer && suggestedDrawer.id !== doc.drawer_id || suggest.tags?.length || suggest.expires && suggest.expires !== doc.expires_at || suggest.title && suggest.title !== doc.title) && (
            <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
              <p className="font-medium text-foreground">Suggestions</p>
              {suggest.title && suggest.title !== doc.title && <SuggestRow label={`Title: ${suggest.title}`} onAccept={() => { setTitle(suggest.title!); void patch({ title: suggest.title! }); setSuggest({ ...suggest, title: undefined }); }} />}
              {suggestedDrawer && suggestedDrawer.id !== doc.drawer_id && <SuggestRow label={`File in ${suggestedDrawer.name}`} onAccept={() => { void patch({ drawer_id: suggestedDrawer.id }); setSuggest({ ...suggest, drawer: null }); }} />}
              {suggest.expires && suggest.expires !== doc.expires_at && <SuggestRow label={`Expires ${format(parseISO(suggest.expires), "MMM d, yyyy")}`} onAccept={() => { void patch({ expires_at: suggest.expires! }); setSuggest({ ...suggest, expires: null }); }} />}
              {!!suggest.tags?.length && <SuggestRow label={`Tags: ${suggest.tags.map((t) => "#" + t).join(" ")}`} onAccept={() => { void patch({ tags: [...new Set([...doc.tags, ...suggest.tags!])] }); setSuggest({ ...suggest, tags: [] }); }} />}
            </div>
          )}

          <Field label="Summary">
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} onBlur={() => summary !== (doc.summary ?? "") && patch({ summary })} rows={4} placeholder="Add a note about this document" />
          </Field>
          {doc.key_details?.length > 0 && (
            <Field label="Key details">
              <dl className="divide-y divide-border rounded-xl border border-border text-sm">
                {doc.key_details.map((k, i) => (
                  <div key={i} className="flex gap-3 px-3 py-2"><dt className="w-1/3 shrink-0 text-muted-foreground">{k.label}</dt><dd className="break-words text-foreground">{k.value}</dd></div>
                ))}
              </dl>
            </Field>
          )}

          {!hideDrawer && <Field label="Drawer">
            <Select value={doc.drawer_id ?? "none"} onValueChange={(v) => patch({ drawer_id: v === "none" ? null : v })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unfiled</SelectItem>
                {drawers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>}

          <Field label="Expires / renews">
            <div className="flex gap-2">
              <Input type="date" className="h-11" value={doc.expires_at ?? ""} onChange={(e) => patch({ expires_at: e.target.value || null })} />
              {doc.expires_at && <Button variant="ghost" className="h-11" onClick={() => patch({ expires_at: null })}>Clear</Button>}
            </div>
            {doc.expires_at && <p className="text-xs text-muted-foreground">You'll see a reminder on Today 30 days and 7 days before.</p>}
          </Field>

          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {doc.tags.map((t) => (
                <button key={t} onClick={() => patch({ tags: doc.tags.filter((x) => x !== t) })} className="flex min-h-9 items-center gap-1 rounded-full bg-secondary/50 px-3 text-xs text-secondary-foreground" aria-label={`Remove tag ${t}`}>#{t}<X className="h-3 w-3" /></button>
              ))}
            </div>
            <Input list="cabinet-tags" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }} onBlur={() => tagInput && addTag(tagInput)} placeholder="Add a tag and press Enter" className="h-11" />
            <datalist id="cabinet-tags">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>

          <Field label="Linked to">
            <ul className="space-y-1">
              {links.map((l) => (
                <li key={l.type + l.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">
                  <Badge variant="outline">{LINK_SOURCES[l.type].label}</Badge>
                  <Link to={linkHref(l)} className="flex-1 truncate text-foreground underline-offset-2 hover:underline">{l.label}</Link>
                  <button aria-label="Unlink" className="grid h-9 w-9 place-items-center" onClick={async () => { await removeLink(doc.id, l); setLinks(await listLinks(doc.id)); }}><X className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkTarget["type"])}>
                <SelectTrigger className="h-11 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(LINK_SOURCES) as LinkTarget["type"][]).map((k) => <SelectItem key={k} value={k}>{LINK_SOURCES[k].label}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={linkQ} onChange={(e) => setLinkQ(e.target.value)} placeholder="Search to link" className="h-11" />
            </div>
            <ul className="max-h-48 overflow-y-auto">
              {linkResults.filter((r) => !links.some((l) => l.id === r.id)).map((r) => (
                <li key={r.id}>
                  <button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-muted" onClick={async () => { try { await addLink(doc.id, r); setLinks(await listLinks(doc.id)); } catch (e: any) { toast.error(e.message); } }}>
                    <Link2 className="h-4 w-4 text-muted-foreground" /><span className="truncate">{r.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Field>

          <p className="text-xs text-muted-foreground">Added {format(new Date(doc.created_at), "MMM d, yyyy")}{doc.size_bytes ? ` · ${(doc.size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}</p>
          <Button variant="ghost" className="h-11 text-destructive" onClick={async () => {
            if (!window.confirm(`Delete “${doc.title}”? This can't be undone.`)) return;
            try { await deleteDoc(doc); onClose(); await onChanged(); toast.success("Deleted"); } catch (e: any) { toast.error(e.message); }
          }}><Trash2 className="mr-1 h-4 w-4" />Delete document</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>{children}</div>;
}
function SuggestRow({ label, onAccept }: { label: string; onAccept: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 break-words text-foreground">{label}</span>
      <Button size="sm" variant="outline" className="h-9" onClick={onAccept}>Use</Button>
    </div>
  );
}
