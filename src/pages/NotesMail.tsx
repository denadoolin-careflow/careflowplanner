import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, format, parseISO } from "date-fns";
import { Archive, Camera, CalendarClock, Inbox, Loader2, Mail, Plus, RotateCcw, Search, Trash2, Upload, X, Check } from "lucide-react";
import { toast } from "sonner";
import { type CabinetDoc, type Drawer, analyzeDoc, deleteDoc, listDrawers, matchesSearch, photosToPdf, updateDoc, uploadDoc } from "@/lib/filing-cabinet";
import { MAIL_STATUSES, MAIL_TYPES, type MailStatus, fileToCabinet, listMail, mailPatchFromAI, scheduleReview, setMailStatus, suggestTrash, TRASH_DAYS } from "@/lib/mail-inbox";
import { DocSheet, Field } from "@/pages/NotesCabinet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const typeLabel = (t?: string | null) => MAIL_TYPES.find((m) => m.id === t)?.label;

export default function NotesMail() {
  const [params, setParams] = useSearchParams();
  const [mail, setMail] = useState<CabinetDoc[] | null>(null);
  const [drawers, setDrawers] = useState<Drawer[]>([]);
  const [status, setStatus] = useState<MailStatus>("new");
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(params.get("open"));
  const [scanPages, setScanPages] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try { const [m, d] = await Promise.all([listMail(), listDrawers()]); setMail(m); setDrawers(d); }
    catch (e: any) { toast.error(e.message ?? "Couldn't open your mail"); setMail([]); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { const o = params.get("open"); if (o) { setOpenId(o); setParams({}, { replace: true }); } }, []);

  const open = mail?.find((m) => m.id === openId) ?? null;
  useEffect(() => { if (open && open.mail_status !== status) setStatus(open.mail_status as MailStatus); }, [open?.id]);

  const allTags = useMemo(() => [...new Set((mail ?? []).flatMap((d) => d.tags))].sort(), [mail]);
  const shown = useMemo(() => (mail ?? []).filter((m) => m.mail_status === status && (type === "all" || m.mail_type === type) && matchesSearch({ ...m, extracted_text: `${m.extracted_text ?? ""} ${m.sender ?? ""}` }, q)), [mail, status, type, q]);
  const counts = (s: MailStatus) => (mail ?? []).filter((m) => m.mail_status === s).length;

  const autoRead = async (doc: CabinetDoc) => {
    try {
      const r = await analyzeDoc(doc.id, drawers.map((d) => d.name));
      const p = mailPatchFromAI({ ...doc, summary: r.summary }, r);
      if (Object.keys(p).length) await updateDoc(doc.id, p);
    } catch { /* AI is optional — mail is still saved */ }
    await load();
  };

  const capture = async (files: File[], scan = false) => {
    if (!files.length) return;
    setBusy(true);
    try {
      const made: CabinetDoc[] = [];
      if (scan) {
        const pdf = await photosToPdf(files);
        made.push(await uploadDoc(pdf, { title: `Scan ${format(new Date(), "MMM d h.mma")}`, drawerId: null, mime: "application/pdf", kind: "mail" }));
        setScanPages([]);
      } else {
        for (const f of files) {
          if (f.size > 25 * 1024 * 1024) { toast.error(`${f.name} is over 25 MB`); continue; }
          made.push(await uploadDoc(f, { title: f.name.replace(/\.[^.]+$/, ""), drawerId: null, kind: "mail" }));
        }
      }
      setStatus("new"); await load();
      toast.success("Mail added — reading it now…");
      for (const d of made) if (d.mime_type === "application/pdf" || d.mime_type?.startsWith("image/")) void autoRead(d);
    } catch (e: any) { toast.error(e.message ?? "Couldn't add mail"); } finally { setBusy(false); }
  };

  const act = async (fn: () => Promise<void>, msg: string) => { try { await fn(); await load(); toast.success(msg); } catch (e: any) { toast.error(e.message); } };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 pb-28">
      <header className="flex flex-wrap items-center gap-2">
        <Mail className="h-5 w-5 text-primary" aria-hidden />
        <h1 className="font-display text-2xl text-foreground">Mail</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="h-11" onClick={() => camRef.current?.click()} disabled={busy}><Camera className="mr-1 h-4 w-4" />Scan</Button>
          <Button className="h-11" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}Upload
          </Button>
        </div>
        <input ref={fileRef} type="file" multiple hidden accept=".pdf,image/*" onChange={(e) => { void capture([...(e.target.files ?? [])]); e.target.value = ""; }} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setScanPages((p) => [...p, f]); e.target.value = ""; }} />
      </header>
      <p className="text-sm text-muted-foreground">Snap your paper mail, decide later, then trash it or keep it in the Filing Cabinet.</p>

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
            <Button className="h-11" onClick={() => capture(scanPages, true)} disabled={busy}>Save to Mail</Button>
            <Button variant="ghost" className="h-11" onClick={() => setScanPages([])}>Cancel</Button>
          </div>
        </section>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Mail status">
        {MAIL_STATUSES.map((s) => (
          <button key={s.id} role="tab" aria-selected={status === s.id} onClick={() => setStatus(s.id)}
            className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm", status === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground")}>
            {s.label} <span className="opacity-70">{counts(s.id)}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail, senders and tags" className="h-11 pl-9" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-11 sm:w-44" aria-label="Type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {MAIL_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {status === "trash" && <p className="text-xs text-muted-foreground">Mail in Trash is deleted for good after {TRASH_DAYS} days.</p>}

      {mail === null ? (
        <div className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-2 h-8 w-8 opacity-60" />
          {status === "new" ? "No new mail. Tap Scan when the mail arrives." : "Nothing here."}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => (
            <li key={m.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <button className="text-left" onClick={() => setOpenId(m.id)}>
                <p className="line-clamp-2 font-medium text-foreground">{m.title}</p>
                {m.sender && <p className="text-sm text-muted-foreground">From {m.sender}</p>}
                {m.summary && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.summary}</p>}
              </button>
              <div className="flex flex-wrap gap-1">
                {typeLabel(m.mail_type) && <Badge variant="outline">{typeLabel(m.mail_type)}</Badge>}
                {m.amount != null && <Badge variant="secondary">${Number(m.amount).toFixed(2)}</Badge>}
                {m.due_on && <Badge variant="outline">Due {format(parseISO(m.due_on), "MMM d")}</Badge>}
                {m.tags.slice(0, 2).map((t) => <Badge key={t} variant="secondary">#{t}</Badge>)}
                {suggestTrash(m) && <Badge variant="destructive">Past date — trash?</Badge>}
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5">
                {m.mail_status === "trash" ? (
                  <>
                    <Button size="sm" variant="outline" className="h-10" onClick={() => act(() => setMailStatus(m, "new"), "Restored")}><RotateCcw className="mr-1 h-4 w-4" />Restore</Button>
                    <Button size="sm" variant="ghost" className="h-10 text-destructive" onClick={() => window.confirm("Delete for good?") && act(() => deleteDoc(m), "Deleted")}>Delete now</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="h-10" onClick={() => setOpenId(m.id)}><CalendarClock className="mr-1 h-4 w-4" />Review later</Button>
                    {m.mail_status !== "done" && <Button size="sm" variant="outline" className="h-10" aria-label="Mark done" onClick={() => act(() => setMailStatus(m, "done"), "Marked done")}><Check className="h-4 w-4" /></Button>}
                    <Button size="sm" variant="ghost" className="h-10" aria-label="Move to trash" onClick={() => act(() => setMailStatus(m, "trash"), "Moved to Trash")}><Trash2 className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <DocSheet
        doc={open} drawers={drawers} allTags={allTags} hideDrawer onClose={() => setOpenId(null)} onChanged={load}
        onAnalyzed={async (r) => { if (open) { const p = mailPatchFromAI(open, r); if (Object.keys(p).length) { await updateDoc(open.id, p); await load(); } } }}
        extra={(doc) => <MailControls doc={doc} drawers={drawers} onDone={load} onClose={() => setOpenId(null)} />}
      />
    </div>
  );
}

function MailControls({ doc, drawers, onDone, onClose }: { doc: CabinetDoc; drawers: Drawer[]; onDone: () => Promise<void>; onClose: () => void }) {
  const [sender, setSender] = useState(doc.sender ?? "");
  const [amount, setAmount] = useState(doc.amount != null ? String(doc.amount) : "");
  const [reviewOn, setReviewOn] = useState(doc.due_on ? format(addDays(parseISO(doc.due_on), -3), "yyyy-MM-dd") : format(addDays(new Date(), 2), "yyyy-MM-dd"));
  const [drawerId, setDrawerId] = useState<string>("none");
  useEffect(() => { setSender(doc.sender ?? ""); setAmount(doc.amount != null ? String(doc.amount) : ""); }, [doc.id, doc.sender, doc.amount]);
  const save = async (p: Partial<CabinetDoc>) => { try { await updateDoc(doc.id, p); await onDone(); } catch (e: any) { toast.error(e.message); } };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type">
          <Select value={doc.mail_type ?? "none"} onValueChange={(v) => save({ mail_type: v === "none" ? null : v })}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              {MAIL_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="From">
          <Input className="h-11" value={sender} onChange={(e) => setSender(e.target.value)} onBlur={() => sender !== (doc.sender ?? "") && save({ sender: sender || null })} placeholder="Sender" />
        </Field>
        <Field label="Amount">
          <Input className="h-11" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => save({ amount: amount ? Number(amount.replace(/[^0-9.]/g, "")) || null : null })} placeholder="0.00" />
        </Field>
        <Field label="Due / deadline">
          <Input className="h-11" type="date" value={doc.due_on ?? ""} onChange={(e) => save({ due_on: e.target.value || null })} />
        </Field>
      </div>

      <Field label="Review later">
        <div className="flex flex-wrap gap-2">
          <Input type="date" className="h-11 w-auto" value={reviewOn} onChange={(e) => setReviewOn(e.target.value)} />
          <Button className="h-11" onClick={async () => { try { await scheduleReview(doc, reviewOn); await onDone(); toast.success(`Task added for ${format(parseISO(reviewOn), "MMM d")}`); } catch (e: any) { toast.error(e.message); } }}>
            <CalendarClock className="mr-1 h-4 w-4" />{doc.review_task_id ? "Update task" : doc.mail_type === "bill" ? "Add pay task" : "Add review task"}
          </Button>
        </div>
        {doc.review_task_id && <p className="text-xs text-muted-foreground">A task is on your Planner. Finishing it moves this mail to Done.</p>}
      </Field>

      <Field label="Keep it">
        <div className="flex flex-wrap gap-2">
          <Select value={drawerId} onValueChange={setDrawerId}>
            <SelectTrigger className="h-11 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Choose drawer</SelectItem>
              {drawers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-11" onClick={async () => { try { await fileToCabinet(doc, drawerId === "none" ? null : drawerId); onClose(); await onDone(); toast.success("Moved to the Filing Cabinet"); } catch (e: any) { toast.error(e.message); } }}>
            <Archive className="mr-1 h-4 w-4" />Move to Filing Cabinet
          </Button>
        </div>
      </Field>

      <div className="flex flex-wrap gap-2">
        {doc.mail_status !== "trash"
          ? <Button variant="ghost" className="h-11" onClick={async () => { await setMailStatus(doc, "trash"); onClose(); await onDone(); toast.success("Moved to Trash"); }}><Trash2 className="mr-1 h-4 w-4" />Throw away</Button>
          : <Button variant="outline" className="h-11" onClick={async () => { await setMailStatus(doc, "new"); await onDone(); }}><RotateCcw className="mr-1 h-4 w-4" />Restore</Button>}
        {doc.mail_status !== "done" && doc.mail_status !== "trash" && <Button variant="ghost" className="h-11" onClick={async () => { await setMailStatus(doc, "done"); await onDone(); }}><Check className="mr-1 h-4 w-4" />Done</Button>}
      </div>
    </div>
  );
}
